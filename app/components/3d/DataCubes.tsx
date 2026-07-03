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
const ORBIT_R = 0.5;     // rayon d'orbite : couronne assez large pour éviter les doigts,
                         // assez serrée pour rester dans le cadre POV
const BOB = 0.05;        // amplitude du bobbing vertical
const LIFT = 0.18;       // hauteur du nuage au-dessus de la paume
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
  const _camLocal = useRef(new THREE.Vector3()); // caméra en repère local (cible de convergence)
  const _gatherPt = useRef(new THREE.Vector3()); // point de rassemblement des éclats
  const _shardPos = useRef(new THREE.Vector3());

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
      audioEngine.play('derez'); // dématérialisation : impact + éclats + convergence (calé sur le tween)
      if (reducedMotion) d.t = 0;                    // reduced-motion : pas d'explosion
      // t linéaire (easing par phase dans useFrame). S'arrête à 0.65 = l'instant où le
      // panneau apparaît (650 ms, sync ProjectsSection) → l'explosion SE FIGE dans cet
      // état tant que le panneau est ouvert, et refluera depuis là à la fermeture.
      else gsap.to(d, { t: 0.65, duration: 0.65, ease: 'none' });
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
  // sont portés dans un conteneur FIXE plein écran avec un z supérieur.
  // (pas <body> : drei positionne en coordonnées viewport → sur body, le scroll
  // de la page les décalerait de plusieurs écrans → boutons incliquables)
  const portalRef = useRef<HTMLElement>(null!);
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:18;';
    document.body.appendChild(el);
    portalRef.current = el;
    setPortalReady(true);
    return () => { document.body.removeChild(el); };
  }, []);

  useFrame((state, dt) => {
    // panneau déployé → LE TEMPS S'ARRÊTE : orbite, bobbing et rotations figés
    // (l'horloge ne repart qu'à la fermeture, l'explosion reflue depuis son état gelé)
    const frozen = useSceneStore.getState().projectDeployed !== null;
    if (!frozen) tRef.current += dt;
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
        if (!reducedMotion && !frozen) { g.rotation.y += dt * 0.5; g.rotation.x = Math.sin(tRef.current * 0.6 + i) * 0.25; }
      }
      let target = sel === i ? 1.32 : hov === i ? 1.2 : 1;
      if (isDeploying) target *= 1 - Math.min(d.t / 0.5, 1); // le cube a fini de se dissoudre à mi-explosion
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

    // --- éclats : explosion en 2 temps — éclatement, puis CONVERGENCE vers l'écran
    // (le panneau DOM se matérialise à l'arrivée des éclats → le lien 3D → DOM se lit)
    const shards = shardsRef.current;
    if (shards) {
      if (d.index >= 0 && d.t > 0.001 && !reducedMotion) {
        shards.visible = true;
        const origin = deployOrigin.current;
        // cible : vers la caméra (l'écran), en repère local de l'ancre
        _camLocal.current.copy(state.camera.position);
        a.worldToLocal(_camLocal.current);
        _gatherPt.current.lerpVectors(origin, _camLocal.current, 0.55);
        const burst = Math.min(d.t / 0.4, 1);
        const be = 1 - Math.pow(1 - burst, 3);                        // éclatement (ease-out)
        const gather = THREE.MathUtils.clamp((d.t - 0.4) / 0.6, 0, 1);
        const ge = gather * gather * (3 - 2 * gather);                // convergence (smooth)
        for (let s = 0; s < SHARDS; s++) {
          const sd = shardData[s];
          _shardPos.current.copy(origin).addScaledVector(sd.dir, be * sd.dist);
          _shardPos.current.lerp(_gatherPt.current, ge);
          _dummy.current.position.copy(_shardPos.current);
          _dummy.current.rotation.set(sd.rot.x * d.t * 6, sd.rot.y * d.t * 6, sd.rot.z * d.t * 6);
          _dummy.current.scale.setScalar(SHARD_SIZE * (0.4 + 0.6 * (1 - d.t)) * (1 - ge * 0.7));
          _dummy.current.updateMatrix();
          shards.setMatrixAt(s, _dummy.current.matrix);
        }
        shards.instanceMatrix.needsUpdate = true;
        const m = shards.material as THREE.MeshBasicMaterial;
        m.color.set(colors[d.index] ?? '#22d3ee');
        m.opacity = 0.9 * Math.min(1, d.t * 5) * (1 - ge * 0.85);     // s'éteint en convergeant
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
