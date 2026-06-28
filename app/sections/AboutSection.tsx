"use client";

import { useState } from 'react';
import CognitiveProfile from '../components/3d/CognitiveProfil';
import { LazyMount } from '../components/LazyMount';
import { useTypewriter } from '../hooks/useTypewriter';
import { ABOUT_TEXT } from '../utils/constants';

// Aligné sur les couleurs des catégories (PROFIL rose · EXPÉRIENCE vert vif · FORMATION ambre).
const scanColors = ['#ff00ff', '#2bff66', '#ffc400', '#00ffff', '#9b5de5'];

export default function AboutSection() {
  // Quelle catégorie est affichée. 0 = PROFIL par défaut.
  const [selected, setSelected] = useState(0);

  // Valeurs DÉRIVÉES de `selected` (pas de state en plus).
  const active = ABOUT_TEXT[selected];
  const activeColor = scanColors[selected];

  // Effet machine à écrire : se relance quand `selected` change.
  const { shown, typingLine, done } = useTypewriter(active.text, selected);

  return (
    <section
      id="about"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20"
    >
      <h2 className="text-4xl text-cyan-400 font-bold font-mono mb-12 z-10">
        COGNITIVE_PROFILE.dat
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 z-10 w-full max-w-6xl">
        <div className="flex flex-col justify-center gap-6">

          {/* --- Nav (onglets terminal) : actif = couleur de la catégorie + glow --- */}
          <div className="flex flex-wrap gap-1 border-b border-cyan-400/15" role="tablist">
            {ABOUT_TEXT.map((block, i) => {
              const isActive = selected === i;
              return (
                <button
                  key={block.title}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelected(i)}
                  style={isActive ? { textShadow: `0 0 10px ${scanColors[i]}` } : undefined}
                  className={`-mb-px px-3 py-1.5 font-mono text-sm tracking-wide border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? `${block.color} border-current`
                      : 'text-cyan-400/40 border-transparent hover:text-cyan-400/80 hover:border-cyan-400/30'
                  }`}
                >
                  {isActive && '▸ '}{block.title}
                </button>
              );
            })}
          </div>

          {/* --- Panneau : texte révélé en machine à écrire --- */}
          <div className="min-h-[30rem] border border-cyan-400/30 rounded p-4 bg-black/50">
            <h3 className={`${active.color} text-sm mb-3 font-mono`}>
              &gt;&gt; {active.title}
            </h3>
            {active.text.map((line, idx) => {
              // lignes pas encore atteintes : on ne les rend pas (évite les trous)
              if (!done && idx > typingLine) return null;
              const isEntry = line.startsWith('▸');
              return (
                <p
                  key={idx}
                  className={
                    isEntry
                    ? `${active.color} font-mono text-base font-semibold mt-4 mb-1`
                    : 'text-gray-400 font-mono text-sm mb-2 leading-relaxed pl-1'
                  }
                >
                  {shown[idx]}
                  {idx === typingLine && (
                    <span className="animate-pulse" style={{ color: activeColor }}>▌</span>
                  )}
                </p>
              );
            })}
          </div>
        </div>

        {/* Le 3D reçoit juste la couleur dérivée */}
        <LazyMount className="h-[80vh] w-full">
          <CognitiveProfile selected={selected} color={activeColor} count={ABOUT_TEXT.length} />
        </LazyMount>
      </div>
    </section>
  );
}
