'use client';

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, useCursor, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useSceneStore } from '../../store/sceneStore';

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
// Elle COMMUNIQUE : son code-barres central se décode en messages au survol des
// coordonnées et selon le formulaire ; on peut aussi l'attraper pour l'inspecter. ---
const clampF = THREE.MathUtils.clamp;

// messages décodés + couleur selon le canal survolé (mêmes teintes que les coordonnées)
const CH_MSG: Record<string, string> = { email: 'WRITE ME', github: 'SEE MY CODE', linkedin: "LET'S CONNECT", cv: 'CHECK MY CV' };
const CH_COL: Record<string, string> = { email: '#22d3ee', github: '#c084fc', linkedin: '#38bdf8', cv: '#f472b6' };
const GLITCH_CH = '!<>-_\\/[]{}=+*^?#01ABCXYZ';
const IDLE_SPEAK = true; // la carte "parle" au repos de temps en temps (mettre false pour couper)
const IDLE_MSGS = ['OPEN TO WORK', 'AVAILABLE 09/2026']; // messages au repos (alternent)

// Message décodé sur le code-barres (au centre de la carte). Lit le store chaque frame :
// survol coordonnée > formulaire envoyé > progression formulaire > mot au repos.
function CardMessage() {
  const [txt, setTxt] = useState('');
  const [op, setOp] = useState(0);
  const [col, setCol] = useState('#7dffff');
  const s = useRef({ target: '', glitch: 0, amt: 0, colTarget: '#7dffff', clock: 0, idleNext: 7 + Math.random() * 8, idleUntil: 0, idleMsg: IDLE_MSGS[0] });
  const last = useRef({ txt: '', op: -1, col: '' });

  useFrame((_, dt) => {
    const store = useSceneStore.getState();
    const st = s.current;
    st.clock += dt;
    const hovered = store.contactIdHovered;
    const fill = store.contactFill ?? 0;
    const sent = store.endSessionSent;

    // message cible + couleur (priorité : envoyé > survol > formulaire > repos)
    let msg = '', c = '#7dffff';
    // envoyé → alterne le "merci" et le rappel de dispo (argument alternance)
    if (sent) { msg = (Math.floor(st.clock / 2.8) % 2 === 0) ? "LET'S WORK TOGETHER" : 'AVAILABLE 09/2026'; c = '#4ade80'; }
    else if (hovered && CH_MSG[hovered]) { msg = CH_MSG[hovered]; c = CH_COL[hovered]; }
    else if (fill > 0) { msg = `LINK ${Math.round(fill * 100)}%`; c = '#7dffff'; }
    else if (IDLE_SPEAK) {
      if (st.clock >= st.idleNext && st.clock >= st.idleUntil) {
        st.idleUntil = st.clock + 1.8;
        st.idleNext = st.clock + 9 + Math.random() * 9;
        st.idleMsg = IDLE_MSGS[(Math.random() * IDLE_MSGS.length) | 0]; // choisit un message au repos
      }
      if (st.clock < st.idleUntil) { msg = st.idleMsg; c = '#7dffff'; }
    }

    // nouveau message → relance le décodage (glitch qui se résout)
    if (msg !== st.target) { st.target = msg; st.glitch = msg ? 0.5 : 0; st.colTarget = c; }
    st.amt += ((msg ? 1 : 0) - st.amt) * (1 - Math.pow(0.004, dt));

    // texte affiché : caractères qui se résolvent de gauche à droite
    let shown = st.target;
    if (st.glitch > 0) {
      st.glitch -= dt;
      const p = 1 - Math.max(st.glitch, 0) / 0.5;
      const rev = Math.floor(st.target.length * p);
      let out = '';
      for (let i = 0; i < st.target.length; i++) out += (i < rev || st.target[i] === ' ') ? st.target[i] : GLITCH_CH[(Math.random() * GLITCH_CH.length) | 0];
      shown = out;
    }

    // setState guardés → pas de re-render hors transition
    if (shown !== last.current.txt) { last.current.txt = shown; setTxt(shown); }
    const opR = Math.round(st.amt * 100) / 100;
    if (opR !== last.current.op) { last.current.op = opR; setOp(opR); }
    if (st.colTarget !== last.current.col) { last.current.col = st.colTarget; setCol(st.colTarget); }
  });

  return (
    <group position={[0, -0.05, 0.023]}>
      {/* écran qui masque le code-barres quand un message s'affiche */}
      <mesh>
        <planeGeometry args={[1.5, 0.28]} />
        <meshBasicMaterial color="#04070c" transparent opacity={op * 0.92} depthWrite={false} />
      </mesh>
      <Text position={[0, 0, 0.004]} fontSize={0.085} maxWidth={1.4} lineHeight={1.05} textAlign="center" anchorX="center" anchorY="middle" color={col} fillOpacity={op} outlineWidth={0.002} outlineColor={col}>
        {txt}
      </Text>
    </group>
  );
}

function FinaleCardModel() {
  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const sentAt = useRef<number | null>(null); // instant de l'envoi → animation finale
  const drag = useRef({ active: false, lastX: 0, rotY: 0, vel: 0 });
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
    };
    const onUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      document.body.style.cursor = '';
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

    // drag : rotation manuelle avec inertie + retour vers la face avant au relâché
    if (!drag.current.active) {
      drag.current.rotY += drag.current.vel;
      drag.current.vel *= 0.88;
      drag.current.rotY *= 0.90; // revient doucement face à l'utilisateur (barcode lisible)
    }
    const idle = drag.current.active ? 0 : 1; // pas de flottement pendant qu'on tient la carte

    g.rotation.y = -0.32 + Math.sin(t * 0.5) * 0.06 * idle + flip + drag.current.rotY;
    g.rotation.x = -0.12 + Math.cos(t * 0.4) * 0.04 * idle;
    g.position.y = Math.sin(t * 0.8) * 0.03 * idle;
    g.scale.setScalar(1.35 * (0.94 + reveal * 0.06) * (1 + pulse));

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
          {/* code-barres qui se décode en messages */}
          <CardMessage />
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
