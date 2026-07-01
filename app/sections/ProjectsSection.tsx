'use client';

import {
  useRef, useEffect, useCallback, memo, useState
} from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAudioManager } from '../hooks/useAudioManager';
import { useProjectManager } from '../hooks/useProjectManager';
import { useSceneStore } from '../store/sceneStore';
import { useModalStore } from '../store/modalStore';
import { useDragRotate } from '../hooks/useDragRotate';
import { SiteViewer } from '../components/ui/ModalViewers';
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

const CONTEXT_COLORS: Record<ProjectContext, string> = {
  PRO:   'bg-blue-900/70 text-blue-300 border-blue-400/50',
  ASSO:  'bg-green-900/70 text-green-300 border-green-400/50',
  ECOLE: 'bg-yellow-900/70 text-yellow-300 border-yellow-400/50',
  PERSO: 'bg-purple-900/70 text-purple-300 border-purple-400/50',
};

// --- Icônes ---

function IconGithub() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

// --- ProjectImage (aperçu visuel + placeholder tant que le fichier n'existe pas) ---

function ProjectImage({ src, alt }: { src?: string; alt: string }) {
  const [ok, setOk] = useState(!!src);
  useEffect(() => { setOk(!!src); }, [src]);

  if (!src || !ok) {
    return (
      <div className="relative h-40 md:h-52 w-full flex items-center justify-center
                      bg-gradient-to-br from-cyan-900/20 to-pink-900/20 border-b border-cyan-400/20">
        <div className="scanlines absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true" />
        <span className="text-cyan-400/40 font-mono text-xs">// visuel à venir</span>
      </div>
    );
  }
  return (
    <div className="relative h-40 md:h-52 w-full overflow-hidden border-b border-cyan-400/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`Aperçu — ${alt}`} className="w-full h-full object-cover" onError={() => setOk(false)} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
    </div>
  );
}

// --- ProjectInfoPanel ---

const ProjectInfoPanel = memo(function ProjectInfoPanel({
  project,
}: {
  project: Project;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openModal = useModalStore((s) => s.open);

  // Ouvre la démo live dans la modale (sans quitter la page) — le href reste le repli sans JS.
  const openDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    openModal({ title: `${project.title} — démo live`, size: 'xl', content: <SiteViewer src={project.demo} /> });
  };

  useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }, [project.memId]);

  return (
    <div
      ref={panelRef}
      className="border border-cyan-400/30 rounded-xl bg-black/70
                 backdrop-blur-sm overflow-hidden min-h-[30rem]"
      role="region"
      aria-label={`Détails du projet ${project.title}`}
    >
      <ProjectImage src={project.image} alt={project.title} />

      <div className="p-6 flex flex-col md:flex-row gap-6">

        {/* Colonne gauche : info */}
        <div className="flex-1 space-y-4 min-w-0">
          <div>
            <div className="text-pink-400/70 text-xs font-mono mb-1">
              {project.memId} · {project.classification}
            </div>
            <h3 className="text-xl font-bold text-cyan-300 font-mono">
              <GlitchText text={project.title} duration={project.extractionTime} />
            </h3>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">
            {project.description}
          </p>

          {project.contribution && (
            <div>
              <div className="text-xs text-cyan-400/60 font-mono mb-1 uppercase tracking-wider">
                Ce que j&apos;ai fait
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {project.contribution}
              </p>
            </div>
          )}

          {project.highlights && project.highlights.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {project.highlights.map((h) => (
                <li
                  key={h}
                  className="text-xs px-2.5 py-1 rounded-full border border-cyan-400/30
                             bg-cyan-400/5 text-cyan-200 font-mono"
                >
                  ✓ {h}
                </li>
              ))}
            </ul>
          )}

          <div>
            <div className="text-xs text-cyan-400/60 font-mono mb-2 uppercase tracking-wider">
              Stack technique
            </div>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span
                  key={tech}
                  className="text-xs px-3 py-1 bg-pink-900/50 text-pink-300
                             rounded-full border border-pink-400/30 font-mono"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite : statut + liens */}
        <div className="flex flex-col gap-4 md:w-48 shrink-0">
          <div>
            <div className="text-xs text-cyan-400/60 font-mono mb-2 uppercase tracking-wider">
              Contexte
            </div>
            <span className={`inline-block text-xs px-3 py-1.5 rounded
                              font-mono border ${CONTEXT_COLORS[project.context]}`}>
              {CONTEXT_LABEL[project.context]}
            </span>
          </div>

          {/* Liens */}
          <div className="flex flex-col gap-2 mt-auto">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Code source de ${project.title} sur GitHub`}
                className="flex items-center justify-center gap-2 px-4 py-2
                           border border-cyan-400/40 rounded-lg text-cyan-300
                           text-sm font-mono hover:bg-cyan-400/10
                           hover:border-cyan-400/70 transition-all duration-200"
              >
                <IconGithub />
                GitHub
              </a>
            )}

            {project.demo && (
              <a
                href={project.demo}
                onClick={openDemo}
                aria-label={`Démo live de ${project.title}`}
                className="flex items-center justify-center gap-2 px-4 py-2
                           bg-cyan-500 hover:bg-cyan-400 rounded-lg text-black
                           text-sm font-mono font-semibold cursor-pointer
                           transition-all duration-200"
              >
                <IconExternalLink />
                Démo live
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

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
  projects, selected, onSelect, onHover,
}: {
  projects: Project[];
  selected: number | null;
  onSelect: (i: number) => void;
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
            onClick={() => onSelect(i)}
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

  const { playSound } = useAudioManager();
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
    selectProject(index, playSound);
  }, [selectProject, playSound]);

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
                       text-cyan-400 font-mono"
          >
            PROJECTS:CORE_DIAGNOSTICS
          </h2>
          <p className="projects-hint mt-3 text-gray-400 text-sm md:text-base">
            {isMobile
              ? 'Les modules qui alimentent mon réacteur'
              : 'Chaque projet est un module branché au réacteur — clique pour le mettre en ligne'
            }
          </p>
        </div>

        {/* Contenu — fonctionne SANS le canvas : sélecteur HTML + fiche (toujours présents).
            Desktop : réacteur 3D en bonus à droite · Mobile : 1 colonne (pas de canvas). */}
        {isMobile === null ? null : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start w-full max-w-6xl mx-auto">
            {/* Gauche (toujours) : sélecteur de modules + fiche détail */}
            <div className="flex flex-col gap-4">
              <div className="text-pink-400/70 text-xs font-mono tracking-wider">
                &gt;&gt; MODULES BRANCHÉS — {PROJECTS_DATA.length}
              </div>

              <ProjectSelector
                projects={PROJECTS_DATA}
                selected={selectedProject}
                onSelect={handleProjectSelect}
                onHover={handleHover}
              />

              {selectedProject !== null && (
                <ProjectInfoPanel project={PROJECTS_DATA[selectedProject]} />
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
    </section>
  );
}