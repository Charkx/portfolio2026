'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DNAAnalysis from '../components/3d/DNAAnalysis';
import TechList from '../components/TechList';
import { LazyMount } from '../components/LazyMount';
import { TECH_STACK, SKILLS_EXTRA } from '../utils/constants';
import type { MutationState, PositionMap } from '../utils/types';

gsap.registerPlugin(ScrollTrigger);

// --- Helpers ---

const ALL_TECHS = Object.values(TECH_STACK).flat();

function pickMutationTarget(
  source: string,
  positions: PositionMap
): string | null {
  const candidates = Object.keys(positions).filter((name) => name !== source);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// --- Composant ---

export default function SkillsSection() {
  const [visibleTechs, setVisibleTechs] = useState<string[]>([]);
  const [hoveredTech, setHoveredTech]   = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [mutation, setMutation]         = useState<MutationState | null>(null);
  const [positions, setPositions]       = useState<PositionMap>({});

  const visibleRef = useRef<Set<string>>(new Set());

  // -- Scroll : apparition progressive des techs --
  useEffect(() => {
    const ctx = gsap.context(() => {
      ALL_TECHS.forEach(({ name }) => {
        const id = name.toLowerCase();
        ScrollTrigger.create({
          trigger: `#tech-trigger-${id}`,
          start: 'top 80%',
          onEnter: () => {
            if (visibleRef.current.has(id)) return;
            visibleRef.current.add(id);
            setVisibleTechs(Array.from(visibleRef.current));
          },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  // -- Clic sur une tech (depuis la liste ou le canvas) --
  const handleTechClick = useCallback(
    (techName: string) => {
      const id = techName.toLowerCase();

      if (!selectedTech) {
        // Premier clic : simple sélection
        setSelectedTech(id);
        return;
      }

      if (selectedTech === id) {
        // Clic sur la même tech : désélection
        setSelectedTech(null);
        setMutation(null);
        return;
      }

      // Clic sur une autre tech : déclenche une mutation
      setMutation({ source: selectedTech, target: id });
      setSelectedTech(id);
    },
    [selectedTech]
  );

  // -- Hover --
  const handleTechHover = useCallback((techName: string | null) => {
    setHoveredTech(techName ? techName.toLowerCase() : null);
  }, []);

  // -- Positions 3D prêtes (émises par DNAHelix) --
  const handlePositionsReady = useCallback((map: PositionMap) => {
    setPositions(map);
  }, []);

  // -- Fin de la mutation --
  const handleMutationComplete = useCallback(() => {
    setMutation(null);
  }, []);

  return (
    <section
      id="skills"
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900/20 via-blue-900/20 to-purple-900/20 px-4 py-32 relative scroll-mt-[100px]"
    >
      <h2 className="text-4xl font-bold text-cyan-400 mb-2 font-mono z-10 text-center">
        DNA MODULE ANALYSIS
      </h2>
      <p className="text-lg text-cyan-100 mb-12 max-w-2xl text-center z-10">
        Chaque technologie que j&apos;apprends devient un fragment de mon ADN de développeur.
        Cette section explore les modules qui composent mon code génétique professionnel.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 z-10 w-full max-w-6xl relative">
        <LazyMount className="w-full" style={{ height: 'clamp(500px, 60vh, 800px)' }}>
          <DNAAnalysis
            visibleTechs={visibleTechs}
            hoveredTech={hoveredTech}
            selectedTech={selectedTech}
            mutation={mutation}
            onTechClick={handleTechClick}
            onTechHover={handleTechHover}
            onPositionsReady={handlePositionsReady}
            onMutationComplete={handleMutationComplete}
          />
        </LazyMount>

        <TechList
          selectedTech={selectedTech}
          hoveredTech={hoveredTech}
          onTechClick={handleTechClick}
          onTechHover={handleTechHover}
        />
      </div>

      {/* Compétences sans logo : DevOps, IA, méthodes */}
      <div className="z-10 w-full max-w-6xl mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {SKILLS_EXTRA.map((group) => (
          <div key={group.title}>
            <h3 className="text-lg font-mono text-pink-400 mb-4">
              &gt;&gt; {group.title}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {group.items.map((item) => (
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
    </section>
  );
}