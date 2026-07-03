'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import IdCardMesh, { makeCardMaterial } from './IdCardMesh';

const clamp = THREE.MathUtils.clamp;

// Carte "artefact" de la fin de session — LA MÊME pièce que la carte du hero
// (IdCardMesh partagé), retrouvée éteinte puis réactivée par la scanline.
// La boucle est bouclée : le site commence et finit sur cet objet.
function CardModel() {
  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const sentAt = useRef<number | null>(null); // instant de l'envoi → animation finale
  const cardMat = useMemo(makeCardMaterial, []);

  useFrame((state) => {
    const g = group.current; if (!g) return;
    const store = useSceneStore.getState();
    const es = store.endSessionProgress ?? 0;
    const reveal = clamp((es - 0.85) / 0.15, 0, 1); // 0→1 : la carte se réactive
    const t = state.clock.elapsedTime;

    // animation finale (message envoyé) : un tour + pulse
    if (store.endSessionSent && sentAt.current === null) sentAt.current = t;
    let flip = 0, pulse = 0;
    if (sentAt.current !== null) {
      const e = clamp((t - sentAt.current) / 1.2, 0, 1);
      const ease = e * e * (3 - 2 * e);
      flip = ease * Math.PI * 2;
      pulse = Math.sin(e * Math.PI) * 0.12;
    }

    // flottement + légère inclinaison (+ flip final)
    g.rotation.y = -0.32 + Math.sin(t * 0.5) * 0.06 + flip;
    g.rotation.x = -0.12 + Math.cos(t * 0.4) * 0.04;
    g.position.y = Math.sin(t * 0.8) * 0.03;
    g.scale.setScalar(1.35 * (1 + pulse));

    // activation : émissif qui monte (même matériau que la carte du hero)
    cardMat.emissiveIntensity = reveal * 0.7;

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
      <IdCardMesh material={cardMat}>
        {/* scanline d'activation */}
        <mesh ref={scan} position={[0, 0.52, 0.024]}>
          <planeGeometry args={[1.6, 0.03]} />
          <meshBasicMaterial color="#7dffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </IdCardMesh>
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
        <CardModel />
      </Suspense>
    </Canvas>
  );
}
