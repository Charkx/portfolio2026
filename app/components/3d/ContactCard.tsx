'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

const clamp = THREE.MathUtils.clamp;

// Carte d'identité "artefact" — état éteint → lumineux via une scanline (piloté par endSessionProgress).
function CardModel() {
  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const sentAt = useRef<number | null>(null); // instant de l'envoi → animation finale
  const tex = useLoader(THREE.TextureLoader, '/images/id_card.png');

  // même contour découpé que la carte du hero
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.75, -0.5); s.lineTo(-0.05, -0.5); s.lineTo(0, -0.45); s.lineTo(0.6, -0.45);
    s.lineTo(0.65, -0.5); s.lineTo(0.75, -0.5); s.lineTo(0.75, 0.5); s.lineTo(0.05, 0.5);
    s.lineTo(0, 0.45); s.lineTo(-0.6, 0.45); s.lineTo(-0.65, 0.5); s.lineTo(-0.75, 0.5); s.lineTo(-0.75, -0.5);
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  }, []);

  // metalness modéré : la carte reste éclairée par les point lights sans HDRI (pas d'async → pas de "pop")
  const cardMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0a1a80', metalness: 0.55, roughness: 0.4, emissive: new THREE.Color('#0a1a66'), emissiveIntensity: 0 }),
    []
  );

  useFrame((state) => {
    const g = group.current; if (!g) return;
    const store = useSceneStore.getState();
    const es = store.endSessionProgress ?? 0;
    const reveal = clamp((es - 0.85) / 0.15, 0, 1); // 0→1 : la carte s'active
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

    // activation : émissif qui monte
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
      <mesh geometry={geometry} material={cardMat} />
      {/* face imprimée */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      {/* scanline d'activation */}
      <mesh ref={scan} position={[0, 0.52, 0.022]}>
        <planeGeometry args={[1.6, 0.03]} />
        <meshBasicMaterial color="#7dffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* LED */}
      <mesh position={[0.68, 0.45, 0.022]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="lime" />
      </mesh>
      {/* textes identité */}
      <Text fontSize={0.075} color="#ffffff" position={[-0.68, 0.30, 0.022]} anchorX="left">ID: CHARLY MENTHILLER</Text>
      <Text fontSize={0.033} color="#aaaaaa" position={[-0.68, 0.16, 0.022]} anchorX="left">&gt; FULL STACK DEVELOPER</Text>
      <Text fontSize={0.03} color="#00ffcc" position={[-0.38, -0.26, 0.022]} anchorX="left">&gt; STATUS: AVAILABLE</Text>
      <Text fontSize={0.03} color="#66ff88" position={[-0.38, -0.35, 0.022]} anchorX="left">&gt; MODE: ALTERNANCE</Text>
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
