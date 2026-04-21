"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Plane } from "@react-three/drei"
import * as THREE from "three"

interface VisualInterferenceProps {
  intensity: number
}

export function VisualInterference({ intensity }: VisualInterferenceProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Shader pour l'effet d'interférence
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      
      // Effet de scan lines
      float scanline = sin(uv.y * 800.0) * 0.04;
      
      // Effet de bruit
      float noise = fract(sin(dot(uv.xy + time, vec2(12.9898, 78.233))) * 43758.5453);
      
      // Distorsion
      uv.x += sin(uv.y * 10.0 + time * 2.0) * intensity * 0.01;
      
      vec3 color = vec3(0.0, 1.0, 1.0) * intensity;
      color += scanline;
      color += noise * intensity * 0.1;
      
      gl_FragColor = vec4(color, intensity * 0.1);
    }
  `

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
      materialRef.current.uniforms.intensity.value = intensity
    }
  })

  return (
    <Plane args={[50, 50]} position={[0, 0, -10]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          time: { value: 0 },
          intensity: { value: intensity },
        }}
        transparent
        blending={THREE.AdditiveBlending}
      />
    </Plane>
  )
}
