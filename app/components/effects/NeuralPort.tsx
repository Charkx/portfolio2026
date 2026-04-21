"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Cylinder, Sphere } from "@react-three/drei"
import type * as THREE from "three"

interface NeuralPortProps {
  position: [number, number, number]
  isActive: boolean
}

export function NeuralPort({ position, isActive }: NeuralPortProps) {
  const portRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    if (portRef.current) {
      // Pulsation quand actif
      if (isActive) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2
        portRef.current.scale.setScalar(scale)
      }
    }

    if (lightRef.current && isActive) {
      // Variation de l'intensité lumineuse
      lightRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3
    }
  })

  return (
    <group ref={portRef} position={position}>
      {/* Port principal */}
      <Cylinder args={[0.05, 0.03, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial
          color={isActive ? "#00ffff" : "#333333"}
          metalness={0.9}
          roughness={0.1}
          emissive={isActive ? "#00ffff" : "#000000"}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </Cylinder>

      {/* Connecteur interne */}
      <Sphere args={[0.02]} position={[0.05, 0, 0]}>
        <meshStandardMaterial
          color={isActive ? "#ffffff" : "#666666"}
          emissive={isActive ? "#ffffff" : "#000000"}
          emissiveIntensity={isActive ? 1 : 0}
        />
      </Sphere>

      {/* Lumière du port */}
      {isActive && <pointLight ref={lightRef} position={[0.1, 0, 0]} color="#00ffff" intensity={0.5} distance={0.5} />}

      {/* Effet de particules */}
      {isActive && (
        <Sphere args={[0.08]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#00ffff" transparent opacity={0.3} emissive="#00ffff" emissiveIntensity={0.2} />
        </Sphere>
      )}
    </group>
  )
}
