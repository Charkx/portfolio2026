import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

gsap.registerPlugin(ScrollTrigger);

const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"

const CyberpunkIDCard: React.FC<{ onScanTrigger: () => void }> = ({ onScanTrigger }) => {
  const cardRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [glitchText, setGlitchText] = useState("ID: CHARLY MENTHILLER")
  const [glitchActive, setGlitchActive] = useState(false)
  const backgroundTexture = useLoader(THREE.TextureLoader, '/images/id_card.png');

  useCursor(hovered);

  // Glitch loop effect for the name
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true)
      let glitched = ""
      const baseText = "ID: CHARLY MENTHILLER"

      for (let i = 0; i < baseText.length; i++) {
        if (Math.random() < 0.2) {
          glitched += glitchChars[Math.floor(Math.random() * glitchChars.length)]
        } else {
          glitched += baseText[i]
        }
      }

      setGlitchText(glitched)

      setTimeout(() => {
        setGlitchText("ID: CHARLY MENTHILLER")
        setGlitchActive(false)
      }, 120)
    }, 2800)

    return () => clearInterval(interval)
  }, [])

  // Custom polygon shape for the card outline
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

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: false,
  });

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
      x: 1.1,
      y: 1.1,
      z: 1.1,
      yoyo: true,
      repeat: 1,
      duration: 1,
      ease: 'sine.inOut',
    });

    setTimeout(() => {
      onScanTrigger();
      setIsScanning(false);
    }, 2000);
  };

  return (
    <group ref={cardRef} position={[0, 0, 0]}>

      {/* Card Body */}
      <mesh
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#0000FF" metalness={0.9} roughness={0.25} />
      </mesh>

      <mesh position={[0, 0, -0.001]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshBasicMaterial map={backgroundTexture} toneMapped={false} transparent opacity={0.8}/>
      </mesh>

      {/* Pulsing overlay for glitch */}
      {glitchActive && (
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[1.5, 0.9]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.01} />
        </mesh>
      )}

      {/* Glitch bar stack */}
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

      {/* Circuits lumineux (fins rectangles lumineux) */}
      {/* {[...Array(5)].map((_, i) => (
        <mesh key={`circuit-light-${i}`} position={[-0.5 + i * 0.25, -0.3, 0.021]}>
          <boxGeometry args={[0.2, 0.005, 0.002]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      ))} */}

      {/* Puces RAM stylisées */}
      {/* {[...Array(3)].map((_, i) => (
        <group key={`ram-chip-${i}`} position={[-0.6 + i * 0.5, -0.15, 0.03]}> */}
          {/* Corps principal */}
          {/* <mesh>
            <boxGeometry args={[0.15, 0.07, 0.01]} />
            <meshStandardMaterial color="#0ff" metalness={0.7} roughness={0.3} />
          </mesh> */}

          {/* Broches supérieures */}
          {/* {[...Array(4)].map((_, j) => (
            <mesh key={`pin-top-${j}`} position={[-0.09 + j * 0.06, 0.045, 0.008]}>
              <boxGeometry args={[0.01, 0.005, 0.005]} />
              <meshStandardMaterial color="#00ffff" />
            </mesh>
          ))} */}

          {/* Broches inférieures */}
          {/* {[...Array(4)].map((_, j) => (
            <mesh key={`pin-bottom-${j}`} position={[-0.09 + j * 0.06, -0.045, 0.008]}>
              <boxGeometry args={[0.01, 0.005, 0.005]} />
              <meshStandardMaterial color="#00ffff" />
            </mesh>
          ))}
        </group>
      ))} */}

      {/* Petite LED lumineuse */}
      <mesh position={[0.68, 0.45, 0.0105]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="lime" />
      </mesh>

      {/* Modules additionnels: petits rectangles en relief (type condensateurs) */}
      {/* {[...Array(4)].map((_, i) => (
        <mesh key={`module-${i}`} position={[-0.25 + i * 0.2, 0.35 - i * 0.05, 0.03]}>
          <boxGeometry args={[0.1, 0.04, 0.012]} />
          <meshStandardMaterial color="#004466" metalness={0.8} roughness={0.15} />
        </mesh>
      ))} */}

      {/* Circuits imprimés (pistes en relief) */}
      {/* {[...Array(7)].map((_, i) => (
        <mesh key={`circuit-track-${i}`} position={[-0.7 + i * 0.22, -0.1 + (i % 2) * 0.05, 0.022]}>
          <boxGeometry args={[0.18, 0.008, 0.002]} />
          <meshBasicMaterial color="#0ff" />
        </mesh>
      ))} */}

      {/* Decorative line blocks */}
      {/* {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`decor-line-${i}`} position={[-0.75 + i * 0.1, -0.42, 0.021]}>
          <boxGeometry args={[0.07, 0.02, 0.005]} />
          <meshStandardMaterial color="black" />
        </mesh>
      ))} */}

      {/* Texte glitch */}
      <Text
        fontSize={0.08}
        color={glitchActive ? "red" : "#ffffff"}
        position={[-0.68, 0.32, 0.021]}
        anchorX="left"
        
      >
        {glitchText}
      </Text>

      {/* Infos statiques type HUD */}
      <Text fontSize={0.035} color="#aaaaaa" position={[-0.68, 0.17, 0.021]} anchorX="left">
        &gt; SOFTWARE ENGINEER & CREATIVE DEVELOPER
      </Text>
      <Text fontSize={0.03} color="#00ffcc" position={[-0.38, -0.25, 0.021]} anchorX="left">
        &gt; STATUS: ONLINE
      </Text>
      <Text fontSize={0.03} color="green" position={[-0.38, -0.35, 0.021]} anchorX="left">
        &gt; STATUS: ONLINE
      </Text>
      <Text fontSize={0.03} color="#ffff00" position={[0.10, -0.25, 0.021]} anchorX="left">
        &gt; SECURITY: LEVEL 9
      </Text>
      <Text fontSize={0.03} color="#ff0000" position={[0.10, -0.35, 0.021]} anchorX="left">
        &gt; THREAT: MAXIMUM
      </Text>
      <Text fontSize={0.025} color="#888" position={[0.30, 0.45, 0.021]} anchorX="left">
        AVAIBLE TO WORK NOW
      </Text>
       <Text fontSize={0.025} color="#888" position={[0.60, 0.45, -0.001]} anchorX="left" rotation={[0, Math.PI, 0]}>
        AVAIBLE TO WORK NOW
      </Text>
      <Text fontSize={0.025} color="#888" position={[-0.68, -0.48, 0.021]} anchorX="left">
        Night City Protocols | Sector 7G
      </Text>
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
            <ambientLight intensity={0.2} />
            <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
            <pointLight position={[0, 0, 10]} intensity={0.8} color="#ffffff" />
            
            <CyberpunkIDCard onScanTrigger={() => {
              onScan();
            }} />

            {/* 🌟 Effet Bloom */}
            <EffectComposer>
              <Bloom
                intensity={0.6}        // intensité du bloom
                luminanceThreshold={0} // seuil de luminosité pour déclencher l’effet
                luminanceSmoothing={0.9} // adoucissement
                mipmapBlur
              />
            </EffectComposer>
          </Canvas>
  );
};

