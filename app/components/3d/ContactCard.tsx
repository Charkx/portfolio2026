'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Environment } from '@react-three/drei';
import { IDCardVisual } from './BiometricCard';

const clamp = THREE.MathUtils.clamp;

// Teinte de la pluie selon l'identifiant survolé (NetworkIdentifiers sous la carte)
const RAIN_TINTS: Record<string, string> = {
  email:    '#22d3ee', // cyan
  github:   '#c084fc', // violet
  linkedin: '#38bdf8', // bleu
  cv:       '#f472b6', // rose
};
const RAIN_BASE = '#9ceef7';

// Pluie stellaire autour de la carte : étoiles qui tombent lentement, apparaissent avec
// la carte (reveal fin de session), et réagissent au survol des coordonnées — la pluie
// prend la teinte de l'identifiant et accélère (rush), comme un flux de données.
function StarRain() {
  const pts = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const reduced = useReducedMotion();
  const { positions, speeds } = useMemo(() => {
    const N = 260;
    const positions = new Float32Array(N * 3);
    const speeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 4.6; // large : entoure la carte
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.4;
      positions[i * 3 + 2] = -0.9 + Math.random() * 1.4;  // devant ET derrière la carte
      speeds[i] = 0.25 + Math.random() * 0.55;
    }
    return { positions, speeds };
  }, []);
  const cur = useRef(new THREE.Color(RAIN_BASE));
  const tgt = useRef(new THREE.Color());

  useFrame((_, dt) => {
    const p = pts.current, m = mat.current;
    if (!p || !m) return;
    const store = useSceneStore.getState();
    const hovered = store.contactIdHovered;
    const reveal = clamp(((store.endSessionProgress ?? 0) - 0.85) / 0.15, 0, 1);
    const k = 1 - Math.pow(0.002, dt); // lissage indépendant du framerate

    // teinte + taille : réagissent au survol d'une coordonnée
    tgt.current.set(hovered ? (RAIN_TINTS[hovered] ?? RAIN_BASE) : RAIN_BASE);
    cur.current.lerp(tgt.current, k);
    m.color.copy(cur.current);
    m.size = THREE.MathUtils.lerp(m.size, hovered ? 0.05 : 0.028, k);
    m.opacity = reveal * 0.8; // la pluie naît avec la carte

    if (reduced) return; // reduced-motion : étoiles fixes (constellation)
    const rush = hovered ? 3 : 1; // survol = le flux s'accélère
    const arr = p.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < speeds.length; i++) {
      let y = arr.getY(i) - speeds[i] * rush * dt;
      if (y < -1.7) y = 1.7;
      arr.setY(i, y);
    }
    arr.needsUpdate = true;
  });

  return (
    <points ref={pts}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        color={RAIN_BASE}
        size={0.028}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Carte "artefact" de la fin de session — LA MÊME carte que le hero (IDCardVisual
// partagé), retrouvée puis révélée par la scanline. La boucle est bouclée :
// le site commence et finit sur cet objet.
function CardModel() {
  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const sentAt = useRef<number | null>(null); // instant de l'envoi → animation finale

  useFrame((state) => {
    const g = group.current; if (!g) return;
    const store = useSceneStore.getState();
    const es = store.endSessionProgress ?? 0;
    const reveal = clamp((es - 0.85) / 0.15, 0, 1); // 0→1 : la carte se matérialise
    const t = state.clock.elapsedTime;

    // matérialisation : la carte n'apparaît qu'avec la scanline
    g.visible = reveal > 0.02;

    // animation finale (message envoyé) : un tour + pulse
    if (store.endSessionSent && sentAt.current === null) sentAt.current = t;
    let flip = 0, pulse = 0;
    if (sentAt.current !== null) {
      const e = clamp((t - sentAt.current) / 1.2, 0, 1);
      const ease = e * e * (3 - 2 * e);
      flip = ease * Math.PI * 2;
      pulse = Math.sin(e * Math.PI) * 0.12;
    }

    // flottement + légère inclinaison (+ flip final) ; échelle qui accompagne le reveal
    g.rotation.y = -0.32 + Math.sin(t * 0.5) * 0.06 + flip;
    g.rotation.x = -0.12 + Math.cos(t * 0.4) * 0.04;
    g.position.y = Math.sin(t * 0.8) * 0.03;
    g.scale.setScalar(1.35 * (0.94 + reveal * 0.06) * (1 + pulse));

    // scanline qui traverse la carte une fois
    if (scan.current) {
      const on = reveal > 0.02 && reveal < 0.98;
      scan.current.visible = on;
      scan.current.position.y = THREE.MathUtils.lerp(0.52, -0.52, reveal);
      (scan.current.material as THREE.MeshBasicMaterial).opacity = on ? 0.8 : 0;
    }
  });

  return (
    <group ref={group} scale={1.35}>
      <IDCardVisual>
        {/* scanline d'activation */}
        <mesh ref={scan} position={[0, 0.52, 0.024]}>
          <planeGeometry args={[1.6, 0.03]} />
          <meshBasicMaterial color="#7dffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </IDCardVisual>
    </group>
  );
}

export default function ContactCard() {
  return (
    <Canvas gl={{ antialias: true, alpha: true }}>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={40} />
      <ambientLight intensity={0.9} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
      <pointLight position={[0, 0, 10]} intensity={0.8} color="#ffffff" />
      <Suspense fallback={null}>
        <Environment preset="night" />
        <CardModel />
        <StarRain />
      </Suspense>
    </Canvas>
  );
}
