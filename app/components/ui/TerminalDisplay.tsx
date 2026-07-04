'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { usePortfolioStore } from '../../store/portfolioStore';
import CalibrationConsole from './CalibrationConsole';
import type { IntroPhase } from '../../utils/types';

// --- Constantes : elles ne dépendent ni des props ni de l'état du composant.
// Donc elles vivent AU NIVEAU MODULE (créées une seule fois, pas à chaque rendu). ---

const HEADER: Record<IntroPhase, string> = {
  LOCKED:   'SCAN CARD CODE TO ACCESS DATA',
  SCANNING: 'SCANNING...',
  BOOTING:  'INITIALIZING NEURAL LINK...',
  UNLOCKED: 'ACCESS GRANTED',
};

const HEADER_COLOR: Record<IntroPhase, string> = {
  LOCKED:   'text-red-500',
  SCANNING: 'text-cyan-400',
  BOOTING:  'text-cyan-400',
  UNLOCKED: 'text-green-400',
};

const SCAN_SEQUENCE = [
  '> Card detected.',
  '> Subject: MENTHILLER.CHARLY_009',
];

const BOOT_SEQUENCE = [
  '> Initializing neural link...',
  '> Establishing secure connection...',
  '> Neural interface initialized.',
  '> Welcome, Charly Menthiller.',
];

export default function TerminalDisplay() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ id: string; text: string }[]>([]);
  const { introPhase, setIntroPhase } = usePortfolioStore();
  // étape calibrage : après l'identification du sujet, avant le boot
  const [calibrating, setCalibrating] = useState(false);

  // Verrouillé : terminal vide (l'en-tête + les boutons suffisent) ; on
  // réinitialise aussi le calibrage (re-verrouillage → séquence complète rejouée)
  useEffect(() => {
    if (introPhase === 'LOCKED') {
      setLines([]);
      setCalibrating(false);
    }
  }, [introPhase]);

  // calibrage terminé → le boot s'établit
  const onCalibrated = useCallback(() => {
    setCalibrating(false);
    setIntroPhase('BOOTING');
  }, [setIntroPhase]);

  // Séquences animées + enchaînement des phases.
  useEffect(() => {
    // Fonction RÉUTILISABLE : `sequence` est un PARAMÈTRE,
    // donc la même fonction sert pour SCANNING, BOOTING, etc.
    const playSequence = async (sequence: string[]) => {
      setLines([]); // on repart d'un terminal vide

      for (let i = 0; i < sequence.length; i++) {
        const id = `terminal-line-${i}`;
        const text = sequence[i];

        // 1. on ajoute la ligne (invisible au départ)
        setLines((prev) => [...prev, { id, text }]);

        // 2. on ATTEND la fin de l'animation de CETTE ligne avant de passer à la suivante
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            const el = document.getElementById(id);
            if (!el) { resolve(); return; }

            gsap.fromTo(
              el,
              { opacity: 0, y: 20 },
              {
                opacity: 1, y: 0, duration: 0.3, ease: 'power2.out',
                onComplete: () => {
                  setTimeout(() => {
                    gsap.to(el, {
                      opacity: 0, y: -20, duration: 0.3, ease: 'power2.in',
                      onComplete: () => {
                        setLines((prev) => prev.filter((l) => l.id !== id));
                        resolve(); // ← débloque le `await` : on passe à la ligne suivante
                      },
                    });
                  }, 800);
                },
              }
            );
          });
        });
      }
    };

    // Selon la phase, on joue la bonne séquence, PUIS on avance.
    // Après le scan : étape CALIBRAGE (les réglages s'impriment un à un,
    // l'utilisateur répond, puis le boot s'enchaîne — cf. CalibrationConsole).
    if (introPhase === 'SCANNING') {
      playSequence(SCAN_SEQUENCE).then(() => setCalibrating(true));
    } else if (introPhase === 'BOOTING') {
      playSequence(BOOT_SEQUENCE).then(() => setIntroPhase('UNLOCKED'));
    }
  }, [introPhase, setIntroPhase]);

  return (
    <div className="text-center mt-4">
      <div className={`${calibrating ? 'text-cyan-400' : HEADER_COLOR[introPhase]} text-xl font-mono neon-glow animate-pulse mb-2`}>
        {calibrating ? 'SESSION CALIBRATION' : HEADER[introPhase]}
      </div>

      <div
        ref={terminalRef}
        className="text-left text-cyan-300 text-sm font-mono max-h-64 overflow-y-hidden px-4 min-h-[100px]"
      >
        {lines.map((line) => (
          <div key={line.id} id={line.id} className="terminal-line">
            {line.text}
          </div>
        ))}

        {calibrating && <CalibrationConsole onConfirm={onCalibrated} />}

        {introPhase === 'SCANNING' && !calibrating && <div className="terminal-cursor">_</div>}

        {introPhase === 'UNLOCKED' && (
          <div className="mt-2">Scroll to continue neural interface initialization...</div>
        )}
      </div>
    </div>
  );
}
