import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import IdCardMesh, { makeCardMaterial } from './IdCardMesh';

const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

// Carte biométrique du hero — clé d'entrée du site. Le mesh/matériau/textes
// viennent d'IdCardMesh (partagé avec la carte finale de la fin de session)
// pour que la boucle narrative se lise : on termine sur l'objet du début.
const CyberpunkIDCard: React.FC<{ onScanTrigger: () => void }> = ({ onScanTrigger }) => {
  const cardRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [glitchText, setGlitchText] = useState('ID: CHARLY MENTHILLER');
  const [glitchActive, setGlitchActive] = useState(false);

  useCursor(hovered);

  // carte "allumée" : c'est la clé active du site
  const material = useMemo(() => {
    const m = makeCardMaterial();
    m.emissiveIntensity = 0.5;
    return m;
  }, []);

  // glitch périodique du nom
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      const baseText = 'ID: CHARLY MENTHILLER';
      let glitched = '';
      for (let i = 0; i < baseText.length; i++) {
        glitched += Math.random() < 0.2
          ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
          : baseText[i];
      }
      setGlitchText(glitched);
      setTimeout(() => { setGlitchText(baseText); setGlitchActive(false); }, 120);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    if (cardRef.current && !isScanning) {
      cardRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      cardRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  const handleClick = () => {
    if (isScanning) return;
    setIsScanning(true);

    gsap.to(cardRef.current!.rotation, { y: Math.PI * 2, duration: 1.5, ease: 'power2.inOut' });
    gsap.to(cardRef.current!.scale, {
      x: 1.1, y: 1.1, z: 1.1,
      yoyo: true, repeat: 1, duration: 1, ease: 'sine.inOut',
    });

    setTimeout(() => { onScanTrigger(); setIsScanning(false); }, 2000);
  };

  return (
    <group ref={cardRef} position={[0, 0, 0]}>
      <IdCardMesh
        material={material}
        nameText={glitchText}
        nameColor={glitchActive ? 'red' : '#ffffff'}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* voile magenta pendant le glitch */}
        {glitchActive && (
          <mesh position={[0, 0, 0.021]}>
            <planeGeometry args={[1.5, 0.9]} />
            <meshBasicMaterial color="#ff00ff" transparent opacity={0.01} />
          </mesh>
        )}

        {/* code-barres glitché */}
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh
            key={i}
            position={[-0.6 + i * 0.06, -0.05, 0.0215]}
            scale={[1, Math.random() > 0.5 ? 1 : 0.6, 1]}
          >
            <boxGeometry args={[0.02, 0.15, 0.002]} />
            <meshBasicMaterial color={glitchActive ? '#00ffff' : '#ffffff'} />
          </mesh>
        ))}
      </IdCardMesh>
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
        <CyberpunkIDCard onScanTrigger={onScan} />
      </Suspense>
    </Canvas>
  );
}
