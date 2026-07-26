'use client';

import { useCallback, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TechList from '../components/TechList';
import { TECH_STACK, HELIX_STRANDS } from '../utils/constants';
import { useSceneStore } from '../store/sceneStore';
import { useModalStore } from '../store/modalStore';
import { useDragRotate } from '../hooks/useDragRotate';
import { audioEngine } from '../lib/audioEngine';
import { useDiscoveryStore } from '../store/discoveryStore';
import { SectionTitle } from '../components/ui/SectionTitle';
import { useT } from '../i18n';

// Fiche d'une techno pour la MODALE mobile (même contenu que le panneau desktop)
function TechDecodeBody({ tech, category, desc, levelOf }: { tech: { name: string; icon: string; level: number }; category: string; desc: string; levelOf: (n: number) => string }) {
  return (
    <div className="font-mono">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${tech.icon}/${tech.icon}-original.svg`}
          alt=""
          className="w-10 h-10"
        />
        <div>
          <div className="text-cyan-100 text-lg leading-tight">{tech.name}</div>
          <div className="text-[11px] text-cyan-400/60 uppercase tracking-wider">{category}</div>
        </div>
        <div className="ml-auto flex gap-1 text-sm" aria-label={levelOf(tech.level)}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= tech.level ? 'text-cyan-300' : 'text-cyan-400/20'}>●</span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-300 leading-relaxed">{desc}</p>
    </div>
  );
}

gsap.registerPlugin(ScrollTrigger);

// --- Helpers ---

const ALL_TECHS = Object.values(TECH_STACK).flat();

const LEVEL_VALUES = [0, 3, 2, 1] as const;

// Contenu de la MODALE mobile "séquenceur ADN" : filtres + liste des modules + les 2
// brins de l'hélice. Autonome (son propre état de filtre). Tap sur un module → la
// fiche de décodage remplace cette modale (drill-down).
function SkillsBrowser({ initialLevel = 0 }: { initialLevel?: number }) {
  const [level, setLevel] = useState(initialLevel);
  const t = useT();
  const filterLabels: Record<number, string> = { 0: t.skills.filters.all, 3: t.skills.filters.l3, 2: t.skills.filters.l2, 1: t.skills.filters.l1 };

  const openTech = (techName: string) => {
    const id = techName.toLowerCase();
    useSceneStore.getState().setSkillsSelected(id);   // l'hélice réagit derrière
    audioEngine.play('molecular');
    useDiscoveryStore.getState().discover('adn');
    const dict = t;
    for (const [category, items] of Object.entries(TECH_STACK)) {
      const tech = items.find((x) => x.name.toLowerCase() === id);
      if (tech) {
        useModalStore.getState().open({ title: `${dict.skills.decodeTitle} ${tech.name}`, size: 'md', content: <TechDecodeBody tech={tech} category={category} desc={dict.skills.techDesc[tech.name] ?? ''} levelOf={dict.skills.levelOf} /> });
        break;
      }
    }
  };

  return (
    <div className="font-mono">
      <div className="flex flex-wrap justify-center gap-2 mb-4" role="group" aria-label={t.skills.filterGroup}>
        {LEVEL_VALUES.map((v) => (
          <button
            key={v}
            onClick={() => { setLevel(v); audioEngine.play('molecular'); }}
            aria-pressed={level === v}
            className={`px-3 py-1.5 rounded text-xs border transition-colors ${
              level === v ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-transparent text-cyan-400/70 border-cyan-400/30'
            }`}
          >
            {filterLabels[v]}
          </button>
        ))}
      </div>
      <TechList selectedTech={null} hoveredTech={null} levelFilter={level} onTechClick={openTech} onTechHover={() => {}} />
      {/* les 2 brins de l'hélice — méthodes + IA */}
      <div className="mt-5 pt-4 border-t border-cyan-400/15 grid grid-cols-1 gap-4">
        {t.skills.strands.map((strand, si) => (
          <div key={strand.label} className="border-l-2 pl-3" style={{ borderColor: HELIX_STRANDS[si].color }}>
            <h3 className="flex items-center gap-2 text-xs mb-2" style={{ color: HELIX_STRANDS[si].color }}>
              <span>●</span> {strand.label}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {strand.items.map((item) => (
                <li key={item} className="text-[10px] px-2 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-200">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Composant ---

export default function SkillsSection() {
  // États partagés avec l'ADN embarqué dans le canvas humain (via le store)
  const setVisibleTechs = useSceneStore((s) => s.setSkillsVisible);
  const hoveredTech   = useSceneStore((s) => s.skillsHovered);
  const setHoveredTech  = useSceneStore((s) => s.setSkillsHovered);
  const selectedTech  = useSceneStore((s) => s.skillsSelected);
  const setSelectedTech = useSceneStore((s) => s.setSkillsSelected);
  const levelFilter   = useSceneStore((s) => s.skillsLevel);
  const setLevelFilter  = useSceneStore((s) => s.setSkillsLevel);
  const dragDNA       = useDragRotate('adn');
  const t = useT();
  const filterLabels: Record<number, string> = { 0: t.skills.filters.all, 3: t.skills.filters.l3, 2: t.skills.filters.l2, 1: t.skills.filters.l1 };
  const [isMobile, setIsMobile]         = useState<boolean | null>(null);

  // Détection device : desktop → slot du canvas partagé · mobile → ADN local (2D conservé)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // -- Révélation : quand la section entre, TOUTES les technos s'assemblent --
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: '#skills',
        start: 'top 75%',
        once: true,
        onEnter: () => setVisibleTechs(ALL_TECHS.map((t) => t.name.toLowerCase())),
      });
    });
    return () => ctx.revert();
  }, [setVisibleTechs]);

  // -- Clic sur une tech (depuis la liste ou le canvas) --
  const handleTechClick = useCallback((techName: string) => {
    const id = techName.toLowerCase();
    // clic = sélection (toggle) → lit la valeur courante du store (pas de closure obsolète)
    const cur = useSceneStore.getState().skillsSelected;
    useSceneStore.getState().setSkillsSelected(cur === id ? null : id);
    audioEngine.play('molecular');
    useDiscoveryStore.getState().discover('adn');
  }, []);

  // Donnée de la techno sélectionnée (pour le panneau de décodage) — calcul trivial,
  // pas de useMemo : le React Compiler mémoïse mieux sans contrainte manuelle
  let decoded: { tech: (typeof ALL_TECHS)[number]; category: string } | null = null;
  if (selectedTech) {
    for (const [category, items] of Object.entries(TECH_STACK)) {
      const tech = items.find((t) => t.name.toLowerCase() === selectedTech);
      if (tech) { decoded = { tech, category }; break; }
    }
  }

  // (l'hélice embarquée dans le canvas partagé lit skillsVisible/skillsLevel
  //  directement dans le store — plus de calcul local nécessaire)

  // -- Hover --
  const handleTechHover = useCallback((techName: string | null) => {
    setHoveredTech(techName ? techName.toLowerCase() : null);
  }, [setHoveredTech]);

  // (mobile : la liste des modules s'ouvre désormais dans une modale via <SkillsBrowser/>)


  // --- MOBILE : ~1 écran — titre, hélice (canvas partagé), liste tapable → modale ---
  if (isMobile) {
    return (
      <section
        id="skills"
        className="holo-veil-fade relative min-h-[100svh] flex flex-col justify-start px-4 pt-20 pb-28 scroll-mt-[100px]"
      >
        {/* ancre plein cadre : l'hélice ADN se cale au centre de la section, EN FOND */}
        <div data-holo="skills" aria-hidden className="absolute inset-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <SectionTitle
            className="mb-4"
            kicker={t.skills.kicker}
            title={t.skills.title}
          />
          {/* boutons de maîtrise : tap → l'hélice se réorganise à l'écran, puis (petit
              délai) la modale des modules s'ouvre, filtrée sur le niveau choisi.
              L'ADN reste PLEINEMENT visible en fond. */}
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t.skills.filterGroup}>
            {LEVEL_VALUES.map((v) => (
              <button
                key={v}
                onClick={() => {
                  setLevelFilter(v);                          // l'hélice réagit dans le canvas
                  audioEngine.play('molecular');
                  useDiscoveryStore.getState().discover('adn');
                  setTimeout(() => {
                    useModalStore.getState().open({ title: t.skills.browserTitle, size: 'md', content: <SkillsBrowser initialLevel={v} /> });
                  }, 750);
                }}
                aria-pressed={levelFilter === v}
                className={`px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                  levelFilter === v
                    ? 'bg-cyan-500 text-black border-cyan-400'
                    : 'bg-black/30 text-cyan-400/70 border-cyan-400/30'
                }`}
              >
                {filterLabels[v]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-cyan-400/70 font-mono text-[11px] tracking-wider text-center">
            {t.skills.tapHint}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="skills"
      className="holo-veil-fade min-h-screen flex flex-col items-center justify-center px-4 py-12 relative scroll-mt-[100px]"
    >
      <SectionTitle
        className="mb-4"
        kicker={t.skills.kicker}
        title={t.skills.title}
        hint={t.skills.hint}
      />

      {/* Filtre par niveau de maîtrise */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 z-10" role="group" aria-label={t.skills.filterGroup}>
        {LEVEL_VALUES.map((v) => {
          const isActive = levelFilter === v;
          return (
            <button
              key={v}
              onClick={() => { setLevelFilter(v); audioEngine.play('molecular'); }}
              aria-pressed={isActive}
              className={`px-3 py-1.5 rounded font-mono text-sm border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-transparent text-cyan-400/70 border-cyan-400/30 hover:border-cyan-400/70'
              }`}
            >
              {filterLabels[v]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 z-10 w-full max-w-6xl relative">
        <div className="relative w-full">
          {isMobile === false ? (
            // desktop : emplacement où le canvas partagé (page) se niche pour la station ADN
            <div data-holo="skills" className="w-full cursor-grab touch-none" style={{ height: 'clamp(360px, 44vh, 520px)' }} title={t.misc.dragTitle} {...dragDNA} />
          ) : (
            <div className="w-full" style={{ height: 'clamp(360px, 44vh, 520px)' }} />
          )}

          {/* Affordance : on peut décoder un module */}
          {!decoded && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-mono text-cyan-400/70 pointer-events-none select-none">
              {t.skills.clickHint}
            </div>
          )}

          {/* Panneau de décodage de la techno sélectionnée */}
          {decoded && (
            <div
              key={selectedTech}
              className="hud-reveal absolute bottom-3 left-3 right-3 border border-cyan-400/40 rounded
                         bg-black/85 backdrop-blur-sm p-4 font-mono"
            >
              <div className="flex items-center gap-3">
                <img
                  src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${decoded.tech.icon}/${decoded.tech.icon}-original.svg`}
                  alt=""
                  className="w-10 h-10"
                />
                <div>
                  <div className="text-cyan-100 text-lg leading-tight">{decoded.tech.name}</div>
                  <div className="text-[11px] text-cyan-400/60 uppercase tracking-wider">
                    {decoded.category}
                  </div>
                </div>
                <div
                  className="ml-auto flex gap-1 text-sm"
                  aria-label={t.skills.levelOf(decoded.tech.level)}
                >
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={n <= decoded.tech.level ? 'text-cyan-300' : 'text-cyan-400/20'}>
                      ●
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">{t.skills.techDesc[decoded.tech.name] ?? decoded.tech.desc}</p>
              <button
                onClick={() => setSelectedTech(null)}
                className="mt-3 text-xs text-cyan-400/60 hover:text-cyan-200 transition-colors cursor-pointer"
              >
                {t.skills.close}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div className="glass-panel rounded-xl p-4 md:p-5">
            <TechList
              selectedTech={selectedTech}
              hoveredTech={hoveredTech}
              levelFilter={levelFilter}
              onTechClick={handleTechClick}
              onTechHover={handleTechHover}
            />
          </div>

          {/* Légende : les 2 brins de l'hélice — dans la colonne texte (la zone 3D reste libre) */}
          <div className="glass-panel rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {t.skills.strands.map((strand, si) => (
              <div key={strand.label} className="border-l-2 pl-3" style={{ borderColor: HELIX_STRANDS[si].color }}>
                <h3 className="flex items-center gap-2 font-mono text-xs mb-2" style={{ color: HELIX_STRANDS[si].color }}>
                  <span>●</span> {strand.label}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {strand.items.map((item) => (
                    <li key={item} className="text-[10px] px-2 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-200 font-mono">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}