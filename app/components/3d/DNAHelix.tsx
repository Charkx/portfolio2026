'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Logo3D from './Logo3D';
import { TECH_STACK, HELIX_STRANDS } from '@/app/utils/constants';

// --- Constantes ---

const BASE_COLORS = {
  A: '#FF5733',
  T: '#33C1FF',
  G: '#33FF57',
  C: '#FF33D1',
} as const;

type Base = keyof typeof BASE_COLORS;

const COMPLEMENT: Record<Base, Base> = { A: 'T', T: 'A', G: 'C', C: 'G' };
const BASES: Base[] = ['A', 'T', 'G', 'C'];

const HELIX_CONFIG = {
  totalPairs: 16, // = nb total de technos (Front + Back + DevOps)
  spacing:    0.5,
  radius:     1.5,
  angleStep:  0.35,
} as const;

// Vecteurs réutilisables — jamais alloués dans le render loop
const _pos1 = new THREE.Vector3();
const _pos2 = new THREE.Vector3();
const _mid  = new THREE.Vector3();
const _dir  = new THREE.Vector3();
const _up   = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _lerp = new THREE.Vector3();

// Géométrie et matériau partagés pour tous les liens (barreaux = cyan néon)
const LINK_GEOMETRY = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6);
const LINK_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#0a3a4a',
  emissive: '#22d3ee',
  emissiveIntensity: 0.9,
  transparent: true,
  opacity: 0.85,
});

// --- Types ---

interface Props {
  visibleTechs: string[];
  hoveredTech:  string | null;
  selectedTech: string | null;
  onTechClick:  (name: string) => void;
  onTechHover:  (name: string | null) => void;
}

// --- Composant ---

export default function DNAHelix({
  visibleTechs,
  hoveredTech,
  selectedTech,
  onTechClick,
  onTechHover,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);

  // Stack pour l'hélice — toutes les technos (langages + DevOps)
  const flatStack = useMemo(() => Object.values(TECH_STACK).flat(), []);

  // Set des techs visibles — recalculé seulement quand visibleTechs change
  const visibleSet = useMemo(
    () => new Set(visibleTechs.map((t) => t.toLowerCase())),
    [visibleTechs]
  );

  // --- Scaffold DA (cyan néon) : les 2 brins + un voile de particules ---
  const scaffold = useMemo(() => {
    const { totalPairs, spacing, radius, angleStep } = HELIX_CONFIG;
    const ptsA: THREE.Vector3[] = [];
    const ptsB: THREE.Vector3[] = [];
    const rBack = radius + 0.4; // brins un peu à l'extérieur → ne traversent plus les sphères
    for (let i = 0; i < totalPairs; i++) {
      const angle = i * angleStep;
      const y = (i - totalPairs / 2) * spacing;
      ptsA.push(new THREE.Vector3(Math.cos(angle) * rBack, y, Math.sin(angle) * rBack));
      ptsB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * rBack, y, Math.sin(angle + Math.PI) * rBack));
    }
    const tubeA = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsA), 100, 0.02, 8, false);
    const tubeB = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsB), 100, 0.02, 8, false);
    // particules autour de l'hélice (cylindre)
    const N = 260;
    const h = totalPairs * spacing;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius * (0.6 + Math.random() * 1.2);
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * h * 1.1;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    const particles = new THREE.BufferGeometry();
    particles.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return { tubeA, tubeB, particles };
  }, []);
  useEffect(() => () => {
    scaffold.tubeA.dispose();
    scaffold.tubeB.dispose();
    scaffold.particles.dispose();
  }, [scaffold]);

  // --- Rotation de l'hélice ---
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.00025;
  });

  // --- Génération des éléments de l'hélice ---
  const elements = useMemo(() => {
    const { totalPairs, spacing, radius, angleStep } = HELIX_CONFIG;
    const result: React.ReactNode[] = [];

    for (let i = 0; i < totalPairs; i++) {
      const techA    = flatStack[i % flatStack.length];
      const techB    = flatStack[(i + 1) % flatStack.length];
      const baseA    = BASES[i % 4];
      const baseB    = COMPLEMENT[baseA];
      const angle    = i * angleStep;
      const y        = (i - totalPairs / 2) * spacing;
      const x1       = Math.cos(angle) * radius;
      const z1       = Math.sin(angle) * radius;
      const x2       = Math.cos(angle + Math.PI) * radius;
      const z2       = Math.sin(angle + Math.PI) * radius;
      const idA      = techA.name.toLowerCase();
      const idB      = techB.name.toLowerCase();
      const showA    = visibleSet.has(idA);
      const showB    = visibleSet.has(idB);

      if (showA) {
        result.push(
          <Logo3D
            key={`a-${i}-${idA}`}
            tech={techA}
            base={baseA}
            position={[x1, y, z1]}
            highlighted={hoveredTech === idA}
            selected={selectedTech === idA}
            onClick={() => onTechClick(techA.name)}
            onPointerOver={() => onTechHover(techA.name)}
            onPointerOut={() => onTechHover(null)}
          />
        );
      }

      if (showB) {
        result.push(
          <Logo3D
            key={`b-${i}-${idB}`}
            tech={techB}
            base={baseB}
            position={[x2, y, z2]}
            highlighted={hoveredTech === idB}
            selected={selectedTech === idB}
            onClick={() => onTechClick(techB.name)}
            onPointerOver={() => onTechHover(techB.name)}
            onPointerOut={() => onTechHover(null)}
          />
        );
      }

      if (showA && showB) {
        _pos1.set(x1, y, z1);
        _pos2.set(x2, y, z2);
        _mid.addVectors(_pos1, _pos2).multiplyScalar(0.5);
        _dir.subVectors(_pos2, _pos1);
        const len = _dir.length();
        _quat.setFromUnitVectors(_up, _dir.normalize());

        result.push(
          <mesh
            key={`link-${i}`}
            geometry={LINK_GEOMETRY}
            material={LINK_MATERIAL}
            position={_mid.clone()}
            quaternion={_quat.clone()}
            scale={[1, len, 1]}
          />
        );
      }
    }

    return result;
  }, [flatStack, visibleSet, hoveredTech, selectedTech, onTechClick, onTechHover]);

  // --- Rendu ---
  return (
    <group ref={groupRef}>
      {/* Brins néon = MÉTHODES (A) et IA & PRODUCTIVITÉ (B) — teintes de HELIX_STRANDS */}
      <mesh geometry={scaffold.tubeA}>
        <meshStandardMaterial color="#0a3a4a" emissive={HELIX_STRANDS[0].color} emissiveIntensity={1} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={scaffold.tubeB}>
        <meshStandardMaterial color="#0a3a4a" emissive={HELIX_STRANDS[1].color} emissiveIntensity={1} transparent opacity={0.85} />
      </mesh>
      {/* Voile de particules cyan (cohérence avec le cerveau) */}
      <points geometry={scaffold.particles}>
        <pointsMaterial color="#22d3ee" size={0.045} transparent opacity={0.5} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {elements}
    </group>
  );
}