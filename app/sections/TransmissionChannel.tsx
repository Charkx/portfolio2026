import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const CompleteModel: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central core */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Orbiting elements */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 2;
        const z = Math.sin(angle) * 2;
        
        return (
          <mesh key={i} position={[x, 0, z]}>
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default function TransmissionChannel() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [terminalText, setTerminalText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const fullText = `>> Uplink complete.
>> Neural scan data compiled.
>> Subject: CHARLY_MK1
>> Status: READY FOR TRANSMISSION
>> Awaiting communication protocols...`;

  const displayText = fullText.replace(/>/g, '&gt;');

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top center',
        end: 'bottom center',
        scrub: true,
      },
    });

    tl.from('.terminal-container', {
      opacity: 0,
      y: 50,
      duration: 1,
    });

    // Typewriter effect
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setTerminalText(fullText.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={sectionRef} className="min-h-screen flex items-center justify-center bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20"></div>
      
      <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="h-96">
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 0, 6]} />
            <OrbitControls enableZoom={false} />
            <ambientLight intensity={0.3} />
            <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
            <CompleteModel />
          </Canvas>
        </div>
        
        <div className="terminal-container">
          <h2 className="text-4xl font-bold text-cyan-400 mb-8 font-mono">
            TRANSMISSION CHANNEL
          </h2>
          
          <div className="border border-cyan-400/30 rounded bg-black/80 p-6 font-mono">
            <div className="text-cyan-300 text-sm mb-4 whitespace-pre-line">
              <div dangerouslySetInnerHTML={{ __html: terminalText.replace(/>/g, '&gt;') }} />
            </div>
            
            {isComplete && (
              <div className="mt-6">
                <div className="text-pink-400 text-sm mb-4">
                  &gt;&gt; COMMUNICATION INTERFACE ACTIVE
                </div>
                
                <form className="space-y-4">
                  <div>
                    <label className="block text-cyan-300 text-sm mb-2">
                      SENDER_ID:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-black/50 border border-cyan-400/30 rounded px-3 py-2 text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none"
                      placeholder="Enter identification..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-cyan-300 text-sm mb-2">
                      MESSAGE_CONTENT:
                    </label>
                    <textarea
                      rows={4}
                      className="w-full bg-black/50 border border-cyan-400/30 rounded px-3 py-2 text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none resize-none"
                      placeholder="Compose transmission..."
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-cyan-900/50 hover:bg-cyan-900/70 border border-cyan-400/30 rounded px-4 py-2 text-cyan-300 font-mono transition-colors"
                  >
                    &gt;&gt; INITIATE TRANSMISSION
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

