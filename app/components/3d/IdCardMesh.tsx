'use client';

import { useMemo, type ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// LA carte d'identité du site — pièce unique : clé d'entrée (hero) ET artefact
// final (fin de session). Géométrie, matériau, textes et LED partagés pour que
// la boucle narrative se lise : on termine sur l'objet exact du début.

export function makeCardMaterial() {
  // metalness modéré : lisible sous les point lights, sans HDRI (pas d'async → pas de "pop")
  return new THREE.MeshStandardMaterial({
    color: '#0a1a80', metalness: 0.55, roughness: 0.4,
    emissive: new THREE.Color('#0a1a66'), emissiveIntensity: 0,
  });
}

export default function IdCardMesh({
  material,
  nameText = 'ID: CHARLY MENTHILLER',
  nameColor = '#ffffff',
  onClick, onPointerOver, onPointerOut,
  children,
}: {
  material: THREE.Material;
  nameText?: string;   // le hero y injecte son glitch
  nameColor?: string;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  children?: ReactNode; // extras propres à chaque scène (barres glitch, scanline…)
}) {
  const tex = useLoader(THREE.TextureLoader, '/images/id_card.jpg');

  // contour découpé (encoches haut/bas) — mémoïsé : une seule géométrie par montage
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.75, -0.5); s.lineTo(-0.05, -0.5); s.lineTo(0, -0.45); s.lineTo(0.6, -0.45);
    s.lineTo(0.65, -0.5); s.lineTo(0.75, -0.5); s.lineTo(0.75, 0.5); s.lineTo(0.05, 0.5);
    s.lineTo(0, 0.45); s.lineTo(-0.6, 0.45); s.lineTo(-0.65, 0.5); s.lineTo(-0.75, 0.5); s.lineTo(-0.75, -0.5);
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  }, []);

  return (
    <>
      <mesh
        geometry={geometry}
        material={material}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />

      {/* dos imprimé (photo de la carte) */}
      <mesh position={[0, 0, -0.001]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={0.8} />
      </mesh>

      {/* LED d'état */}
      <mesh position={[0.68, 0.45, 0.022]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="lime" />
      </mesh>

      {/* identité (sans accents : troika rend mal les diacritiques) */}
      <Text fontSize={0.08} color={nameColor} position={[-0.68, 0.32, 0.022]} anchorX="left">{nameText}</Text>
      <Text fontSize={0.035} color="#aaaaaa" position={[-0.68, 0.17, 0.022]} anchorX="left">&gt; FULL STACK DEVELOPER</Text>
      <Text fontSize={0.03} color="#00ffcc" position={[-0.38, -0.25, 0.022]} anchorX="left">&gt; STATUS: AVAILABLE</Text>
      <Text fontSize={0.03} color="green" position={[-0.38, -0.35, 0.022]} anchorX="left">&gt; MODE: ALTERNANCE</Text>
      <Text fontSize={0.03} color="#ffff00" position={[0.10, -0.25, 0.022]} anchorX="left">&gt; LEVEL: BAC+5 ENG.</Text>
      <Text fontSize={0.03} color="#00ffff" position={[0.10, -0.35, 0.022]} anchorX="left">&gt; STACK: REACT / NODE</Text>
      <Text fontSize={0.025} color="#888" position={[0.30, 0.45, 0.022]} anchorX="left">ALTERNANCE 09/2026</Text>
      <Text fontSize={0.025} color="#888" position={[0.60, 0.45, -0.001]} anchorX="left" rotation={[0, Math.PI, 0]}>ALTERNANCE 09/2026</Text>
      <Text fontSize={0.025} color="#888" position={[-0.68, -0.48, 0.022]} anchorX="left">Polytech Marseille | CODA Avignon</Text>

      {children}
    </>
  );
}
