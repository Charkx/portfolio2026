'use client';

import { useEffect, useState } from 'react';

// --- GlitchText : décodage scramble → résolution gauche→droite (thème "extraction").
// Déplacé ici depuis ProjectsSection pour servir tous les kickers de section.
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/01';

export function GlitchText({ text, duration = 600, className }: { text: string; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
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
  }, [text, duration]);
  return <span className={className}>{display}</span>;
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
