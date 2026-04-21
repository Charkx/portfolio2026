'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { useReducedMotion } from '@/app/hooks/useReducedMotion';
import type { Project } from '@/app/utils/types';

// --- Constantes ---

const CAROUSEL_RADIUS = 4;

const STATUS_COLORS: Record<Project['status'], string> = {
  COMPLETED:   '#00ff00',
  OPERATIONAL: '#00ffff',
  ACTIVE:      '#ffff00',
  CLASSIFIED:  '#ff0000',
};

// Vecteurs pré-alloués
const _INSERT_POSITION = new THREE.Vector3(0, 1.2, 2.2);
const _INSERT_SCALE    = new THREE.Vector3(1.25, 1.25, 1.25);
const _DEFAULT_SCALE   = new THREE.Vector3(1, 1, 1);
const _SELECT_SCALE    = new THREE.Vector3(1.12, 1.12, 1.12);
const _HOVER_SCALE     = new THREE.Vector3(1.06, 1.06, 1.06);
const _DIM_SCALE       = new THREE.Vector3(0.92, 0.92, 0.92);

// --- Types ---

interface CardProps {
  position:             [number, number, number];
  rotation:             [number, number, number];
  project:              Project;
  index:                number;
  isSelected:           boolean;
  isInserted:           boolean;
  isHovered:            boolean;
  isDimmed:             boolean; // true si un autre projet est actif
  prefersReducedMotion: boolean;
  onCardClick:          (index: number) => void;
  onCardHover:          (index: number | null) => void;
}

// --- Guard drag ---

function useDragGuard(threshold = 4) {
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging     = useRef(false);

  const onPointerDown = useCallback((e: any) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  }, []);

  const onPointerMove = useCallback((e: any) => {
    if (!pointerDownPos.current) return;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > threshold) isDragging.current = true;
  }, [threshold]);

  const onPointerUp = useCallback((callback: () => void) => () => {
    if (!isDragging.current) callback();
    pointerDownPos.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

// --- MemoryCard ---

function MemoryCard({
  position,
  rotation,
  project,
  index,
  isSelected,
  isInserted,
  isHovered,
  isDimmed,
  prefersReducedMotion,
  onCardClick,
  onCardHover,
}: CardProps) {
  const cardRef  = useRef<THREE.Group>(null);
  const haloRef  = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Mesh>(null);

  // Ref pour l'opacité courante du matériau body — interpolée dans useFrame
  const bodyOpacityRef = useRef(1);

  const statusColor = STATUS_COLORS[project.status];
  const { onPointerDown, onPointerMove, onPointerUp } = useDragGuard();

  useEffect(() => {
    return () => { document.body.style.cursor = 'auto'; };
  }, []);

  useFrame((state) => {
    if (!cardRef.current) return;

    if (isInserted) {
      cardRef.current.position.lerp(_INSERT_POSITION, 0.08);
      cardRef.current.scale.lerp(_INSERT_SCALE, 0.1);
      cardRef.current.rotation.set(0, 0, 0);
      return;
    }

    const time   = state.clock.elapsedTime;
    const floatY = prefersReducedMotion
      ? 0
      : Math.sin(time * 0.6 + index * 1.2) * 0.05;

    cardRef.current.position.set(position[0], position[1] + floatY, position[2]);
    cardRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);

    // Scale : sélectionné > hover > dimmed > défaut
    const targetScale = isSelected
      ? _SELECT_SCALE
      : isHovered
        ? _HOVER_SCALE
        : isDimmed
          ? _DIM_SCALE
          : _DEFAULT_SCALE;

    cardRef.current.scale.lerp(targetScale, 0.1);

    // Opacité : dimmed = 40%, sinon 100%
    const targetOpacity = isDimmed ? 0.4 : 1;
    bodyOpacityRef.current = THREE.MathUtils.lerp(
      bodyOpacityRef.current,
      targetOpacity,
      0.08
    );

    // Applique l'opacité à tous les meshes enfants
    cardRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.transparent) mat.opacity = bodyOpacityRef.current;
      }
    });

    // Halo
    if (haloRef.current && isSelected && !prefersReducedMotion) {
      haloRef.current.rotation.y += 0.03;
      haloRef.current.rotation.x = Math.sin(time * 1.4) * 0.1;
    }
  });

  return (
    <group>
      <group
        ref={cardRef}
        position={position}
        rotation={rotation}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp(() => onCardClick(index))}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
          onCardHover(index);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          onCardHover(null);
        }}
      >
        {/* Corps */}
        <mesh>
          <boxGeometry args={[0.8, 0.05, 1.2]} />
          <meshStandardMaterial
            color="#2a2a2a"
            metalness={0.1}
            roughness={0.3}
            transparent
            opacity={1}
          />
        </mesh>

        {/* Face avant */}
        <mesh position={[0, 0.026, 0]}>
          <planeGeometry args={[0.75, 1.15]} />
          <meshStandardMaterial
            color="#1a1a1a"
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Indicateur statut */}
        <mesh position={[0.3, 0.027, 0.5]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={isSelected ? 1.2 : isHovered ? 0.8 : 0.4}
          />
        </mesh>

        {/* Preview au hover — Html Three.js */}
        {(isHovered || isSelected) && !isInserted && (
          <Html
            position={[0, 0.8, 0]}
            center
            distanceFactor={4}
            occlude
            style={{ pointerEvents: 'none' }}
          >
            <div className="bg-black/90 border border-cyan-400/50 rounded-lg
                            px-3 py-2 font-mono text-center backdrop-blur-sm
                            shadow-xl shadow-cyan-400/10 whitespace-nowrap">
              <div className="text-cyan-300 text-xs font-semibold mb-0.5">
                {project.title}
              </div>
              <div className="text-pink-300/70 text-[10px]">
                {project.tech.slice(0, 3).join(' · ')}
              </div>
            </div>
          </Html>
        )}
      </group>

      {/* Halo de sélection */}
      {isSelected && !isInserted && (
        <group
          ref={haloRef}
          position={[position[0], position[1] + 0.8, position[2]]}
        >
          <mesh>
            <torusGeometry args={[1.5, 0.03, 8, 32]} />
            <meshBasicMaterial
              color={statusColor}
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

// --- MemoryReconstruction ---

interface Props {
  projects:        Project[];
  selectedProject: number | null;
  hoveredProject:  number | null;
  insertedProject: number | null;
  onProjectSelect: (index: number) => void;
  onProjectInsert: (index: number) => void;
  onCardHover:     (index: number | null) => void;
}

export default function MemoryReconstruction({
  projects,
  selectedProject,
  hoveredProject,
  insertedProject,
  onProjectSelect,
  onProjectInsert,
  onCardHover,
}: Props) {
  const rotationRef          = useRef(0);
  const [rotation, setRotation] = useState(0);
  const gsapTweenRef         = useRef<gsap.core.Tween | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Source active — sélection prioritaire sur hover
  const activeIndex = selectedProject ?? hoveredProject ?? null;

  const getPos = useCallback((i: number, total: number): [number, number, number] => {
    const angle = (i / total) * Math.PI * 2 + rotationRef.current;
    return [Math.cos(angle) * CAROUSEL_RADIUS, 0, Math.sin(angle) * CAROUSEL_RADIUS];
  }, []);

  const getRot = useCallback((i: number, total: number): [number, number, number] => {
    const angle = (i / total) * Math.PI * 2 + rotationRef.current;
    return [0, -angle + Math.PI / 2, 0];
  }, []);

  // Rotation auto
  useFrame(() => {
    if (activeIndex !== null || prefersReducedMotion) return;
    rotationRef.current += 0.002;
    setRotation(rotationRef.current);
  });

  // Rotation vers la carte active (sélection ou hover)
  useEffect(() => {
    if (activeIndex === null) return;

    gsapTweenRef.current?.kill();

    const target = -(activeIndex / projects.length) * Math.PI * 2;

    gsapTweenRef.current = gsap.to(rotationRef, {
      current:  target,
      duration: prefersReducedMotion ? 0.2 : selectedProject !== null ? 1.2 : 0.6,
      ease:     selectedProject !== null ? 'power2.out' : 'power1.out',
      onUpdate: () => setRotation(rotationRef.current),
    });

    return () => { gsapTweenRef.current?.kill(); };
  }, [activeIndex, projects.length, prefersReducedMotion, selectedProject]);

  const handleCardClick = useCallback((index: number) => {
    if (index === selectedProject) onProjectInsert(index);
    else onProjectSelect(index);
  }, [selectedProject, onProjectSelect, onProjectInsert]);

  // Propagé vers le parent — synchronise le hover canvas → cards HTML
  const handleCardHover = useCallback((index: number | null) => {
    // On passe par onProjectSelect avec un signal neutre
    // Le parent gère hoveredProject séparément via setHoveredProject
    // Ce callback est injecté via prop depuis ProjectsSection
  }, []);

  return (
    <group>
      {projects.map((project, index) => (
        <MemoryCard
          key={project.memId}
          position={getPos(index, projects.length)}
          rotation={getRot(index, projects.length)}
          project={project}
          index={index}
          isSelected={selectedProject === index}
          isInserted={insertedProject === index}
          isHovered={hoveredProject === index && selectedProject === null}
          isDimmed={activeIndex !== null && activeIndex !== index}
          prefersReducedMotion={prefersReducedMotion}
          onCardClick={handleCardClick}
          onCardHover={onCardHover}
        />
      ))}
    </group>
  );
}
