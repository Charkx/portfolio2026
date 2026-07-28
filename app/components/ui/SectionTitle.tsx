'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// --- GlitchText : décodage scramble → résolution gauche→droite (thème "extraction").
// Déplacé ici depuis ProjectsSection pour servir tous les kickers de section.
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/01';

// `delay` : permet de décaler le DÉPART du décodage sans toucher à sa durée — c'est
// ce qui rend une cascade lisible (plusieurs lignes qui se décodent l'une après
// l'autre) plutôt qu'un bloc qui se résout d'un coup.
export function GlitchText({ text, duration = 600, delay = 0, className }: { text: string; duration?: number; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    // Mouvement réduit : aucun brouillage. Brouiller les caractères d'un titre de
    // section n'est pas seulement une animation — c'est du texte rendu temporairement
    // illisible, ce qui gêne bien au-delà des seuls troubles vestibulaires.
    // (le texte final est rendu directement, cf. plus bas : pas de setState ici)
    if (reduced) return;
    let raf = 0;
    const start = performance.now() + delay; // pendant l'attente, t reste à 0 → brouillé
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const revealed = Math.floor(t * text.length);
      let s = text.slice(0, revealed);
      for (let i = revealed; i < text.length; i++) {
        s += text[i] === ' ' ? ' ' : GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
      }
      setDisplay(s);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, delay, reduced]);
  return <span className={className}>{reduced ? text : display}</span>;
}

// Titre de section UNIFIÉ (même hiérarchie partout — cohérence Awwwards) :
//   kicker  : ligne d'accès mémoire, mono, décodée en glitch
//   title   : h2 display SECTION:NOM_DE_CODE
//   hint    : une phrase d'accroche (optionnelle)
// Toutes les sections l'utilisent → un seul endroit pour régler la typo.
export function SectionTitle({
  kicker,
  title,
  hint,
  className = '',
}: {
  kicker: string;
  title: string;
  hint?: string;
  className?: string;
}) {
  // césure autorisée après le ':' → sur mobile le titre passe sur 2 lignes
  // au lieu de déborder de l'écran (SECTION: / NOM_DE_CODE)
  const [head, ...rest] = title.split(':');
  const tail = rest.join(':');

  return (
    <div className={`text-center z-10 max-w-full px-2 ${className}`}>
      <div className="text-cyan-300/80 text-[10px] sm:text-xs font-mono tracking-[0.15em] sm:tracking-[0.25em] mb-2" aria-hidden="true">
        <GlitchText text={`> ${kicker}`} duration={900} />
      </div>
      {/* taille fluide : ne déborde jamais, plafonne à la taille desktop */}
      <h2 className="font-bold text-cyan-400 font-display leading-tight" style={{ fontSize: 'clamp(1.25rem, 5.5vw, 2.25rem)' }}>
        {tail ? (<>{head}:<wbr />{tail}</>) : title}
      </h2>
      {hint && (
        <p className="mt-3 text-gray-400 text-sm md:text-base max-w-3xl mx-auto">
          {hint}
        </p>
      )}
    </div>
  );
}
