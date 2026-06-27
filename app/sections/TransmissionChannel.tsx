'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROFILE } from '../utils/constants';
import { useInView } from '../hooks/useInView';

gsap.registerPlugin(ScrollTrigger);

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
  const { ref: canvasGateRef, inView: canvasInView } = useInView<HTMLDivElement>();
  const [terminalText, setTerminalText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Formulaire
  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');

  const fullText = `>> Uplink complete.
>> Profil compilé : Charly Menthiller — Développeur Full Stack.
>> Disponibilité : alternance, septembre 2026.
>> Canal de communication ouvert.`;

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
    }, 40);

    return () => clearInterval(timer);
  }, [fullText]);

  // Ouvre le client mail du visiteur, pré-rempli.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contact portfolio — ${name || 'message'}`);
    const body = encodeURIComponent(
      `${message}\n\n— ${name}${senderEmail ? ` (${senderEmail})` : ''}`
    );
    window.location.href = `mailto:${PROFILE.email}?subject=${subject}&body=${body}`;
  };

  const inputClass =
    'w-full bg-black/50 border border-cyan-400/30 rounded px-3 py-2 text-cyan-300 ' +
    'font-mono focus:border-cyan-400 focus:outline-none';

  return (
    <div
      id="contact"
      ref={sectionRef}
      className="min-h-screen flex items-center justify-center bg-black relative py-20 scroll-mt-20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20" />

      <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Colonne gauche : 3D + coordonnées directes */}
        <div className="flex flex-col gap-6">
          <div ref={canvasGateRef} className="h-72">
            {canvasInView && (
            <Canvas>
              <PerspectiveCamera makeDefault position={[0, 0, 6]} />
              <OrbitControls enableZoom={false} />
              <ambientLight intensity={0.3} />
              <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
              <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
              <CompleteModel />
            </Canvas>
            )}
          </div>

          <div className="border border-cyan-400/30 rounded bg-black/70 p-6 font-mono text-sm space-y-3">
            <div className="text-pink-400 mb-2">&gt;&gt; DIRECT CHANNELS</div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <a href={`mailto:${PROFILE.email}`} className="text-cyan-300 underline hover:text-cyan-100">
                {PROFILE.email}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <a href={`tel:${PROFILE.phone}`} className="text-cyan-300 underline hover:text-cyan-100">
                {PROFILE.phoneDisplay}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <a
                href={PROFILE.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 underline hover:text-cyan-100"
              >
                {PROFILE.githubLabel}
              </a>
            </div>
            <div className="text-gray-400 pt-2 border-t border-cyan-400/10">
              📍 {PROFILE.location}
            </div>
            <div className="text-green-300">⏳ {PROFILE.availability}</div>
          </div>
        </div>

        {/* Colonne droite : terminal + formulaire */}
        <div className="terminal-container">
          <h2 className="text-4xl font-bold text-cyan-400 mb-8 font-mono">
            TRANSMISSION CHANNEL
          </h2>

          <div className="border border-cyan-400/30 rounded bg-black/80 p-6 font-mono">
            <div className="text-cyan-300 text-sm mb-4 whitespace-pre-line">
              {terminalText}
            </div>

            {isComplete && (
              <div className="mt-6">
                <div className="text-pink-400 text-sm mb-4">
                  &gt;&gt; INTERFACE DE COMMUNICATION ACTIVE
                </div>

                <form className="space-y-4" onSubmit={handleSubmit} aria-label="Formulaire de contact">
                  <div>
                    <label htmlFor="contact-name" className="block text-cyan-300 text-sm mb-2">
                      SENDER_ID :
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="Votre nom..."
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-cyan-300 text-sm mb-2">
                      NEURAL_ADDRESS :
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className={inputClass}
                      placeholder="votre@email.com (optionnel)"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-cyan-300 text-sm mb-2">
                      MESSAGE_CONTENT :
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={`${inputClass} resize-none`}
                      placeholder="Votre message..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-cyan-900/50 hover:bg-cyan-900/70 border border-cyan-400/30
                               rounded px-4 py-2 text-cyan-300 font-mono transition-colors cursor-pointer"
                  >
                    &gt;&gt; INITIER LA TRANSMISSION
                  </button>

                  <p className="text-xs text-gray-500">
                    Ouvre votre messagerie pré-remplie. Ou écrivez directement à{' '}
                    <a href={`mailto:${PROFILE.email}`} className="text-cyan-400 underline">
                      {PROFILE.email}
                    </a>.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
