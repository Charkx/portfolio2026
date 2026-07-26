"use client";

import { useState, useEffect } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { useSceneStore } from '../store/sceneStore';
import { useModalStore } from '../store/modalStore';
import { useDragRotate } from '../hooks/useDragRotate';
import { audioEngine } from '../lib/audioEngine';
import { useDiscoveryStore } from '../store/discoveryStore';
import { SectionTitle } from '../components/ui/SectionTitle';
import { useT } from '../i18n';
import { useLangStore } from '../store/langStore';
import type { Dict } from '../i18n/dict';

// Aligné sur les couleurs des catégories (PROFIL rose · EXPÉRIENCE vert vif · FORMATION ambre).
const scanColors = ['#ff00ff', '#2bff66', '#ffc400', '#00ffff', '#9b5de5'];
const blockColors = ['text-pink-400', 'text-green-400', 'text-yellow-400'];

// Contenu d'une couche pour la MODALE mobile (texte statique : en modale on lit,
// l'effet machine à écrire reste un plaisir desktop)
function AboutBlockBody({ block, color }: { block: Dict['about']['blocks'][number]; color: string }) {
  return (
    <div className="font-mono">
      {block.text.map((line, idx) => {
        const isEntry = line.startsWith('▸');
        return (
          <p
            key={idx}
            className={
              isEntry
                ? `${color} text-base font-semibold mt-4 mb-1`
                : 'text-gray-400 text-sm mb-2 leading-relaxed pl-1'
            }
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function AboutSection() {
  // Catégorie active : partagée avec le cerveau embarqué dans le canvas humain.
  const selected = useSceneStore((s) => s.aboutSelected);
  const setSelected = useSceneStore((s) => s.setAboutSelected);
  const dragBrain = useDragRotate('brain');
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const blocks = t.about.blocks;
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // desktop → slot du canvas partagé (cerveau) · mobile → cerveau local (3D conservé)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Valeurs DÉRIVÉES de `selected` (pas de state en plus).
  const active = blocks[selected];
  const activeBlockColor = blockColors[selected];
  const activeColor = scanColors[selected];

  // Effet machine à écrire : se relance quand `selected` OU la langue change
  // (les lignes changent avec la langue → la frappe rejoue dans la nouvelle langue).
  const { shown, typingLine, done } = useTypewriter(active.text, `${lang}-${selected}`);

  // MOBILE : tap sur une couche → le scan du cerveau JOUE À L'ÉCRAN (rien ne le
  // recouvre), puis le dossier s'ouvre en modale (~750 ms plus tard, le temps du scan).
  const openBlock = (i: number) => {
    setSelected(i);
    audioEngine.play('scan');
    useDiscoveryStore.getState().discover('brain');
    const block = blocks[i];
    setTimeout(() => {
      useModalStore.getState().open({ title: `>> ${block.title}`, size: 'md', content: <AboutBlockBody block={block} color={blockColors[i]} /> });
    }, 750);
  };

  if (isMobile) {
    return (
      <section
        id="about"
        className="holo-veil-fade relative min-h-[100svh] flex flex-col justify-start px-4 pt-20 pb-28"
      >
        {/* ancre plein cadre : le cerveau se cale au centre de la section, EN FOND */}
        <div data-holo="about" aria-hidden className="absolute inset-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <SectionTitle
            className="mb-4"
            kicker={t.about.kicker}
            title={t.about.title}
          />
          {/* onglets juste sous le titre */}
          <div role="tablist" className="flex flex-wrap justify-center gap-2">
            {blocks.map((block, i) => (
              <button
                key={block.title}
                role="tab"
                aria-selected={selected === i}
                onClick={() => openBlock(i)}
                style={selected === i ? { textShadow: `0 0 10px ${scanColors[i]}` } : undefined}
                className={`px-4 py-2 rounded border font-mono text-sm transition-all ${
                  selected === i
                    ? `${blockColors[i]} border-current bg-black/50`
                    : 'text-cyan-400/60 border-cyan-400/25 bg-black/30 active:border-cyan-400/60'
                }`}
              >
                {block.title}
              </button>
            ))}
          </div>
          {/* consigne d'usage : c'est le texte qui APPREND le site à un visiteur,
              il ne peut pas être le moins lisible de la page (cf. /50 → 3,3:1) */}
          <p className="mt-3 text-cyan-400/70 font-mono text-[11px] tracking-wider text-center">
            {t.about.tapHint}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="about"
      className="holo-veil-fade min-h-screen flex flex-col items-center justify-center px-4 py-20"
    >
      <SectionTitle
        className="mb-8 lg:mb-12"
        kicker={t.about.kicker}
        title={t.about.title}
        hint={t.about.hint}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 z-10 w-full max-w-6xl">
        <div className="flex flex-col justify-center gap-6">

          {/* --- Nav (onglets terminal) : actif = couleur de la catégorie + glow --- */}
          <div className="flex flex-wrap gap-1 border-b border-cyan-400/15" role="tablist">
            {blocks.map((block, i) => {
              const isActive = selected === i;
              return (
                <button
                  key={block.title}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => { setSelected(i); audioEngine.play('scan'); useDiscoveryStore.getState().discover('brain'); }}
                  style={isActive ? { textShadow: `0 0 10px ${scanColors[i]}` } : undefined}
                  className={`-mb-px px-3 py-1.5 font-mono text-sm tracking-wide border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? `${blockColors[i]} border-current`
                      : 'text-cyan-400/40 border-transparent hover:text-cyan-400/80 hover:border-cyan-400/30'
                  }`}
                >
                  {isActive && '▸ '}{block.title}
                </button>
              );
            })}
          </div>

          {/* --- Panneau : texte révélé en machine à écrire --- */}
          <div className="glass-panel min-h-[30rem] rounded p-4">
            <h3 className={`${activeBlockColor} text-sm mb-3 font-mono`}>
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
                    ? `${activeBlockColor} font-mono text-base font-semibold mt-4 mb-1`
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

        {/* desktop : slot où le canvas partagé (page) se niche pour la station cerveau */}
        {isMobile === false ? (
          <div data-holo="about" className="h-[68vh] w-full cursor-grab touch-none" title={t.misc.dragTitle} {...dragBrain} />
        ) : (
          <div className="h-[45vh] w-full" />
        )}
      </div>
    </section>
  );
}
