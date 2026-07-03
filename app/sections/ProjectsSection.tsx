'use client';

import {
  useRef, useEffect, useCallback, useState
} from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audioEngine } from '../lib/audioEngine';
import { useProjectManager } from '../hooks/useProjectManager';
import { useSceneStore } from '../store/sceneStore';
import { useDragRotate } from '../hooks/useDragRotate';
import ProjectCaseStudy from '../components/ui/ProjectCaseStudy';
import ProjectMobileCubes from '../components/ProjectMobileCubes';
import type { Project } from '@/app/utils/types';

gsap.registerPlugin(ScrollTrigger);

// --- Données ---

const PROJECTS_DATA: Project[] = [
  {
    title:          'Arrakis Player Cards',
    description:    'Plateforme communautaire pour une association gaming de 2000 membres. Système de cartes joueurs façon FIFA, alimenté par les performances réelles en compétition.',
    contribution:   'Architecture complète, parseur Excel custom, algorithme de scoring calibré sur données réelles, animations Framer Motion, CI/CD Vercel.',
    tech:           ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Vercel'],
    highlights:     ['Livré seul de bout en bout', 'Données réelles', 'Déployé en production'],
    status:         'COMPLETED',
    memId:          'PRJ.001',
    classification: 'PRODUCTION',
    extractionTime: 600,
    github:         'https://github.com/Charkx/arrakis-cards',
    demo:           'https://arrakis-cards.vercel.app/',
    image:          '/projects/arrakis.png',
    context:        'ASSO',
    short:          'Arrakis',
  },
  {
    title:          "L'Œil Artistique",
    description:    'Site vitrine moderne avec animations avancées, conçu et déployé de bout en bout.',
    contribution:   'Design, développement et déploiement complet.',
    tech:           ['Next.js', 'Tailwind CSS', 'GSAP', 'Vercel'],
    highlights:     ['Animations avancées', 'Performance', 'Déployé en production'],
    status:         'OPERATIONAL',
    memId:          'PRJ.002',
    classification: 'LIVE',
    extractionTime: 600,
    github:         'https://github.com/Charkx/oeilartistique',
    demo:           'https://oeilartistique.vercel.app',
    image:          '/projects/oeil-artistique.png',
    context:        'PRO',
    short:          "L'Œil",
  },
  {
    title:          'Expérience 3D Interactive',
    description:    'Expérience interactive 3D navigable directement dans le navigateur (ce portfolio même).',
    contribution:   'Scènes WebGL temps réel, interactions et animations 3D, intégration React.',
    tech:           ['Three.js', 'React Three Fiber', 'React'],
    highlights:     ['WebGL', 'Animations 3D temps réel'],
    status:         'ACTIVE',
    memId:          'PRJ.003',
    classification: 'EXPERIMENTAL',
    extractionTime: 600,
    github:         'https://github.com/Charkx/components_library_react',
    demo:           '',
    image:          '/projects/portfolio-3d.png',
    context:        'PERSO',
    short:          'Exp. 3D',
  },
  {
    title:          'Poly\'tendo',
    description:    'BDE Polytech Marseille : site web vitrine pour la campagne de BDE.',
    contribution:   'React, Tailwind CSS, animations GSAP, intégration de contenus dynamiques.',
    tech:           ['React', 'Tailwind CSS', 'GSAP'],
    highlights:     ['React', 'IU/UX'],
    status:         'ACTIVE',
    memId:          'PRJ.004',
    classification: 'EXPERIMENTAL',
    extractionTime: 600,
    github:         'https://github.com/Charkx/Poly-tendo',
    demo:           'https://poly-tendo.vercel.app/',
    image:          '/projects/polytendo.png',
    context:        'ECOLE',
    short:          "Poly'tendo",
  },
];

// --- Constantes ---

// Contexte du projet → badge + couleur (puces réacteur, LED, onglet actif)
type ProjectContext = Project['context'];

const CONTEXT_LABEL: Record<ProjectContext, string> = {
  PRO:   'Pro',
  ASSO:  'Asso',
  ECOLE: 'École',
  PERSO: 'Perso',
};

const CONTEXT_HEX: Record<ProjectContext, string> = {
  PRO:   '#3b82f6', // bleu
  ASSO:  '#22c55e', // vert
  ECOLE: '#eab308', // ambre
  PERSO: '#a855f7', // violet
};

// 👉 LAYOUT desktop — compare les deux puis on tranche :
//   'split' = sélecteur à gauche + canvas à droite (2 colonnes)
//   'full'  = 1 colonne : sélecteur compact au-dessus, canvas pleine largeur
const PROJECTS_LAYOUT: 'split' | 'full' = 'split';

// --- GlitchText : décodage scramble → résolution gauche→droite (thème "extraction") ---

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/01';

function GlitchText({ text, duration = 600, className }: { text: string; duration?: number; className?: string }) {
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

// --- DecodeProgress : barre d'extraction qui se remplit sur `duration` ---

function DecodeProgress({ duration, color, runKey }: { duration: number; color: string; runKey: number }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    setPct(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setPct(t * 100);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, runKey]);
  return (
    <div className="h-0.5 w-full bg-cyan-400/10 rounded overflow-hidden mt-2" aria-hidden="true">
      <div className="h-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// --- ProjectSelector : onglets compacts (façon About) — HTML, fonctionne SANS le canvas ---
// Roving tabindex + flèches. Pilote la sélection + le survol (puces 3D). Couleur = contexte.

function ProjectSelector({
  projects, selected, onSelect, onOpen, onHover,
}: {
  projects: Project[];
  selected: number | null;
  onSelect: (i: number) => void;   // flèches : sélectionne (prévisualise)
  onOpen:   (i: number) => void;   // clic/Entrée : déploie le panneau (un seul geste)
  onHover:  (i: number | null) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, dir: number) => {
    const n = (from + dir + projects.length) % projects.length;
    refs.current[n]?.focus();
    onSelect(n);
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); move(i, 1); break;
      case 'ArrowLeft':  case 'ArrowUp':   e.preventDefault(); move(i, -1); break;
      case 'Home':       e.preventDefault(); refs.current[0]?.focus(); onSelect(0); break;
      case 'End':        e.preventDefault(); refs.current[projects.length - 1]?.focus(); onSelect(projects.length - 1); break;
    }
  };

  const tabTarget = selected ?? 0; // roving : l'actif (ou le 1er) est focusable au Tab

  return (
    <div role="group" aria-label="Projets" className="flex flex-wrap gap-1 border-b border-cyan-400/15">
      {projects.map((p, i) => {
        const isSel = selected === i;
        const c = CONTEXT_HEX[p.context];
        return (
          <button
            key={p.memId}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            aria-pressed={isSel}
            tabIndex={i === tabTarget ? 0 : -1}
            aria-label={`${p.title} — ${CONTEXT_LABEL[p.context]}`}
            onClick={() => onOpen(i)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(i)}
            onBlur={() => onHover(null)}
            onKeyDown={(e) => onKeyDown(e, i)}
            style={isSel ? { color: c, borderColor: c, textShadow: `0 0 10px ${c}80` } : undefined}
            className={`project-card -mb-px flex items-center gap-2 px-3 py-1.5 font-mono text-sm
              border-b-2 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
              ${isSel
                ? 'border-current'
                : 'text-cyan-400/40 border-transparent hover:text-cyan-400/80 hover:border-cyan-400/30'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" aria-hidden="true"
                  style={{ background: c, boxShadow: isSel ? `0 0 8px ${c}` : 'none', opacity: isSel ? 1 : 0.5 }} />
            {isSel && '▸ '}{p.short}
          </button>
        );
      })}
    </div>
  );
}

// --- Composant principal ---

export function ProjectsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // null = pas encore détecté (SSR safe), évite le flash hydration
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  const {
    selectedProject,
    isTransitioning,
    selectProject,
  } = useProjectManager(PROJECTS_DATA);

  // Pont vers le réacteur 3D embarqué (les cartes pilotent les puces)
  const setProjectSelected = useSceneStore((s) => s.setProjectSelected);
  const setProjectHovered  = useSceneStore((s) => s.setProjectHovered);
  const setProjectColors   = useSceneStore((s) => s.setProjectColors);
  const setProjectCards    = useSceneStore((s) => s.setProjectCards);
  const setRequestSelectProject = useSceneStore((s) => s.setRequestSelectProject);
  const projectDeployed    = useSceneStore((s) => s.projectDeployed);
  const setProjectDeployed = useSceneStore((s) => s.setProjectDeployed);
  const dragReactor        = useDragRotate('heart');

  // Couleurs de statut + données des cartes flottantes → réacteur (données statiques)
  useEffect(() => {
    setProjectColors(PROJECTS_DATA.map((p) => CONTEXT_HEX[p.context]));
    setProjectCards(PROJECTS_DATA.map((p) => ({
      id: p.memId, title: p.title, tech: p.tech, statusLabel: CONTEXT_LABEL[p.context],
    })));
  }, [setProjectColors, setProjectCards]);

  // Miroir sélection/survol → store (le réacteur lit, reset au démontage)
  useEffect(() => { setProjectSelected(selectedProject); }, [selectedProject, setProjectSelected]);
  useEffect(() => () => { setProjectSelected(null); setProjectHovered(null); }, [setProjectSelected, setProjectHovered]);

  // Détection mobile — côté client uniquement
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Animations GSAP d'entrée — on attend la détection device pour que les
  // cibles (.project-card en desktop) existent réellement dans le DOM.
  useEffect(() => {
    if (isMobile === null) return; // détection pas encore faite

    const ctx = gsap.context(() => {
      gsap.set(['.projects-title', '.projects-hint'], { opacity: 0, y: 20 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger:       sectionRef.current,
          start:         'top 70%',
          toggleActions: 'play none none reverse',
        },
      })
      .to('.projects-title', {
        opacity: 1, y: 0,
        duration: 0.7, ease: 'power3.out',
      })
      .to('.projects-hint', {
        opacity: 1, y: 0,
        duration: 0.5, ease: 'power2.out',
      }, '-=0.3');

      // Le sélecteur .project-card est présent sur desktop ET mobile
      gsap.set('.project-card', { opacity: 0, y: 20 });
      tl.to('.project-card', {
        opacity: 1, y: 0,
        duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)',
      }, '-=0.2');
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile]);

  const handleProjectSelect = useCallback((index: number) => {
    audioEngine.play('ignition');       // cue "wow" de la section Projets
    selectProject(index, () => {});     // (les beeps internes sont remplacés par l'ignition)
  }, [selectProject]);

  // clic sur un chip (ou tap sur le cube mobile) → sélectionne ET déploie le panneau (un seul geste)
  const handleOpen = useCallback((index: number) => {
    handleProjectSelect(index);
    setProjectDeployed(index);
  }, [handleProjectSelect, setProjectDeployed]);

  // Expose la sélection au réacteur 3D (clic sur une carte flottante → sélectionne ici)
  useEffect(() => {
    setRequestSelectProject(handleProjectSelect);
    return () => setRequestSelectProject(null);
  }, [handleProjectSelect, setRequestSelectProject]);

  // Survol d'un module (liste HTML) → met en valeur la puce 3D correspondante
  const handleHover = useCallback((i: number | null) => {
    setProjectHovered(i);
  }, [setProjectHovered]);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="holo-veil-fade min-h-screen py-20 bg-gradient-to-br from-purple-900/20
                 via-pink-900/20 to-blue-900/20 relative overflow-hidden"
      aria-labelledby="projects-title"
    >
      {/* Fond */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
        <div className="scanlines" />
      </div>

      <div className="container mx-auto px-4 flex flex-col gap-8">

        {/* Titre */}
        <div className="text-center pt-8">
          <h2
            id="projects-title"
            className="projects-title text-3xl md:text-5xl font-bold
                       text-cyan-400 font-display"
          >
            PROJECTS:MANIPULATION_REALITE
          </h2>
          <p className="projects-hint mt-3 text-gray-400 text-sm md:text-base">
            {isMobile
              ? "Les fragments de réalité que j'ai construits"
              : 'Quatre fragments de réalité gravitent au-dessus de ma paume — clique sur un cube pour le déployer'
            }
          </p>
        </div>

        {/* Contenu — fonctionne SANS le canvas : sélecteur HTML + fiche (toujours présents).
            Desktop : réacteur 3D en bonus à droite · Mobile : 1 colonne (pas de canvas). */}
        {isMobile === null ? null : (
          <div className={`grid grid-cols-1 gap-12 items-start w-full mx-auto
                           ${PROJECTS_LAYOUT === 'split' ? 'lg:grid-cols-2 max-w-6xl' : 'max-w-5xl'}`}>
            {/* Gauche (toujours) : ligne terminal + sélecteur (chemin clavier de référence) */}
            <div className="flex flex-col gap-4">
              <div className="text-cyan-300/80 text-xs font-mono tracking-wider" aria-hidden="true">
                <GlitchText text="> ACCÈS MÉMOIRE.PROJETS — MANIPULATION DE RÉALITÉ" duration={900} />
              </div>

              <ProjectSelector
                projects={PROJECTS_DATA}
                selected={selectedProject}
                onSelect={handleProjectSelect}
                onOpen={handleOpen}
                onHover={handleHover}
              />

              {/* Mobile : carrousel de Data Cubes CSS 3D (le panneau se déploie au tap) */}
              {isMobile && (
                <div className="pt-8">
                  <ProjectMobileCubes
                    items={PROJECTS_DATA.map((p) => ({ id: p.memId, title: p.title, short: p.short, color: CONTEXT_HEX[p.context] }))}
                    index={selectedProject ?? 0}
                    onChange={(i) => selectProject(i, () => {})}
                    onOpen={handleOpen}
                  />
                </div>
              )}
            </div>

            {/* Droite (desktop only) : réacteur 3D + décodage en BAS du canvas (façon ADN) */}
            {isMobile === false && (
              <div className="relative w-full" style={{ height: '80vh' }}>
                <div
                  data-holo="projects"
                  className="w-full h-full rounded-2xl overflow-hidden border border-cyan-400/20 cursor-grab touch-none"
                  title="Glisse pour faire pivoter"
                  {...dragReactor}
                />

                {selectedProject !== null && (() => {
                  const p = PROJECTS_DATA[selectedProject];
                  const c = CONTEXT_HEX[p.context];
                  return (
                    <div
                      key={selectedProject}
                      className="hud-reveal absolute bottom-3 left-3 right-3 rounded-lg border bg-black/85
                                 backdrop-blur-sm p-3 font-mono pointer-events-none"
                      style={{ borderColor: `${c}66`, boxShadow: `0 0 16px ${c}40` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                        <span className="text-pink-400/70 text-[10px]">{p.memId}</span>
                        <span className="text-cyan-200 text-sm truncate flex-1">
                          <GlitchText text={p.title} duration={p.extractionTime} />
                        </span>
                        <span className="text-[10px] font-bold tracking-wider shrink-0" style={{ color: c }}>
                          {CONTEXT_LABEL[p.context]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.tech.map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-pink-900/50 text-pink-300 border border-pink-400/30">
                            {t}
                          </span>
                        ))}
                      </div>
                      <DecodeProgress duration={p.extractionTime} color={c} runKey={selectedProject} />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Indicateur de transition */}
        {isTransitioning && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Chargement en cours"
            className="flex items-center justify-center gap-3 py-2"
          >
            <div
              className="w-3 h-3 border-2 border-cyan-400
                         border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="text-cyan-400 font-mono text-xs">
              Mise sous tension...
            </span>
          </div>
        )}

      </div>

      {/* panneau étude de cas — déployé à l'explosion d'un cube (ou sélection) */}
      {projectDeployed !== null && PROJECTS_DATA[projectDeployed] && (
        <ProjectCaseStudy project={PROJECTS_DATA[projectDeployed]} onClose={() => setProjectDeployed(null)} />
      )}
    </section>
  );
}