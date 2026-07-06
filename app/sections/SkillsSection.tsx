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

// Fiche d'une techno pour la MODALE mobile (même contenu que le panneau desktop)
function TechDecodeBody({ tech, category }: { tech: { name: string; icon: string; level: number; desc: string }; category: string }) {
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
        <div className="ml-auto flex gap-1 text-sm" aria-label={`Niveau ${tech.level} sur 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= tech.level ? 'text-cyan-300' : 'text-cyan-400/20'}>●</span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-300 leading-relaxed">{tech.desc}</p>
    </div>
  );
}

gsap.registerPlugin(ScrollTrigger);

// --- Helpers ---

const ALL_TECHS = Object.values(TECH_STACK).flat();

const LEVEL_FILTERS = [
  { value: 0, label: 'Tout' },
  { value: 3, label: '●●● Maîtrise' },
  { value: 2, label: '●●○ Avancé' },
  { value: 1, label: '●○○ Familier' },
] as const;

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

  // MOBILE : tap sur une techno → la réorganisation moléculaire JOUE À L'ÉCRAN,
  // puis la fiche s'ouvre en modale (~750 ms plus tard)
  const openTech = useCallback((techName: string) => {
    const id = techName.toLowerCase();
    useSceneStore.getState().setSkillsSelected(id); // toujours ON (pas de toggle en mobile)
    audioEngine.play('molecular');
    useDiscoveryStore.getState().discover('adn');
    for (const [category, items] of Object.entries(TECH_STACK)) {
      const tech = items.find((t) => t.name.toLowerCase() === id);
      if (tech) {
        setTimeout(() => {
          useModalStore.getState().open({ title: `>> DÉCODAGE : ${tech.name}`, size: 'md', content: <TechDecodeBody tech={tech} category={category} /> });
        }, 750);
        break;
      }
    }
  }, []);


  // --- MOBILE : ~1 écran — titre, hélice (canvas partagé), liste tapable → modale ---
  if (isMobile) {
    return (
      <section
        id="skills"
        className="holo-veil-fade min-h-[100svh] flex flex-col items-center justify-center px-4 py-16 relative scroll-mt-[100px]"
      >
        <SectionTitle
          className="mb-3"
          kicker="ACCÈS MÉMOIRE.COMPÉTENCES — SÉQUENÇAGE ADN"
          title="SKILLS:DNA_MODULE_ANALYSIS"
        />
        {/* slot du canvas partagé : le zoom ADN se joue ici */}
        <div data-holo="skills" aria-hidden className="h-[38svh] w-full" />
        {/* filtre par niveau (compact) */}
        <div className="mt-3 flex flex-wrap justify-center gap-2 z-10" role="group" aria-label="Filtrer par niveau">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setLevelFilter(f.value); audioEngine.play('molecular'); }}
              aria-pressed={levelFilter === f.value}
              className={`px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                levelFilter === f.value
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-transparent text-cyan-400/70 border-cyan-400/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="glass-panel rounded-xl p-4 w-full max-w-xl mt-4 z-10">
          <TechList
            selectedTech={selectedTech}
            hoveredTech={hoveredTech}
            levelFilter={levelFilter}
            onTechClick={openTech}
            onTechHover={handleTechHover}
          />
        </div>
        <p className="mt-3 text-cyan-400/50 font-mono text-[11px] tracking-wider z-10">
          ▸ Tape un module — l&apos;hélice réagit puis la fiche s&apos;ouvre
        </p>
      </section>
    );
  }

  return (
    <section
      id="skills"
      className="holo-veil-fade min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900/20 via-blue-900/20 to-purple-900/20 px-4 py-12 relative scroll-mt-[100px] md:bg-none"
    >
      <SectionTitle
        className="mb-4"
        kicker="ACCÈS MÉMOIRE.COMPÉTENCES — SÉQUENÇAGE ADN"
        title="SKILLS:DNA_MODULE_ANALYSIS"
        hint="Chaque technologie apprise devient un fragment de mon ADN de développeur — clique un module pour le décoder."
      />

      {/* Filtre par niveau de maîtrise */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 z-10" role="group" aria-label="Filtrer par niveau">
        {LEVEL_FILTERS.map((f) => {
          const isActive = levelFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => { setLevelFilter(f.value); audioEngine.play('molecular'); }}
              aria-pressed={isActive}
              className={`px-3 py-1.5 rounded font-mono text-sm border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-transparent text-cyan-400/70 border-cyan-400/30 hover:border-cyan-400/70'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 z-10 w-full max-w-6xl relative">
        <div className="relative w-full">
          {isMobile === false ? (
            // desktop : emplacement où le canvas partagé (page) se niche pour la station ADN
            <div data-holo="skills" className="w-full cursor-grab touch-none" style={{ height: 'clamp(360px, 44vh, 520px)' }} title="Glisse pour faire pivoter" {...dragDNA} />
          ) : (
            <div className="w-full" style={{ height: 'clamp(360px, 44vh, 520px)' }} />
          )}

          {/* Affordance : on peut décoder un module */}
          {!decoded && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-mono text-cyan-400/50 pointer-events-none select-none">
              ▸ Clique un module pour le décoder
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
                  aria-label={`Niveau ${decoded.tech.level} sur 3`}
                >
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={n <= decoded.tech.level ? 'text-cyan-300' : 'text-cyan-400/20'}>
                      ●
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">{decoded.tech.desc}</p>
              <button
                onClick={() => setSelectedTech(null)}
                className="mt-3 text-xs text-cyan-400/60 hover:text-cyan-200 transition-colors cursor-pointer"
              >
                [ fermer ]
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
            {HELIX_STRANDS.map((strand) => (
              <div key={strand.label} className="border-l-2 pl-3" style={{ borderColor: strand.color }}>
                <h3 className="flex items-center gap-2 font-mono text-xs mb-2" style={{ color: strand.color }}>
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