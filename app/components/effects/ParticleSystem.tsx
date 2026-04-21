"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Points, PointMaterial } from "@react-three/drei"
import type * as THREE from "three"

interface ParticleSystemProps {
  count: number
  interferenceLevel: number
  position?: [number, number, number]
}

export function ParticleSystem({ count, interferenceLevel, position = [0, 0, 0] }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)

  // Génération des positions des particules
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }

    return positions
  }, [count])

  // Animation des particules
  useFrame((state) => {
    if (!pointsRef.current) return

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Mouvement flottant
      positions[i3] += Math.sin(state.clock.elapsedTime + i) * 0.001
      positions[i3 + 1] += Math.cos(state.clock.elapsedTime + i) * 0.001
      positions[i3 + 2] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.001

      // Effet d'interférence
      if (interferenceLevel > 0.5) {
        positions[i3] += (Math.random() - 0.5) * interferenceLevel * 0.1
        positions[i3 + 1] += (Math.random() - 0.5) * interferenceLevel * 0.1
        positions[i3 + 2] += (Math.random() - 0.5) * interferenceLevel * 0.1
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group position={position}>
      <Points ref={pointsRef} positions={particlePositions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#00ffff"
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
    </group>
  )
}
