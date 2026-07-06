"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js"
import * as THREE from "three"
import { makeHolo, HUMAN_URL, type Pulse } from "../components/3d/holoMaterial"
import { audioEngine } from "../lib/audioEngine"

// --- réglages jeu (côté canvas) ---
const CUBE_POOL = 12          // meshes menaces réutilisés (pool)
const RING = 8                // rayon d'apparition
const CORE_R = 1.1            // rayon de garde autour de l'hologramme (brèche en deçà)
const COMBO_WINDOW = 1.6      // délai max entre deux tirs pour enchaîner le combo (s)
const SHARD_POOL = 56         // pool d'éclats d'explosion
const SHARDS_PER = 8          // éclats par cube détruit
const CORE_POS = new THREE.Vector3(0, 0.4, 0)

export type Float = { id: number; x: number; y: number; text: string; big: boolean }

type Cube = {
  pos: THREE.Vector3; dir: THREE.Vector3; spin: THREE.Vector3
  size: number; alive: boolean; respawnAt: number; hue: number
}
type Shard = {
  pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Vector3
  life: number; size: number; active: boolean
}

// --- Hologramme humanoïde (l'hôte à défendre) : même modèle + shader holo que le site ---
function Hologram({ pulse, defeated }: { pulse: Pulse; defeated: boolean }) {
  const { scene } = useGLTF(HUMAN_URL, true)
  const time = useRef({ value: 0 })
  const mzUniforms = useRef<{ value: number }[]>([])
  const edgeUniforms = useRef<{ value: number }[]>([])
  const human = useMemo(() => {
    const h = skeletonClone(scene)
    h.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      if (mesh.name.toLowerCase().includes("sphere")) { mesh.visible = false; return }
      mesh.material = makeHolo(time.current, pulse)
      mesh.frustumCulled = false
    })
    const box = new THREE.Box3().setFromObject(h)
    const size = new THREE.Vector3(); box.getSize(size)
    h.scale.setScalar(3.4 / size.y)
    const b2 = new THREE.Box3().setFromObject(h)
    h.position.y -= (b2.min.y + b2.max.y) / 2
    h.position.x -= (b2.min.x + b2.max.x) / 2
    return h
  }, [scene, pulse])

  useFrame((_, dt) => {
    time.current.value += dt
    if (pulse.t.value < 12) pulse.t.value += dt
    human.rotation.y = defeated ? human.rotation.y : Math.sin(time.current.value * 0.3) * 0.15
    if (mzUniforms.current.length === 0) {
      human.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | undefined
        const uMz = mat?.userData?.uMz, uEdge = mat?.userData?.uEdge
        if (uMz) mzUniforms.current.push(uMz)
        if (uEdge) edgeUniforms.current.push(uEdge)
      })
    }
    const targetMz = defeated ? 0 : 1
    const k = 1 - Math.pow(defeated ? 0.2 : 0.001, dt)
    mzUniforms.current.forEach((u) => { u.value += (targetMz - u.value) * k })
    edgeUniforms.current.forEach((u) => { u.value += ((defeated ? 3 : 1) - u.value) * k })
  })

  return <primitive object={human} />
}

function spawnCube(c: Cube, speed: number) {
  const a = Math.random() * Math.PI * 2
  c.pos.set(Math.cos(a) * RING, Math.sin(a) * RING * 0.6 + 0.4, (Math.random() - 0.5) * 3)
  c.dir.copy(CORE_POS).sub(c.pos).normalize().multiplyScalar(speed * (0.8 + Math.random() * 0.5))
  c.spin.set(Math.random() * 2, Math.random() * 2, Math.random() * 2)
  c.size = 0.9 + Math.random() * 0.6
  c.hue = 0.92 + Math.random() * 0.08
  c.alive = true
}

function GameField({
  running, pulse, onHit, onBreach, onCombo, onFloat,
}: {
  running: boolean
  pulse: Pulse
  onHit: (points: number) => void
  onBreach: () => void
  onCombo: (mult: number) => void
  onFloat: (f: Omit<Float, "id">) => void
}) {
  const { camera, size } = useThree()
  const cubeMeshes = useRef<(THREE.Mesh | null)[]>([])
  const shardMeshes = useRef<(THREE.Mesh | null)[]>([])
  const clock = useRef(0)
  const combo = useRef(0)
  const lastHit = useRef(-99)

  const cubes = useMemo<Cube[]>(() => Array.from({ length: CUBE_POOL }, () => ({
    pos: new THREE.Vector3(), dir: new THREE.Vector3(), spin: new THREE.Vector3(),
    size: 1, alive: false, respawnAt: 0, hue: 0.95,
  })), [])
  const shards = useMemo<Shard[]>(() => Array.from({ length: SHARD_POOL }, () => ({
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(),
    life: 0, size: 0.12, active: false,
  })), [])

  useEffect(() => {
    if (!running) return
    clock.current = 0; combo.current = 0; lastHit.current = -99
    cubes.forEach((c, i) => { c.alive = false; c.respawnAt = 0.4 + i * 0.3 })
    shards.forEach((s) => { s.active = false })
  }, [running, cubes, shards])

  // démontage (retour au site) : ne pas laisser la visée/le crosshair collés
  useEffect(() => () => {
    delete document.body.dataset.aim
    document.body.style.cursor = ""
  }, [])

  const burst = useCallback((at: THREE.Vector3) => {
    let spawned = 0
    for (const s of shards) {
      if (s.active) continue
      s.pos.copy(at)
      s.vel.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
      s.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      s.size = 0.08 + Math.random() * 0.1
      s.life = 1; s.active = true
      if (++spawned >= SHARDS_PER) break
    }
  }, [shards])

  const hit = useCallback((i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const c = cubes[i]
    if (!running || !c.alive) return
    c.alive = false
    c.respawnAt = clock.current + Math.max(0.25, 1.2 - clock.current * 0.03)
    // le mesh disparaît sous le curseur → pointerOut ne viendra pas : on libère la visée ici
    delete document.body.dataset.aim
    document.body.style.cursor = ""
    audioEngine.play("derez")
    burst(c.pos)

    combo.current = clock.current - lastHit.current <= COMBO_WINDOW ? Math.min(combo.current + 1, 9) : 1
    lastHit.current = clock.current
    const mult = combo.current
    onHit(mult)
    onCombo(mult)
    const v = c.pos.clone().project(camera)
    onFloat({
      x: (v.x * 0.5 + 0.5) * size.width,
      y: (-v.y * 0.5 + 0.5) * size.height,
      text: mult > 1 ? `+${mult} ×${mult}` : "+1",
      big: mult >= 4,
    })
  }, [cubes, running, burst, camera, size, onHit, onCombo, onFloat])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)

    // éclats (tournent même sur les écrans idle/over)
    for (let i = 0; i < SHARD_POOL; i++) {
      const s = shards[i]; const m = shardMeshes.current[i]; if (!m) continue
      if (!s.active) { m.visible = false; continue }
      s.life -= dt / 0.55
      if (s.life <= 0) { s.active = false; m.visible = false; continue }
      s.vel.multiplyScalar(1 - 2.2 * dt)
      s.pos.addScaledVector(s.vel, dt)
      m.visible = true
      m.position.copy(s.pos)
      m.rotation.x += s.rot.x * dt; m.rotation.y += s.rot.y * dt
      m.scale.setScalar(s.size * s.life)
      ;(m.material as THREE.MeshStandardMaterial).opacity = s.life
    }

    if (!running) { cubeMeshes.current.forEach((m) => m && (m.visible = false)); return }

    clock.current += dt
    const el = clock.current
    const speed = 1.0 + el * 0.05
    const maxActive = Math.min(CUBE_POOL, 2 + Math.floor(el / 6))
    let activeCount = 0
    for (const c of cubes) if (c.alive) activeCount++

    if (combo.current > 0 && el - lastHit.current > COMBO_WINDOW) { combo.current = 0; onCombo(0) }

    for (let i = 0; i < CUBE_POOL; i++) {
      const c = cubes[i]; const m = cubeMeshes.current[i]; if (!m) continue
      if (!c.alive) {
        m.visible = false
        if (activeCount < maxActive && el >= c.respawnAt) { spawnCube(c, speed); activeCount++ }
        continue
      }
      c.pos.addScaledVector(c.dir, dt)
      if (c.pos.distanceTo(CORE_POS) < CORE_R) {
        pulse.t.value = 0; pulse.o.value.copy(c.pos)
        audioEngine.play("powerdown")
        c.alive = false
        c.respawnAt = el + 0.5
        combo.current = 0; onCombo(0)
        onBreach()
        m.visible = false
        continue
      }
      m.visible = true
      m.position.copy(c.pos)
      m.rotation.x += c.spin.x * dt; m.rotation.y += c.spin.y * dt
      m.scale.setScalar(c.size)
      const mat = m.material as THREE.MeshStandardMaterial
      mat.opacity = 1
      mat.color.setHSL(c.hue, 0.85, 0.55)
      mat.emissive.setHSL(c.hue, 0.9, 0.35)
    }
  })

  return (
    <group>
      {cubes.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { cubeMeshes.current[i] = el }}
          onClick={hit(i)}
          // cible verrouillée → curseur custom en mode "visée" (croix +) ; crosshair natif en repli
          onPointerOver={() => { document.body.dataset.aim = "1"; document.body.style.cursor = "crosshair" }}
          onPointerOut={() => { delete document.body.dataset.aim; document.body.style.cursor = "" }}
          visible={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial transparent color="#f472b6" emissive="#be185d" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {shards.map((_, i) => (
        <mesh key={`s${i}`} ref={(el) => { shardMeshes.current[i] = el }} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial transparent color="#fb7185" emissive="#f43f5e" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  )
}

export default function TransmissionCanvas({
  running, pulse, defeated, onHit, onBreach, onCombo, onFloat,
}: {
  running: boolean
  pulse: Pulse
  defeated: boolean
  onHit: (points: number) => void
  onBreach: () => void
  onCombo: (mult: number) => void
  onFloat: (f: Omit<Float, "id">) => void
}) {
  return (
    <Canvas camera={{ position: [0, 0.4, 9], fov: 55 }} dpr={[1, 2]}>
      <color attach="background" args={["#02040a"]} />
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 2, 6]} intensity={1.3} color="#67e8f9" />
      <Suspense fallback={null}>
        <Hologram pulse={pulse} defeated={defeated} />
      </Suspense>
      <GameField running={running} pulse={pulse} onHit={onHit} onBreach={onBreach} onCombo={onCombo} onFloat={onFloat} />
    </Canvas>
  )
}

useGLTF.preload(HUMAN_URL, true)
