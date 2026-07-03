'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { audioEngine } from '../../lib/audioEngine';

// Data Cubes : un cube holographique par projet, gravitant au-dessus de la paume droite
// (main levée du GLB). Survol = arc d'énergie main→cube ; clic = explosion contrôlée (pool
// d'éclats GSAP) qui déploie le panneau DOM (store: projectDeployed). Un seul useFrame.

const CUBE = 0.16;       // arête du cube (unités monde ; le corps fait 1.8)
const ORBIT_R = 0.34;    // rayon d'orbite autour de la paume
const BOB = 0.05;        // amplitude du bobbing vertical
const LIFT = 0.14;       // hauteur du nuage au-dessus de l'os de la main
const SHARDS = 24;       // éclats par explosion (pool réutilisé, jamais recréé)
const SHARD_SIZE = 0.03; // taille d'un éclat
const UP = new THREE.Vector3(0, 1, 0);

// teinte claire (arêtes) dérivée de la couleur de statut du projet
function brighten(hex: string) {
  return new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), 0.35);
}

export default function DataCubes({ position, baseScale, weightsRef, palmBone }: {
  position: THREE.Vector3;
  baseScale: number;
  weightsRef: RefObject<Record<string, number>>;
  palmBone: THREE.Object3D | null;
}) {
  const colors = useSceneStore((s) => s.projectColors);
  const cards = useSceneStore((s) => s.projectCards);
  const sel = useSceneStore((s) => s.projectSelected);
  const hov = useSceneStore((s) => s.projectHovered);
  const deployed = useSceneStore((s) => s.projectDeployed);
  const reducedMotion = useReducedMotion();

  const anchor = useRef<THREE.Group>(null);
  const cubeRefs = useRef<(THREE.Group | null)[]>([]);
  const scaleRefs = useRef<number[]>([]);        // échelle lissée par cube
  const arcRef = useRef<THREE.Mesh>(null);       // arc d'énergie main → cube survolé
  const shardsRef = useRef<THREE.InstancedMesh>(null);
  const tRef = useRef(0);

  // état d'explosion : index du cube déployé + progression t (0 = cube, 1 = éclaté)
  const deployRef = useRef({ index: -1, t: 0 });
  const deployOrigin = useRef(new THREE.Vector3()); // point d'émission (position figée du cube)

  const _v = useRef(new THREE.Vector3());
  const _tmp = useRef(new THREE.Vector3());
  const _dummy = useRef(new THREE.Object3D());

  const n = cards.length;

  // géométries partagées par les 4 cubes
  const box = useMemo(() => new THREE.BoxGeometry(CUBE, CUBE, CUBE), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(box), [box]);

  // directions/rotations aléatoires des éclats (fixées une fois → pool réutilisé)
  const shardData = useMemo(() => Array.from({ length: SHARDS }, () => {
    const dir = new THREE.Vector3().randomDirection();
    return { dir, dist: 0.18 + Math.random() * 0.28, rot: new THREE.Vector3().randomDirection() };
  }), []);

  // déclenche l'explosion / le rembobinage quand le projet déployé change
  useEffect(() => {
    const d = deployRef.current;
    gsap.killTweensOf(d);
    if (deployed !== null) {
      d.index = deployed;
      const g = cubeRefs.current[deployed];
      if (g) deployOrigin.current.copy(g.position); // fige le point d'émission
      audioEngine.play('ignition');
      if (reducedMotion) d.t = 0;                    // reduced-motion : pas d'explosion
      else gsap.to(d, { t: 1, duration: 0.6, ease: 'power3.out' });
    } else if (reducedMotion) {
      d.t = 0; d.index = -1;
    } else {
      gsap.to(d, { t: 0, duration: 0.45, ease: 'power2.in', onComplete: () => { d.index = -1; } });
    }
  }, [deployed, reducedMotion]);

  // en quittant la section (démontage), on referme le panneau éventuellement déployé
  // (l'ouverture/fermeture au clavier + Échap est gérée par le panneau DOM ProjectCaseStudy)
  useEffect(() => () => { useSceneStore.getState().setProjectDeployed(null); }, []);

  // canvas permanent DERRIÈRE le contenu (z-5 < main z-10) → les boutons des cubes
  // sont portés sur <body> avec un z supérieur, sinon ils seraient incliquables
  const portalRef = useRef<HTMLElement>(null!);
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { portalRef.current = document.body; setPortalReady(true); }, []);

  useFrame((_, dt) => {
    tRef.current += dt;
    const a = anchor.current;
    if (!a) return;
    const w = THREE.MathUtils.clamp(weightsRef.current.heart ?? 0, 0, 1);

    // ancrage sur la paume (position monde de l'os) — repli sur la position statique
    if (palmBone) { palmBone.getWorldPosition(_v.current); a.position.copy(_v.current); }
    else a.position.copy(position);
    a.position.y += LIFT;

    a.visible = w > 0.004;
    a.scale.setScalar(baseScale * (0.9 + w * 0.2));

    const mr = useSceneStore.getState().manualRot.heart;
    const spin = reducedMotion ? 0 : tRef.current * 0.35 + (mr?.y ?? 0);
    const d = deployRef.current;

    // --- cubes : orbite + bobbing + échelle (survol/sélection/explosion) ---
    for (let i = 0; i < n; i++) {
      const g = cubeRefs.current[i];
      if (!g) continue;
      const isDeploying = d.index === i;
      if (!isDeploying) {
        const ang = spin + (i / n) * Math.PI * 2;
        const bob = reducedMotion ? 0 : Math.sin(tRef.current * 1.3 + i * 1.7) * BOB;
        g.position.set(Math.cos(ang) * ORBIT_R, bob, Math.sin(ang) * ORBIT_R);
        if (!reducedMotion) { g.rotation.y += dt * 0.5; g.rotation.x = Math.sin(tRef.current * 0.6 + i) * 0.25; }
      }
      let target = sel === i ? 1.32 : hov === i ? 1.2 : 1;
      if (isDeploying) target *= 1 - d.t; // le cube rétrécit en explosant
      const cur = scaleRefs.current[i] ?? 1;
      const next = THREE.MathUtils.lerp(cur, target, reducedMotion ? 1 : 0.2);
      scaleRefs.current[i] = next;
      g.scale.setScalar(next);
    }

    // --- arc d'énergie : main (origine) → cube survolé ---
    const arc = arcRef.current;
    if (arc) {
      const hi = hov;
      const target = hi != null ? cubeRefs.current[hi] : null;
      if (hi != null && target && !reducedMotion && d.index < 0) {
        const b = target.position;
        const len = b.length() || 0.001;
        arc.position.copy(b).multiplyScalar(0.5);
        arc.quaternion.setFromUnitVectors(UP, _tmp.current.copy(b).normalize());
        arc.scale.set(1, len, 1);
        arc.visible = true;
        const pulse = 0.5 + 0.5 * Math.sin(tRef.current * 8);
        const m = arc.material as THREE.MeshBasicMaterial;
        m.opacity = 0.35 + 0.4 * pulse;
        m.color.set(colors[hi] ?? '#22d3ee');
      } else {
        arc.visible = false;
      }
    }

    // --- éclats : nuage d'explosion pendant le déploiement ---
    const shards = shardsRef.current;
    if (shards) {
      if (d.index >= 0 && d.t > 0.001 && !reducedMotion) {
        shards.visible = true;
        const origin = deployOrigin.current;
        for (let s = 0; s < SHARDS; s++) {
          const sd = shardData[s];
          _dummy.current.position.copy(origin).addScaledVector(sd.dir, d.t * sd.dist);
          _dummy.current.rotation.set(sd.rot.x * d.t * 6, sd.rot.y * d.t * 6, sd.rot.z * d.t * 6);
          _dummy.current.scale.setScalar(SHARD_SIZE * (0.35 + 0.65 * (1 - d.t)));
          _dummy.current.updateMatrix();
          shards.setMatrixAt(s, _dummy.current.matrix);
        }
        shards.instanceMatrix.needsUpdate = true;
        (shards.material as THREE.MeshBasicMaterial).color.set(colors[d.index] ?? '#22d3ee');
        (shards.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.min(1, d.t * 4);
      } else {
        shards.visible = false;
      }
    }
  });

  // interactions souris via boutons DOM (le canvas partagé est en pointer-events:none)
  const onOver = (i: number) => () => { useSceneStore.getState().setProjectHovered(i); audioEngine.play('hover'); };
  const onOut = () => useSceneStore.getState().setProjectHovered(null);
  const onClick = (i: number) => () => { const st = useSceneStore.getState(); st.requestSelectProject?.(i); st.setProjectDeployed(i); };

  return (
    <group ref={anchor} position={position}>
      {/* arc d'énergie main → cube survolé */}
      <mesh ref={arcRef} visible={false}>
        <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* pool d'éclats (explosion contrôlée) */}
      <instancedMesh ref={shardsRef} args={[undefined, undefined, SHARDS]} visible={false} frustumCulled={false}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>

      {cards.map((card, i) => {
        const hex = colors[i] ?? '#22d3ee';
        return (
          <group key={card.id} ref={(el) => { cubeRefs.current[i] = el; }}>
            {/* faces holographiques */}
            <mesh geometry={box}>
              <meshBasicMaterial color={hex} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {/* arêtes lumineuses (le caractère vient du matériau, pas de la géométrie) */}
            <lineSegments geometry={edges}>
              <lineBasicMaterial color={brighten(hex)} transparent opacity={0.9} />
            </lineSegments>
            {/* bouton DOM transparent (canvas en pointer-events:none) → survol/clic souris */}
            {portalReady && (
              <Html center portal={portalRef} zIndexRange={[20, 15]} style={{ pointerEvents: 'auto' }}>
                <button
                  type="button" tabIndex={-1} aria-hidden="true" title={card.title}
                  onPointerOver={onOver(i)} onPointerOut={onOut} onClick={onClick(i)}
                  style={{ width: 54, height: 54, borderRadius: 10, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                />
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
