'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface Props {
  logoMesh: THREE.Group;
  start:    THREE.Vector3;
  end:      THREE.Vector3;
  onArrive: () => void;
}

// Vecteur réutilisable — jamais alloué dans useFrame
const _lerp = new THREE.Vector3();

// Easing ease-in-out quadratique
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Calcule l'opacité : fade-in sur 0→0.4, plein sur 0.4→0.7, fade-out sur 0.7→1
function calcOpacity(t: number): number {
  if (t < 0.4) return t / 0.4;
  if (t < 0.7) return 1;
  return 1 - (t - 0.7) / 0.3;
}

export default function MiniLogoParticle({ logoMesh, start, end, onArrive }: Props) {
  const groupRef    = useRef<THREE.Group>(null);
  const progress    = useRef(0);
  // Vitesse initialisée une fois — stable entre les renders
  const speed       = useRef(0.008 + Math.random() * 0.016);
  const hasArrived  = useRef(false);
  // Cache des matériaux transparents — évite traverse() à chaque frame
  const fadeMats    = useRef<THREE.MeshStandardMaterial[]>([]);
  // Ref stable pour onArrive — évite la stale closure
  const onArriveRef = useRef(onArrive);
  useEffect(() => { onArriveRef.current = onArrive; }, [onArrive]);

  // Reset si start/end changent (réutilisation du composant)
  useEffect(() => {
    progress.current   = 0;
    hasArrived.current = false;
  }, [start, end]);

  // Clone du logo + cache des matériaux
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Dispose les anciens matériaux avant de vider le groupe
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ((child as THREE.Mesh).material as THREE.Material).dispose();
      }
    });
    group.clear();
    fadeMats.current = [];

    const clone = logoMesh.clone(true);
    clone.name  = 'MiniLogoParticleClone';

    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh     = child as THREE.Mesh;
      const mat      = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.transparent = true;
      mat.opacity     = 0;
      mat.depthWrite  = false;
      mesh.material   = mat;
      fadeMats.current.push(mat);
    });

    group.position.copy(start);
    group.add(clone);

    return () => {
      // Dispose au démontage
      fadeMats.current.forEach((m) => m.dispose());
      fadeMats.current = [];
      group.clear();
    };
  }, [logoMesh, start]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || hasArrived.current) return;

    // Delta-based speed — indépendant du framerate
    progress.current = Math.min(1, progress.current + speed.current * (delta * 60));

    const eased = easeInOut(progress.current);

    // Position : interpolation avec légère arc en Y
    _lerp.lerpVectors(start, end, eased);
    _lerp.y += Math.sin(progress.current * Math.PI) * 0.4; // arc parabolique
    group.position.copy(_lerp);

    // Opacité : fade-in puis fade-out
    const opacity = calcOpacity(progress.current);
    fadeMats.current.forEach((mat) => {
      mat.opacity = opacity;
    });

    if (progress.current >= 1) {
      hasArrived.current = true;
      onArriveRef.current();
    }
  });

  return <group ref={groupRef} />;
}