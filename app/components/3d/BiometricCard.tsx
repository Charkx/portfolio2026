'use client';

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, useCursor, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useSceneStore } from '../../store/sceneStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const BASE_TEXT = "ID: CHARLY MENTHILLER";

/**
 * Visuel de LA carte d'identité — partagé entre le hero (clé d'entrée du site)
 * et la fin de session (artefact retrouvé) : un seul composant 3D, pas de doublon.
 * Les interactions (scan au clic, révélation scanline) restent chez les parents.
 */
// Le code-barres n'est PAS ici : les deux usages de la carte (entrée et fin de
// session) fournissent le leur via `children`, un AnimatedBarcode qui se décode en
// messages. Une variante statique a existé, protégée par une prop `hideBarcode`
// toujours passée à vrai — donc jamais rendue.
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

// LA carte biométrique — un seul composant pour tout le site :
//   onScanTrigger fourni  → carte d'ENTRÉE : scan au clic, elle parle (HELLO/SCAN ME)
//   onScanTrigger absent  → carte CONTACT : code-barres piloté par le store
//                            (survol des canaux) + célébration à l'ouverture de Calendly
const CyberpunkIDCard: React.FC<{ onScanTrigger?: () => void }> = ({ onScanTrigger }) => {
  const cardRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const sentAt = useRef<number | null>(null); // instant de la célébration (mode contact)
  const reduced = useReducedMotion();

  useCursor(hovered && !!onScanTrigger);

  useFrame((state) => {
    if (!cardRef.current || isScanning) return;
    const t = state.clock.elapsedTime;

    // mode contact : Calendly ouvert (endSessionSent) → un tour + pulse
    let flip = 0, pulse = 0;
    if (!onScanTrigger) {
      if (useSceneStore.getState().endSessionSent && sentAt.current === null) sentAt.current = t;
      if (sentAt.current !== null) {
        const e = clampF((t - sentAt.current) / 1.2, 0, 1);
        const ease = e * e * (3 - 2 * e);
        flip = ease * Math.PI * 2;
        pulse = Math.sin(e * Math.PI) * 0.12;
      }
    }

    // Mouvement réduit : le flottement au repos s'arrête (la carte reste posée, face
    // HUD vers l'objectif). On garde la célébration Calendly et le scan, qui sont
    // déclenchés par l'utilisateur et portent une information.
    cardRef.current.rotation.y = (reduced ? 0 : Math.sin(t * 0.5) * 0.1) + flip;
    cardRef.current.rotation.x = reduced ? 0 : Math.cos(t * 0.3) * 0.05;
    cardRef.current.scale.setScalar(1 + pulse);
  });

  const handleClick = () => {
    if (!onScanTrigger || isScanning) return;
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
        onClick={onScanTrigger ? handleClick : undefined}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* entrée : la carte parle toute seule · contact : elle répond aux canaux */}
        {onScanTrigger
          ? <AnimatedBarcode autoMessages={['HELLO !', 'SCAN ME']} />
          : <AnimatedBarcode />}
      </IDCardVisual>
    </group>
  );
};

interface BiometricCardProps {
  onScan?: () => void; // absent = carte de la section Contact
}

export default function BiometricCard({ onScan }: BiometricCardProps) {
  // tactile : pas d'orbit (la rotation au doigt casserait le scroll) — flottement seul
  const [coarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );
  return (
    <Canvas gl={{ antialias: true, alpha: true }}>
      {/* caméra rapprochée : la carte est LE composant principal */}
      <PerspectiveCamera makeDefault position={[0, 0, 1.55]} />
      {!coarse && <OrbitControls enableZoom={false} enablePan={false} />}
      <ambientLight intensity={0.9} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#00ffff" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
      <pointLight position={[0, 0, 10]} intensity={0.8} color="#ffffff" />

      {/* Suspense interne : le chargement de texture (useLoader) est contenu
          ICI, sans faire démonter/remonter tout le Canvas. */}
      <Suspense fallback={null}>
        {/* Environnement PROCÉDURAL. `preset="night"` téléchargeait 1,7 Mo de HDR
            depuis raw.githack.com (un tiers) AVANT de lever le Suspense : la carte
            n'apparaissait pas tant que le fichier n'était pas là — le retard visible
            sur mobile. On ne peut pas simplement le supprimer : le corps de la carte
            est en metalness 0.9, et un métal sans rien à réfléchir rend noir. On
            fabrique donc le reflet au lieu de le télécharger. `frames={1}` : les
            lightformers ne bougent pas, une seule passe de rendu suffit. */}
        <Environment resolution={64} frames={1}>
          {/* Un environnement de NUIT, pas un studio : presque tout est sombre, un
              seul éclat vif. C'est ce qui garde le bleu métal — un métal ne montre
              que ce qu'il réfléchit, donc un environnement clair le délave et le
              fait virer (avec le pointLight magenta, ça donnait du violet). */}
          <color attach="background" args={['#03060b']} />
          {/* la "lune" : petit et vif → une arête brillante, pas un délavage */}
          <Lightformer form="circle" intensity={4} color="#dff6ff" position={[3, 4, 3]} scale={1.2} />
          {/* remplissage frontal TRÈS discret : juste assez pour que la face
              tournée vers la caméra ne soit pas noire. Au-delà de ~0.4, le blanc
              réfléchi couvre le bleu et la carte repart vers le violet. */}
          <Lightformer intensity={0.15} color="#7fd8ea" position={[0, 0, 6]} scale={[10, 10, 1]} />
        </Environment>
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
const CH_MSG: Record<string, string> = { email: 'WRITE ME', github: 'SEE MY CODE', linkedin: "LET'S CONNECT", cv: 'CHECK MY CV', dispo: 'AVAILABLE 09/2026' };
const CH_COL: Record<string, string> = { email: '#22d3ee', github: '#c084fc', linkedin: '#38bdf8', cv: '#f472b6', dispo: '#4ade80' };
const IDLE_SPEAK = true; // la carte "parle" au repos de temps en temps (mettre false pour couper)
const IDLE_MSGS = ['OPEN TO WORK', 'AVAILABLE 09/2026']; // messages au repos (alternent)
const NBARS = 30;

// Code-barres VIVANT : ses barres se couchent de gauche à droite pour laisser
// apparaître le texte (elles se "réagencent" en lettres), puis se redressent.
// Lit le store : survol coordonnée > formulaire envoyé > progression > repos.
function AnimatedBarcode({ autoMessages }: { autoMessages?: string[] }) {
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  /* eslint-disable react-hooks/purity --
   * Hasard VOULU et figé au montage : des barres de hauteurs inégales (sinon ce
   * n'est pas un code-barres) et un premier délai de repos non synchronisé d'une
   * carte à l'autre. Tiré une seule fois, jamais rejoué au rendu. Le canvas est
   * client-only, donc aucun risque de divergence avec le rendu serveur. */
  const baseH = useMemo(() => Array.from({ length: NBARS }, () => 0.06 + Math.random() * 0.1), []);
  const [txt, setTxt] = useState('');
  const [txtCol, setTxtCol] = useState('#7dffff');
  const [txtOp, setTxtOp] = useState(0);
  const s = useRef({ target: '', col: '#7dffff', p: 0, clock: 0, idleNext: 7 + Math.random() * 8, idleUntil: 0, idleMsg: IDLE_MSGS[0], autoIdx: 0 });
  /* eslint-enable react-hooks/purity */
  const last = useRef({ txt: '', op: -1, col: '' });
  const reduced = useReducedMotion();
  const baseCol = useMemo(() => new THREE.Color('#aef6ff'), []);
  const msgCol = useRef(new THREE.Color('#7dffff'));

  useFrame((_, dt) => {
    const store = useSceneStore.getState();
    const st = s.current;
    st.clock += dt;
    const hovered = store.contactIdHovered;
    const fill = store.contactFill ?? 0;
    const sent = store.endSessionSent;

    // message cible + couleur. Mode AUTO (hero avant scan) : cycle imposé.
    let msg = '', c = '#7dffff';
    if (autoMessages) {
      // hero avant le scan : la carte "parle" ponctuellement (10-18 s), pas en boucle.
      // Mouvement réduit : elle ne prend plus la parole d'elle-même — c'est une
      // animation qui se déclenche seule, en boucle, sans que l'utilisateur l'ait
      // demandée. Elle continue de répondre au survol et à l'envoi du formulaire.
      if (!reduced && st.clock >= st.idleNext && st.clock >= st.idleUntil) {
        st.idleUntil = st.clock + 1.8;
        st.idleNext = st.clock + 10 + Math.random() * 8;
        st.autoIdx = (st.autoIdx + 1) % autoMessages.length;
      }
      if (st.clock < st.idleUntil) msg = autoMessages[st.autoIdx];
    }
    // sinon (carte de contact) : envoyé > survol > formulaire > repos
    else if (sent) { msg = (Math.floor(st.clock / 2.8) % 2 === 0) ? "LET'S WORK TOGETHER" : 'AVAILABLE 09/2026'; c = '#4ade80'; }
    else if (hovered && CH_MSG[hovered]) { msg = CH_MSG[hovered]; c = CH_COL[hovered]; }
    else if (fill > 0) { msg = `LINK ${Math.round(fill * 100)}%`; c = '#7dffff'; }
    else if (IDLE_SPEAK) {
      if (!reduced && st.clock >= st.idleNext && st.clock >= st.idleUntil) {
        st.idleUntil = st.clock + 1.8;
        st.idleNext = st.clock + 9 + Math.random() * 9;
        st.idleMsg = IDLE_MSGS[(Math.random() * IDLE_MSGS.length) | 0];
      }
      if (st.clock < st.idleUntil) { msg = st.idleMsg; c = '#7dffff'; }
    }

    // nouveau message → les barres se redressent puis se réagencent (p repart de 0)
    if (msg !== st.target) { st.target = msg; st.col = c; st.p = 0; }
    st.p += ((msg ? 1 : 0) - st.p) * (1 - Math.pow(0.004, dt)); // balayage gauche→droite ~0,4 s
    msgCol.current.set(st.col);

    // barres : couchées (fines) là où le balayage est passé = "devenues lettres"
    const k = 1 - Math.pow(0.0008, dt);
    for (let i = 0; i < NBARS; i++) {
      const b = bars.current[i]; if (!b) continue;
      const flat = st.p > i / (NBARS - 1) + 0.02;
      b.scale.y += ((flat ? 0.14 : 1) - b.scale.y) * k;
      const m = b.material as THREE.MeshBasicMaterial;
      m.color.lerp(flat ? msgCol.current : baseCol, k);
      m.opacity = flat ? 0.5 : 1;
    }

    // texte révélé de gauche à droite, en phase avec les barres qui se couchent
    const rev = Math.floor(st.target.length * clampF(st.p * 1.06, 0, 1));
    const shown = st.target.substring(0, rev);
    if (shown !== last.current.txt) { last.current.txt = shown; setTxt(shown); }
    const op = Math.round(clampF((st.p - 0.1) / 0.9, 0, 1) * 100) / 100;
    if (op !== last.current.op) { last.current.op = op; setTxtOp(op); }
    if (st.col !== last.current.col) { last.current.col = st.col; setTxtCol(st.col); }
  });

  return (
    <group position={[0, -0.05, 0.0215]}>
      {baseH.map((h, i) => (
        <mesh key={i} ref={(el) => { bars.current[i] = el; }} position={[-0.6 + (i / (NBARS - 1)) * 1.2, 0, 0]}>
          <planeGeometry args={[0.02, h]} />
          <meshBasicMaterial color="#aef6ff" transparent />
        </mesh>
      ))}
      <Text position={[0, 0, 0.006]} fontSize={0.07} maxWidth={1.4} lineHeight={1.05} textAlign="center" anchorX="center" anchorY="middle" color={txtCol} fillOpacity={txtOp}>
        {txt}
      </Text>
    </group>
  );
}

// (ContactCard / FinaleCardModel supprimés : la carte de la section Contact
//  est le MÊME composant BiometricCard, sans onScan — un seul artefact.)
