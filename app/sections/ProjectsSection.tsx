'use client';

import {
  useRef, useEffect, useCallback, useState
} from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audioEngine } from '../lib/audioEngine';
import { useProjectManager } from '../hooks/useProjectManager';
import { useSceneStore } from '../store/sceneStore';
import { useDiscoveryStore } from '../store/discoveryStore';
import { GlitchText } from '../components/ui/SectionTitle';
import { useDragRotate } from '../hooks/useDragRotate';
import { useReducedMotion } from '../hooks/useReducedMotion';
import ProjectCaseStudy from '../components/ui/ProjectCaseStudy';
import ProjectMobileCubes from '../components/ProjectMobileCubes';
import { PROJECTS_DATA } from '../utils/projectsData';
import type { Project } from '@/app/utils/types';

gsap.registerPlugin(ScrollTrigger);

// (données projets → app/utils/projectsData.ts, partagées avec le bloc SEO serveur)

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

// GlitchText : partagé via SectionTitle (tous les kickers de section l'utilisent)

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
  const reducedMotion = useReducedMotion();

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

  // Le panneau attend la fin de l'explosion du cube : les éclats convergent vers
  // l'écran (~650 ms), PUIS l'étude de cas se matérialise — le lien 3D → DOM se lit.
  const [panelVisible, setPanelVisible] = useState(false);
  useEffect(() => {
    if (projectDeployed === null) { setPanelVisible(false); return; }
    // mobile : pas de canvas DataCubes → le cue 'derez' est joué ici
    if (isMobile) audioEngine.play('derez');
    if (reducedMotion) { setPanelVisible(true); return; }
    const t = window.setTimeout(() => setPanelVisible(true), 650);
    return () => window.clearTimeout(t);
  }, [projectDeployed, reducedMotion, isMobile]);

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
    if (reducedMotion) return;     // reduced-motion : contenu affiché tel quel, sans entrée animée

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
  }, [isMobile, reducedMotion]);

  const handleProjectSelect = useCallback((index: number) => {
    audioEngine.play('ignition');       // cue "wow" de la section Projets
    selectProject(index, () => {});     // (les beeps internes sont remplacés par l'ignition)
  }, [selectProject]);

  // clic sur un chip (ou tap sur le cube mobile) → sélectionne ET déploie le panneau (un seul geste)
  // sélection SILENCIEUSE : c'est le 'derez' du déploiement (DataCubes) qui porte le son
  const handleOpen = useCallback((index: number) => {
    selectProject(index, () => {});
    setProjectDeployed(index);
    useDiscoveryStore.getState().discover('cube');
  }, [selectProject, setProjectDeployed]);

  // survol d'un chip → prévisualise : arc d'énergie (projectHovered) + sélection SILENCIEUSE
  // (fiche express + cube mis en avant, sans le son ignition réservé au clic)
  const handleHoverPreview = useCallback((i: number | null) => {
    setProjectHovered(i);
    if (i !== null) selectProject(i, () => {});
  }, [setProjectHovered, selectProject]);

  // Pont canvas → React (survol/clic d'un cube) : sélection SILENCIEUSE — la fiche
  // express suit le survol ; le son du clic est porté par le derez du déploiement
  useEffect(() => {
    const silentSelect = (i: number) => selectProject(i, () => {});
    setRequestSelectProject(silentSelect);
    return () => setRequestSelectProject(null);
  }, [selectProject, setRequestSelectProject]);

  // Survol d'un module (liste HTML) → met en valeur la puce 3D correspondante
  const handleHover = useCallback((i: number | null) => {
    setProjectHovered(i);
  }, [setProjectHovered]);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="holo-veil-fade min-h-screen py-20 lg:h-screen lg:py-0 bg-gradient-to-br from-purple-900/20
                 via-pink-900/20 to-blue-900/20 md:bg-none relative overflow-hidden"
      aria-labelledby="projects-title"
    >
      {/* Fond */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
        <div className="scanlines" />
      </div>

      <div className="container mx-auto px-4 flex flex-col gap-8 lg:h-full lg:justify-center lg:gap-6">

        {/* Titre */}
        <div className="text-center pt-8 lg:pt-14">
          <div className="text-cyan-300/80 text-xs font-mono tracking-[0.25em] mb-2" aria-hidden="true">
            <GlitchText text="> ACCÈS MÉMOIRE.PROJETS — MANIPULATION DE RÉALITÉ" duration={900} />
          </div>
          <h2
            id="projects-title"
            className="projects-title text-3xl md:text-4xl font-bold
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

        {/* Sélecteur : chemin clavier de référence, centré sous le titre — sans cadre,
            la scène POV occupe tout l'écran et reste entièrement interactive */}
        {isMobile === null ? null : (
          <>
            <div className="flex justify-center">
              <ProjectSelector
                projects={PROJECTS_DATA}
                selected={selectedProject}
                onSelect={handleProjectSelect}
                onOpen={handleOpen}
                onHover={handleHoverPreview}
              />
            </div>

            {/* fiche express centrée sous les chips — prévisualisation survol/clavier */}
            {isMobile === false && selectedProject !== null && (() => {
              const p = PROJECTS_DATA[selectedProject];
              const c = CONTEXT_HEX[p.context];
              return (
                <div
                  key={selectedProject}
                  className="hud-reveal mx-auto w-96 max-w-full rounded-lg border bg-black/60 p-3 font-mono pointer-events-none"
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

            {/* Mobile : la narration d'abord — slot du canvas partagé (POV paume + cubes),
                puis le carrousel tapable qui déploie les études de cas */}
            {isMobile && (
              <div data-holo="projects" aria-hidden className="h-[32svh] w-full" />
            )}
            {isMobile && (
              <div className="pt-4 flex justify-center">
                <ProjectMobileCubes
                  items={PROJECTS_DATA.map((p) => ({ id: p.memId, title: p.title, short: p.short, color: CONTEXT_HEX[p.context] }))}
                  index={selectedProject ?? 0}
                  onChange={(i) => selectProject(i, () => {})}
                  onOpen={handleOpen}
                />
              </div>
            )}

            {/* Desktop : toute la zone restante = scène 3D libre (drag de rotation) */}
            {isMobile === false && (
              <div
                data-holo="projects"
                className="w-full grow min-h-[40vh] cursor-grab touch-none"
                title="Glisse pour faire pivoter"
                {...dragReactor}
              />
            )}
          </>
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
      {projectDeployed !== null && panelVisible && PROJECTS_DATA[projectDeployed] && (
        <ProjectCaseStudy project={PROJECTS_DATA[projectDeployed]} accent={CONTEXT_HEX[PROJECTS_DATA[projectDeployed].context]} onClose={() => setProjectDeployed(null)} />
      )}
    </section>
  );
}