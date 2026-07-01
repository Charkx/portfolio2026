'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DNAAnalysis from '../components/3d/DNAAnalysis';
import TechList from '../components/TechList';
import { LazyMount } from '../components/LazyMount';
import { TECH_STACK, HELIX_STRANDS } from '../utils/constants';
import { useSceneStore } from '../store/sceneStore';
import { useDragRotate } from '../hooks/useDragRotate';

gsap.registerPlugin(ScrollTrigger);

// --- Helpers ---

const ALL_TECHS = Object.values(TECH_STACK).flat();

// id (nom en minuscules) → niveau de maîtrise
const LEVEL_BY_ID: Record<string, number> = Object.fromEntries(
  ALL_TECHS.map((t) => [t.name.toLowerCase(), t.level])
);

const LEVEL_FILTERS = [
  { value: 0, label: 'Tout' },
  { value: 3, label: '●●● Maîtrise' },
  { value: 2, label: '●●○ Avancé' },
  { value: 1, label: '●○○ Familier' },
] as const;

// --- Composant ---

export default function SkillsSection() {
  // États partagés avec l'ADN embarqué dans le canvas humain (via le store)
  const visibleTechs  = useSceneStore((s) => s.skillsVisible);
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
  }, []);

  // -- Clic sur une tech (depuis la liste ou le canvas) --
  const handleTechClick = useCallback((techName: string) => {
    const id = techName.toLowerCase();
    // clic = sélection (toggle) → lit la valeur courante du store (pas de closure obsolète)
    const cur = useSceneStore.getState().skillsSelected;
    useSceneStore.getState().setSkillsSelected(cur === id ? null : id);
  }, []);

  // Donnée de la techno sélectionnée (pour le panneau de décodage)
  const decoded = useMemo(() => {
    if (!selectedTech) return null;
    for (const [category, items] of Object.entries(TECH_STACK)) {
      const tech = items.find((t) => t.name.toLowerCase() === selectedTech);
      if (tech) return { tech, category };
    }
    return null;
  }, [selectedTech]);

  // Techs affichées dans l'hélice : révélées au scroll ET au niveau filtré
  const shownTechs = useMemo(
    () =>
      levelFilter === 0
        ? visibleTechs
        : visibleTechs.filter((id) => LEVEL_BY_ID[id] === levelFilter),
    [visibleTechs, levelFilter]
  );

  // -- Hover --
  const handleTechHover = useCallback((techName: string | null) => {
    setHoveredTech(techName ? techName.toLowerCase() : null);
  }, []);


  return (
    <section
      id="skills"
      className="holo-veil-fade min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900/20 via-blue-900/20 to-purple-900/20 px-4 py-32 relative scroll-mt-[100px]"
    >
      <h2 className="text-4xl font-bold text-cyan-400 mb-2 font-mono z-10 text-center">
        SKILLS:DNA_MODULE_ANALYSIS
      </h2>
      <p className="text-lg text-cyan-100 mb-12 max-w-2xl text-center z-10">
        Chaque technologie que j&apos;apprends devient un fragment de mon ADN de développeur.
        Cette section explore les modules qui composent mon code génétique professionnel.
      </p>

      {/* Filtre par niveau de maîtrise */}
      <div className="flex flex-wrap justify-center gap-2 mb-12 z-10" role="group" aria-label="Filtrer par niveau">
        {LEVEL_FILTERS.map((f) => {
          const isActive = levelFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setLevelFilter(f.value)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 z-10 w-full max-w-6xl relative">
        <div className="relative w-full">
          {isMobile === false ? (
            // desktop : emplacement où le canvas partagé (page) se niche pour la station ADN
            <div data-holo="skills" className="w-full cursor-grab touch-none" style={{ height: 'clamp(500px, 60vh, 800px)' }} title="Glisse pour faire pivoter" {...dragDNA} />
          ) : isMobile ? (
            <LazyMount className="w-full" style={{ height: 'clamp(500px, 60vh, 800px)' }}>
              <DNAAnalysis
                visibleTechs={shownTechs}
                hoveredTech={hoveredTech}
                selectedTech={selectedTech}
                onTechClick={handleTechClick}
                onTechHover={handleTechHover}
              />
            </LazyMount>
          ) : (
            <div className="w-full" style={{ height: 'clamp(500px, 60vh, 800px)' }} />
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

        <TechList
          selectedTech={selectedTech}
          hoveredTech={hoveredTech}
          levelFilter={levelFilter}
          onTechClick={handleTechClick}
          onTechHover={handleTechHover}
        />
      </div>

      {/* Légende : les 2 brins de l'hélice (ce qui relie les langages) */}
      <div className="z-10 w-full max-w-6xl mt-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {HELIX_STRANDS.map((strand) => (
            <div
              key={strand.label}
              className="border-l-2 pl-4"
              style={{ borderColor: strand.color }}
            >
              <h3
                className="flex items-center gap-2 font-mono text-sm mb-3"
                style={{ color: strand.color }}
              >
                <span>●</span> {strand.label}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {strand.items.map((item) => (
                  <li
                    key={item}
                    className="text-xs px-3 py-1.5 rounded-full border border-cyan-400/30
                               bg-cyan-400/5 text-cyan-200 font-mono"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}