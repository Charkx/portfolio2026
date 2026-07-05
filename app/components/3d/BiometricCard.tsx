'use client';

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, useCursor, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useSceneStore } from '../../store/sceneStore';
import { audioEngine } from '../../lib/audioEngine';
import { downloadVCard } from '../../lib/vcard';

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
      {/* caméra rapprochée : la carte est LE composant principal de l'entrée */}
      <PerspectiveCamera makeDefault position={[0, 0, 1.55]} />
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

// --- Carte de FIN DE SESSION : LE MÊME visuel (IDCardVisual), retrouvé puis révélé
// par une scanline. Un seul composant carte dans tout le site (pas de doublon).
// Interaction : on l'attrape à la souris pour la retourner ; le dos propose de
// l'ajouter à ses contacts (vCard) au clic. ---
const clampF = THREE.MathUtils.clamp;

// QR décoratif (non scannable — juste l'esthétique data-matrix du dos)
const QR = ['1111011', '1001001', '1011101', '1000101', '1011001', '1001011', '1111110'];
function QrChip() {
  const N = 7, cell = 0.05;
  const out: React.ReactElement[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (QR[r][c] !== '1') continue;
    out.push(
      <mesh key={`${r}-${c}`} position={[(c - (N - 1) / 2) * cell, ((N - 1) / 2 - r) * cell + 0.12, 0]}>
        <planeGeometry args={[cell * 0.85, cell * 0.85]} />
        <meshBasicMaterial color="#aef6ff" />
      </mesh>,
    );
  }
  return <group>{out}</group>;
}

function FinaleCardModel() {
  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const backRef = useRef<THREE.Group>(null); // dos "prends ma carte"
  const sentAt = useRef<number | null>(null); // instant de l'envoi → animation finale
  const takenAt = useRef<number | null>(null); // instant du "carte prise" (pulse)
  const drag = useRef({ active: false, lastX: 0, rotY: 0, vel: 0, moved: 0 });
  const [hover, setHover] = useState(false);
  useCursor(hover, 'grab');

  // le pointeur peut sortir de la carte pendant le drag → on écoute la fenêtre
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.lastX;
      drag.current.lastX = e.clientX;
      drag.current.rotY += dx * 0.012;
      drag.current.vel = dx * 0.012;
      drag.current.moved += Math.abs(dx);
    };
    const onUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      document.body.style.cursor = '';
      // clic (peu de déplacement) alors que le DOS fait face → prendre la carte (vCard)
      const showingBack = Math.cos(-0.32 + drag.current.rotY) < -0.3;
      if (drag.current.moved < 6 && showingBack) {
        downloadVCard();
        audioEngine.play('success');
        takenAt.current = performance.now() / 1000;
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, []);

  useFrame((state) => {
    const g = group.current; if (!g) return;
    const store = useSceneStore.getState();
    const es = store.endSessionProgress ?? 0;
    const reveal = clampF((es - 0.85) / 0.15, 0, 1); // 0→1 : la carte se matérialise
    const t = state.clock.elapsedTime;

    g.visible = reveal > 0.02; // la carte n'apparaît qu'avec la scanline

    // animation finale (message envoyé) : un tour + pulse
    if (store.endSessionSent && sentAt.current === null) sentAt.current = t;
    let flip = 0, pulse = 0;
    if (sentAt.current !== null) {
      const e = clampF((t - sentAt.current) / 1.2, 0, 1);
      const ease = e * e * (3 - 2 * e);
      flip = ease * Math.PI * 2;
      pulse = Math.sin(e * Math.PI) * 0.12;
    }

    // inertie du drag (friction quand on ne tient plus la carte)
    if (!drag.current.active) { drag.current.rotY += drag.current.vel; drag.current.vel *= 0.9; }
    const idle = drag.current.active ? 0 : 1; // pas de flottement pendant qu'on tient la carte

    // flottement + inclinaison (+ flip envoi + rotation manuelle du drag)
    g.rotation.y = -0.32 + Math.sin(t * 0.5) * 0.06 * idle + flip + drag.current.rotY;
    g.rotation.x = -0.12 + Math.cos(t * 0.4) * 0.04 * idle;
    g.position.y = Math.sin(t * 0.8) * 0.03 * idle;

    // pulse "carte prise" (confirmation vCard)
    let takePulse = 0;
    if (takenAt.current !== null) {
      const e = clampF(performance.now() / 1000 - takenAt.current, 0, 1) / 0.6;
      takePulse = Math.sin(clampF(e, 0, 1) * Math.PI) * 0.1;
      if (e >= 1) takenAt.current = null;
    }
    g.scale.setScalar(1.35 * (0.94 + reveal * 0.06) * (1 + pulse + takePulse));

    // dos "prends ma carte" : visible seulement quand le dos fait face à la caméra
    if (backRef.current) backRef.current.visible = Math.cos(g.rotation.y) < -0.15;

    // scanline qui traverse la carte une fois
    if (scan.current) {
      const on = reveal > 0.02 && reveal < 0.98;
      scan.current.visible = on;
      scan.current.position.y = THREE.MathUtils.lerp(0.52, -0.52, reveal);
      (scan.current.material as THREE.MeshBasicMaterial).opacity = on ? 0.8 : 0;
    }
  });

  return (
    <group>
      {/* zone d'interaction FIXE (ne tourne pas) : capte le drag partout devant la carte */}
      <mesh
        position={[0, 0, 2]}
        onPointerDown={(e) => {
          e.stopPropagation();
          drag.current.active = true;
          drag.current.lastX = e.clientX;
          drag.current.vel = 0;
          drag.current.moved = 0;
          document.body.style.cursor = 'grabbing';
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={group} scale={1.35}>
        <IDCardVisual>
          {/* scanline d'activation */}
          <mesh ref={scan} position={[0, 0.52, 0.024]}>
            <planeGeometry args={[1.6, 0.03]} />
            <meshBasicMaterial color="#7dffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* DOS : "prends ma carte" (QR décoratif + libellé), face arrière */}
          <group ref={backRef} rotation={[0, Math.PI, 0]} position={[0, 0, -0.03]} visible={false}>
            <QrChip />
            <Text position={[0, -0.2, 0]} fontSize={0.07} color="#7dffff" anchorX="center" anchorY="middle">
              AJOUTER A MES CONTACTS
            </Text>
            <Text position={[0, -0.3, 0]} fontSize={0.035} color="#88aacc" anchorX="center" anchorY="middle">
              cliquer la carte
            </Text>
          </group>
        </IDCardVisual>
      </group>
    </group>
  );
}

// Canvas de la carte de fin de session (utilisé par ContactSection).
export function ContactCard() {
  return (
    <Canvas gl={{ antialias: true, alpha: true }}>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={40} />
      <ambientLight intensity={0.9} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
      <pointLight position={[0, 0, 10]} intensity={0.8} color="#ffffff" />
      <Suspense fallback={null}>
        <Environment preset="night" />
        <FinaleCardModel />
      </Suspense>
    </Canvas>
  );
}
