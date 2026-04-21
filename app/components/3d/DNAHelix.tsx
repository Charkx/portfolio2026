'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Logo3D from './Logo3D';
import MiniLogoParticlesManager from './MiniLogoParticlesManager';
import { TECH_STACK } from '@/app/utils/constants';
import type { MutationState, PositionMap } from '@/app/utils/types';

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
  totalPairs: 15,
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

// Géométrie et matériau partagés pour tous les liens
const LINK_GEOMETRY = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
const LINK_MATERIAL = new THREE.MeshStandardMaterial({ color: '#aaaaaa' });

// --- Types ---

interface Props {
  visibleTechs:       string[];
  hoveredTech:        string | null;
  selectedTech:       string | null;
  mutation:           MutationState | null;
  onTechClick:        (name: string) => void;
  onTechHover:        (name: string | null) => void;
  onPositionsReady:   (map: PositionMap) => void;
  onMutationComplete: () => void;
}

// --- Composant ---

export default function DNAHelix({
  visibleTechs,
  hoveredTech,
  selectedTech,
  mutation,
  onTechClick,
  onTechHover,
  onPositionsReady,
  onMutationComplete,
}: Props) {
  const groupRef    = useRef<THREE.Group>(null);
  const logoRefs    = useRef<Record<string, THREE.Group | null>>({});
  const onReadyRef  = useRef(onPositionsReady);
  const isMounted   = useRef(true);

  const [mutatedTarget, setMutatedTarget]   = useState<string | null>(null);
  const mutationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Maintenir les callbacks à jour sans recréer les effets
  useEffect(() => { onReadyRef.current = onPositionsReady; }, [onPositionsReady]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current);
    };
  }, []);

  // Stack aplati — stable entre les renders
  const flatStack = useMemo(() => Object.values(TECH_STACK).flat(), []);

  // Set des techs visibles — recalculé seulement quand visibleTechs change
  const visibleSet = useMemo(
    () => new Set(visibleTechs.map((t) => t.toLowerCase())),
    [visibleTechs]
  );

  // --- Rotation de l'hélice ---
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.00025;
  });

  // --- Capture des positions 3D ---
  // Déclenché après que les logos soient montés (visibleTechs.length change)
  useEffect(() => {
    if (visibleTechs.length === 0) return;

    const id = setTimeout(() => {
      if (!isMounted.current) return;

      const map: PositionMap = {};
      Object.entries(logoRefs.current).forEach(([name, ref]) => {
        if (!ref) return;
        const pos = new THREE.Vector3();
        ref.getWorldPosition(pos);
        map[name] = pos;
      });

      onReadyRef.current(map);
    }, 500);

    return () => clearTimeout(id);
  }, [visibleTechs.length]);

  // --- Résolution de la mutation ---
  // DNAHelix reçoit mutation en prop et résout uniquement la ref visuelle locale
  const mutationSource = useMemo(() => {
    if (!mutation) return null;
    return logoRefs.current[mutation.source] ?? null;
  }, [mutation]);

  const mutationTargetPos = useMemo(() => {
    if (!mutation) return null;
    const ref = logoRefs.current[mutation.target];
    if (!ref) return null;
    const pos = new THREE.Vector3();
    ref.getWorldPosition(pos);
    return pos;
  }, [mutation]);

  // --- Callback : toutes les particules sont arrivées ---
  const handleAllArrived = useCallback(() => {
    if (!isMounted.current) return;

    setMutatedTarget(mutation?.target ?? null);

    if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current);
    mutationTimerRef.current = setTimeout(() => {
      if (!isMounted.current) return;
      setMutatedTarget(null);
      onMutationComplete();
    }, 1500);
  }, [mutation, onMutationComplete]);

  // Reset mutatedTarget si la mutation change avant la fin du timer
  useEffect(() => {
    if (!mutation) {
      setMutatedTarget(null);
      if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current);
    }
  }, [mutation]);

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
            mutated={mutatedTarget === idA}
            ref={(ref) => { logoRefs.current[idA] = ref; }}
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
            mutated={mutatedTarget === idB}
            ref={(ref) => { logoRefs.current[idB] = ref; }}
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
  }, [flatStack, visibleSet, hoveredTech, selectedTech, mutatedTarget, onTechClick, onTechHover]);

  // --- Rendu ---
  return (
    <group ref={groupRef}>
      {elements}

      {mutation && mutationSource && mutationTargetPos && (
        <MiniLogoParticlesManager
          key={`${mutation.source}->${mutation.target}`}
          tech={flatStack.find((t) => t.name.toLowerCase() === mutation.source)!}
          origin={new THREE.Vector3().copy(
            (() => {
              const pos = new THREE.Vector3();
              mutationSource.getWorldPosition(pos);
              return pos;
            })()
          )}
          target={mutationTargetPos}
          logoMesh={mutationSource}
          particleCount={10}
          onAllArrived={handleAllArrived}
        />
      )}
    </group>
  );
}