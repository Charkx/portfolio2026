'use client';

import { useEffect, useRef, useState } from 'react';
import MiniLogoParticle from './MiniLogoParticule';
import type { TechItem } from '@/app/utils/types';
import * as THREE from 'three';

interface Props {
  tech:           TechItem;
  origin:         THREE.Vector3;
  target:         THREE.Vector3;
  logoMesh:       THREE.Group;
  particleCount?: number;
  onAllArrived?:  () => void;
}

// Délai entre chaque particule (ms) — évite le spike visuel d'un lancement simultané
const STAGGER_MS = 80;

export default function MiniLogoParticlesManager({
  tech,
  origin,
  target,
  logoMesh,
  particleCount = 10,
  onAllArrived,
}: Props) {
  const [activeKeys, setActiveKeys]   = useState<string[]>([]);
  const arrivedCount                  = useRef(0);
  const isMounted                     = useRef(true);
  const timersRef                     = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Refs stables pour les callbacks — évite les stale closures
  const particleCountRef  = useRef(particleCount);
  const onAllArrivedRef   = useRef(onAllArrived);
  useEffect(() => { particleCountRef.current = particleCount; }, [particleCount]);
  useEffect(() => { onAllArrivedRef.current  = onAllArrived;  }, [onAllArrived]);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Lancement des particules avec stagger
  useEffect(() => {
    arrivedCount.current = 0;

    // Annule les timers d'un lancement précédent si la target change
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const keys: string[] = [];

    for (let i = 0; i < particleCount; i++) {
      const key = `${tech.name}-${i}-${Date.now()}`;
      keys.push(key);

      const timer = setTimeout(() => {
        if (!isMounted.current) return;
        setActiveKeys((prev) => [...prev, key]);
      }, i * STAGGER_MS);

      timersRef.current.push(timer);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setActiveKeys([]);
      arrivedCount.current = 0;
    };
  }, [target, tech.name, particleCount]);

  const handleArrival = () => {
    arrivedCount.current += 1;
    if (arrivedCount.current >= particleCountRef.current) {
      onAllArrivedRef.current?.();
    }
  };

  return (
    <>
      {activeKeys.map((key) => (
        <MiniLogoParticle
          key={key}
          logoMesh={logoMesh}
          start={origin}
          end={target}
          onArrive={handleArrival}
        />
      ))}
    </>
  );
}