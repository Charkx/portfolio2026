'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const Head: React.FC<{ activeColor: string }> = ({ activeColor }) => {
  const scanLineRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const progressRef = useRef(0);
  const isAnimatingRef = useRef(true);

  // Reset animation when color changes
  useEffect(() => {
    progressRef.current = -2; // start above the head
    isAnimatingRef.current = true;
  }, [activeColor]);

  const scanMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(activeColor),
    emissive: new THREE.Color(activeColor),
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.7,
  }), [activeColor]);

  const sphereMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#00ffff',
      emissive: '#00ffff',
      emissiveIntensity: 0.5,
      transparent: true,
      wireframe: true,
      opacity: 0.6,
      roughness: 0.2,
      metalness: 0.5,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
  }, [clippingPlane]);

  const scanGeometry = useMemo(() => new THREE.PlaneGeometry(4, 0.1), []);

  useFrame((state, delta) => {

    const scanY = Math.sin(state.clock.elapsedTime * 2) * 2;

    if (scanLineRef.current) {
      scanLineRef.current.position.y = scanY;
      const material = scanLineRef.current.material as THREE.Material & { opacity: number };
      material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.3;
    }

    if (!isAnimatingRef.current) return;

    progressRef.current += delta * 2; // scan speed

    const y = progressRef.current;
        if (scanLineRef.current) {
      scanLineRef.current.position.y = y;
      const material = scanLineRef.current.material as THREE.Material & { opacity: number };
      material.opacity = 0.5; // fixed opacity during scan
    }

    if (headRef.current) {
      headRef.current.rotation.y += 0.003;
      clippingPlane.constant = y;
    }

    // Stop animation when the scan reaches the bottom
    if (y >= 2) {
      isAnimatingRef.current = false;
    }
  });

  return (
    <group>
      <mesh ref={headRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <primitive object={sphereMaterial} attach="material" />
      </mesh>

      <mesh ref={scanLineRef} geometry={scanGeometry} material={scanMaterial} />
    </group>
  );
};

export default function CognitiveProfile({ activeColor }: { activeColor: string }) {
  return (
    <div className="h-[80vh] w-full">
      <Canvas gl={{ localClippingEnabled: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />
        <OrbitControls enableZoom={false} />
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
        <Head key={activeColor} activeColor={activeColor} />
      </Canvas>
    </div>
  );
}

