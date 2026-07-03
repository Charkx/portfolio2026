'use client';

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, useCursor, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const BASE_TEXT = "ID: CHARLY MENTHILLER";

/**
 * Visuel de LA carte d'identité — partagé entre le hero (clé d'entrée du site)
 * et la fin de session (artefact retrouvé) : un seul composant 3D, pas de doublon.
 * Les interactions (scan au clic, révélation scanline) restent chez les parents.
 */
export function IDCardVisual({ onClick, onPointerOver, onPointerOut, children }: {
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  children?: React.ReactNode;
}) {
  const [glitchText, setGlitchText] = useState(BASE_TEXT);
  const [glitchActive, setGlitchActive] = useState(false);
  const backgroundTexture = useLoader(THREE.TextureLoader, '/images/id_card.jpg');

  // Glitch périodique du nom
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      let glitched = "";
      for (let i = 0; i < BASE_TEXT.length; i++) {
        glitched += Math.random() < 0.2
          ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
          : BASE_TEXT[i];
      }
      setGlitchText(glitched);
      setTimeout(() => { setGlitchText(BASE_TEXT); setGlitchActive(false); }, 120);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Contour de carte à coins crantés.
  // Mémoïsé : sinon une nouvelle géométrie est créée à CHAQUE rendu (glitch,
  // chargement de texture…) sans libérer l'ancienne → fuite mémoire GPU →
  // perte du contexte WebGL → canvas blanc.
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.75, -0.5);
    shape.lineTo(-0.05, -0.5);
    shape.lineTo(0, -0.45);
    shape.lineTo(0.60, -0.45);
    shape.lineTo(0.65, -0.5);
    shape.lineTo(0.75, -0.5);
    shape.lineTo(0.75, 0.5);
    shape.lineTo(0.05, 0.5);
    shape.lineTo(0, 0.45);
    shape.lineTo(-0.60, 0.45);
    shape.lineTo(-0.65, 0.5);
    shape.lineTo(-0.75, 0.5);
    shape.lineTo(-0.75, -0.5);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  }, []);

  return (
    <group>
      {/* Corps de la carte */}
      <mesh onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut} castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#0000FF" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Photo au dos */}
      <mesh position={[0, 0, -0.001]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshBasicMaterial map={backgroundTexture} toneMapped={false} transparent opacity={0.8} />
      </mesh>

      {/* Voile magenta pendant le glitch */}
      {glitchActive && (
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[1.5, 0.9]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.01} />
        </mesh>
      )}

      {/* Code-barres */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          position={[-0.6 + i * 0.06, -0.05, 0.0215]}
          scale={[1, Math.random() > 0.5 ? 1 : 0.6, 1]}
        >
          <boxGeometry args={[0.02, 0.15, 0.002]} />
          <meshBasicMaterial color={glitchActive ? "#00ffff" : "#ffffff"} />
        </mesh>
      ))}

      {/* LED d'activité */}
      <mesh position={[0.68, 0.45, 0.0105]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="lime" />
      </mesh>

      {/* Texte glitch */}
      <Text fontSize={0.08} color={glitchActive ? "red" : "#ffffff"} position={[-0.68, 0.32, 0.021]} anchorX="left">
        {glitchText}
      </Text>

      {/* Infos statiques type HUD — identité réelle (sans accents : troika rend mal) */}
      <Text fontSize={0.035} color="#aaaaaa" position={[-0.68, 0.17, 0.021]} anchorX="left">
        &gt; FULL STACK DEVELOPER
      </Text>
      <Text fontSize={0.03} color="#00ffcc" position={[-0.38, -0.25, 0.021]} anchorX="left">
        &gt; STATUS: AVAILABLE
      </Text>
      <Text fontSize={0.03} color="green" position={[-0.38, -0.35, 0.021]} anchorX="left">
        &gt; MODE: ALTERNANCE
      </Text>
      <Text fontSize={0.03} color="#ffff00" position={[0.10, -0.25, 0.021]} anchorX="left">
        &gt; LEVEL: BAC+5 ENG.
      </Text>
      <Text fontSize={0.03} color="#00ffff" position={[0.10, -0.35, 0.021]} anchorX="left">
        &gt; STACK: REACT / NODE
      </Text>
      <Text fontSize={0.025} color="#888" position={[0.30, 0.45, 0.021]} anchorX="left">
        ALTERNANCE 09/2026
      </Text>
      <Text fontSize={0.025} color="#888" position={[0.60, 0.45, -0.001]} anchorX="left" rotation={[0, Math.PI, 0]}>
        ALTERNANCE 09/2026
      </Text>
      <Text fontSize={0.025} color="#888" position={[-0.68, -0.48, 0.021]} anchorX="left">
        Polytech Marseille | CODA Avignon
      </Text>

      {children}
    </group>
  );
}

// Carte du hero : flottement + scan au clic (tour complet → déverrouille le site)
const CyberpunkIDCard: React.FC<{ onScanTrigger: () => void }> = ({ onScanTrigger }) => {
  const cardRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useCursor(hovered);

  useFrame((state) => {
    if (cardRef.current && !isScanning) {
      cardRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      cardRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  const handleClick = () => {
    if (isScanning) return;
    setIsScanning(true);

    gsap.to(cardRef.current!.rotation, {
      y: Math.PI * 2,
      duration: 1.5,
      ease: 'power2.inOut',
    });

    gsap.to(cardRef.current!.scale, {
      x: 1.1, y: 1.1, z: 1.1,
      yoyo: true, repeat: 1,
      duration: 1,
      ease: 'sine.inOut',
    });

    setTimeout(() => {
      onScanTrigger();
      setIsScanning(false);
    }, 2000);
  };

  return (
    <group ref={cardRef}>
      <IDCardVisual
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
};

interface BiometricCardProps {
  onScan: () => void;
}

export default function BiometricCard({ onScan }: BiometricCardProps) {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 0, 2]} />
      <OrbitControls enableZoom={false} enablePan={false} />
      <ambientLight intensity={0.9} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
      <pointLight position={[0, 0, 10]} intensity={0.8} color="#ffffff" />

      {/* Suspense interne : le chargement de texture (useLoader) est contenu
          ICI, sans faire démonter/remonter tout le Canvas. */}
      <Suspense fallback={null}>
        <Environment preset="night" />
        <CyberpunkIDCard onScanTrigger={onScan} />
      </Suspense>
    </Canvas>
  );
}
