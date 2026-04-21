'use client';

import {
  useRef, useEffect, useCallback, memo, useState
} from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import MemoryReconstruction from '../components/3d/MemoryReconstruction';
import { useAudioManager } from '../hooks/useAudioManager';
import { useProjectManager } from '../hooks/useProjectManager';
import type { Project } from '@/app/utils/types';

gsap.registerPlugin(ScrollTrigger);

// --- Données ---

const PROJECTS_DATA: Project[] = [
  {
    title:          'Neural Interface Dashboard',
    description:    'Système de monitoring cybernétique avec analyse biométrique en temps réel et visualisation des flux de données.',
    tech:           ['React', 'Three.js', 'WebGL', 'GSAP'],
    status:         'COMPLETED',
    memId:          'MEM.DAT_001',
    classification: 'LEVEL_7_CLEARANCE',
    extractionTime: 600,
    github:         'https://github.com/username/project-1',
    demo:           'https://project-1.vercel.app',
  },
  {
    title:          'Quantum Data Processor',
    description:    'Moteur de visualisation haute performance pour applications de calcul quantique avec simulation de particules.',
    tech:           ['TypeScript', 'D3.js', 'WebAssembly', 'Shaders'],
    status:         'OPERATIONAL',
    memId:          'MEM.DAT_002',
    classification: 'ACTIVE_DEPLOYMENT',
    extractionTime: 700,
    github:         'https://github.com/username/project-2',
    demo:           'https://project-2.vercel.app',
  },
  {
    title:          'Holographic Memory Bank',
    description:    'Interface 3D immersive pour le stockage et la récupération de données complexes avec reconnaissance gestuelle.',
    tech:           ['Three.js', 'GSAP', 'WebXR', 'AI'],
    status:         'ACTIVE',
    memId:          'MEM.DAT_003',
    classification: 'EXPERIMENTAL',
    extractionTime: 800,
    github:         'https://github.com/username/project-3',
    demo:           'https://project-3.vercel.app',
  },
  {
    title:          'Synthetic Mind Core',
    description:    'Système de support décisionnel IA avec analytics prédictif et intégration de réseau neuronal.',
    tech:           ['Python', 'TensorFlow', 'React', 'Neural'],
    status:         'CLASSIFIED',
    memId:          'MEM.DAT_004',
    classification: 'TOP_SECRET',
    extractionTime: 800,
    github:         'https://github.com/username/project-4',
    demo:           'https://project-4.vercel.app',
  },
];

// --- Constantes ---

const STATUS_COLORS: Record<Project['status'], string> = {
  COMPLETED:   'bg-green-900/70 text-green-300 border-green-400/50',
  OPERATIONAL: 'bg-blue-900/70 text-blue-300 border-blue-400/50',
  ACTIVE:      'bg-yellow-900/70 text-yellow-300 border-yellow-400/50',
  CLASSIFIED:  'bg-red-900/70 text-red-300 border-red-400/50',
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

// --- ProjectCard ---

interface ProjectCardProps {
  project:         Project;
  index:           number;
  isSelected:      boolean;
  isTransitioning: boolean;
  className?:      string;
  role?:           string;
  onSelect:        (index: number) => void;
  onHover:         (index: number | null) => void;
}

const ProjectCard = memo(function ProjectCard({
  project,
  index,
  isSelected,
  isTransitioning,
  className = '',
  role,
  onSelect,
  onHover,
}: ProjectCardProps) {
  return (
    <div
      role={role ?? 'button'}
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Projet ${project.title}`}
      className={`
        group cursor-pointer transition-all duration-300 shrink-0
        p-4 rounded-xl border-2 w-[260px] md:w-[300px] backdrop-blur-sm
        ${isSelected
          ? 'bg-black/80 border-cyan-400/80 shadow-xl shadow-cyan-400/20 ring-2 ring-cyan-400/30'
          : 'border-cyan-400/20 bg-black/40 hover:border-cyan-400/50 hover:bg-black/60'
        }
        ${isTransitioning ? 'pointer-events-none opacity-60' : ''}
        ${className}
      `}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(index);
        }
      }}
    >
      <div className="text-pink-400/70 text-xs mb-2 font-mono">
        {project.memId}
      </div>

      <h3 className="text-sm md:text-base font-bold text-cyan-300 font-mono
                     mb-3 group-hover:text-cyan-200 transition-colors line-clamp-2">
        {project.title}
      </h3>

      <div className="flex flex-wrap gap-1 mb-3">
        {project.tech.slice(0, 3).map((tech) => (
          <span
            key={tech}
            className="text-xs px-2 py-0.5 bg-pink-900/50 text-pink-300
                       rounded border border-pink-400/30 font-mono"
          >
            {tech}
          </span>
        ))}
        {project.tech.length > 3 && (
          <span className="text-xs px-2 py-0.5 bg-gray-900/50 text-gray-400
                           rounded border border-gray-400/30 font-mono">
            +{project.tech.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded font-mono border
                          ${STATUS_COLORS[project.status]}`}>
          {project.status}
        </span>
        {isSelected && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-xs text-cyan-400 font-mono">SELECTED</span>
          </div>
        )}
      </div>
    </div>
  );
});

// --- ProjectInfoPanel ---

const ProjectInfoPanel = memo(function ProjectInfoPanel({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

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
                 backdrop-blur-sm mx-4 overflow-hidden"
      role="region"
      aria-label={`Détails du projet ${project.title}`}
    >
      <div className="p-6 flex flex-col md:flex-row gap-6">

        {/* Colonne gauche : info */}
        <div className="flex-1 space-y-4 min-w-0">
          <div>
            <div className="text-pink-400/70 text-xs font-mono mb-1">
              {project.memId} · {project.classification}
            </div>
            <h3 className="text-xl font-bold text-cyan-300 font-mono">
              {project.title}
            </h3>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">
            {project.description}
          </p>

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
              Statut
            </div>
            <span className={`inline-block text-xs px-3 py-1.5 rounded
                              font-mono border ${STATUS_COLORS[project.status]}`}>
              {project.status}
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
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Démo live de ${project.title}`}
                className="flex items-center justify-center gap-2 px-4 py-2
                           bg-cyan-500 hover:bg-cyan-400 rounded-lg text-black
                           text-sm font-mono font-semibold
                           transition-all duration-200"
              >
                <IconExternalLink />
                Démo live
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer le panneau de détails"
            className="text-xs text-gray-500 hover:text-gray-300 font-mono
                       transition-colors text-center mt-1 cursor-pointer"
          >
            [ fermer ]
          </button>
        </div>
      </div>
    </div>
  );
});

// --- MobileProjectList ---

function MobileProjectList({
  projects,
  selectedProject,
  onSelect,
}: {
  projects:        Project[];
  selectedProject: number | null;
  onSelect:        (index: number) => void;
}) {
  return (
    <ul className="flex flex-col gap-4 px-4 list-none">
      {projects.map((project, index) => {
        const isSelected = selectedProject === index;
        return (
          <li key={project.memId}>
            <article
              className={`
                rounded-xl border-2 p-4 backdrop-blur-sm transition-all duration-300
                ${isSelected
                  ? 'border-cyan-400/80 bg-black/80 shadow-lg shadow-cyan-400/20'
                  : 'border-cyan-400/20 bg-black/40'
                }
              `}
            >
              {/* En-tête cliquable */}
              <button
                onClick={() => onSelect(index)}
                aria-expanded={isSelected}
                aria-controls={`mobile-project-detail-${index}`}
                className="w-full text-left mb-3 cursor-pointer"
              >
                <div className="text-pink-400/70 text-xs font-mono mb-1">
                  {project.memId}
                </div>
                <h3 className="text-base font-bold text-cyan-300 font-mono">
                  {project.title}
                </h3>
              </button>

              {/* Contenu toujours visible sur mobile */}
              <div
                id={`mobile-project-detail-${index}`}
                className="space-y-3"
              >
                <p className="text-gray-400 text-sm leading-relaxed">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-0.5 bg-pink-900/50 text-pink-300
                                 rounded border border-pink-400/30 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className={`text-xs px-2 py-1 rounded font-mono border
                                    ${STATUS_COLORS[project.status]}`}>
                    {project.status}
                  </span>

                  <div className="flex gap-2">
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Code source de ${project.title} sur GitHub`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5
                                   border border-cyan-400/40 rounded-lg text-cyan-300
                                   font-mono hover:bg-cyan-400/10 transition-all"
                      >
                        <IconGithub />
                        GitHub
                      </a>
                    )}
                    {project.demo && (
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Démo live de ${project.title}`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5
                                   bg-cyan-500 hover:bg-cyan-400 rounded-lg
                                   text-black font-mono font-semibold transition-all"
                      >
                        <IconExternalLink />
                        Démo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

// --- Composant principal ---

export function ProjectsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // null = pas encore détecté (SSR safe), évite le flash hydration
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);

  const { playSound, isAudioEnabled } = useAudioManager();
  const {
    selectedProject,
    isTransitioning,
    selectProject,
    reset,
  } = useProjectManager(PROJECTS_DATA);

  // Détection mobile — côté client uniquement
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Animations GSAP d'entrée
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(['.projects-title', '.projects-hint', '.project-card'], {
        opacity: 0, y: 20,
      });

      gsap.timeline({
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
      }, '-=0.3')
      .to('.project-card', {
        opacity: 1, y: 0,
        duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)',
      }, '-=0.2');
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleProjectSelect = useCallback((index: number) => {
    selectProject(index, playSound);
  }, [selectProject, playSound]);

  const handleClose = useCallback(() => {
    reset();
    playSound('hover');
  }, [reset, playSound]);

  const handleTileHover = useCallback((index: number | null) => {
    setHoveredProject(index);
    if (index !== null && isAudioEnabled) playSound('hover');
  }, [playSound, isAudioEnabled]);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="min-h-screen py-20 bg-gradient-to-br from-purple-900/20
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
            MEMORY RECONSTRUCTION
          </h2>
          <p className="projects-hint mt-3 text-gray-400 text-sm md:text-base">
            {isMobile
              ? 'Explore les projets ci-dessous'
              : 'Clique sur une carte pour explorer un projet'
            }
          </p>
        </div>

        {/* Canvas 3D — desktop uniquement, rendu après détection */}
        {isMobile === false && (
          <div
            className="w-full rounded-2xl overflow-hidden border border-cyan-400/20"
            style={{ height: '55vh' }}
          >
            <Canvas gl={{ antialias: true }}>
              <PerspectiveCamera makeDefault position={[0, 2.5, 8]} fov={55} />
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={Math.PI / 4}
                enableDamping
                dampingFactor={0.05}
              />
              <ambientLight intensity={0.3} />
              <pointLight position={[5, 5, 5]}   intensity={2}   color="#00ffff" />
              <pointLight position={[-5, -5, -5]} intensity={1}   color="#ff00ff" />
              <pointLight position={[0, 10, 0]}   intensity={1.5} color="#ffffff" />

              <MemoryReconstruction
                projects={PROJECTS_DATA}
                selectedProject={selectedProject}
                hoveredProject={hoveredProject}
                insertedProject={selectedProject}
                onProjectSelect={handleProjectSelect}
                onProjectInsert={handleProjectSelect}
                onCardHover={handleTileHover}
              />
            </Canvas>
          </div>
        )}

        {/* Contenu selon le device — null = on attend la détection */}
        {isMobile === null ? null : isMobile ? (
          <MobileProjectList
            projects={PROJECTS_DATA}
            selectedProject={selectedProject}
            onSelect={handleProjectSelect}
          />
        ) : (
          <>
            {/* Cards desktop — scroll horizontal */}
            <div
              role="list"
              aria-label="Liste des projets"
              className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1"
            >
              {PROJECTS_DATA.map((project, index) => (
                <ProjectCard
                  key={project.memId}
                  role="listitem"
                  className="project-card"
                  project={project}
                  index={index}
                  isSelected={selectedProject === index}
                  isTransitioning={isTransitioning}
                  onSelect={handleProjectSelect}
                  onHover={handleTileHover}
                />
              ))}
            </div>

            {/* Panneau info */}
            {selectedProject !== null && (
              <ProjectInfoPanel
                project={PROJECTS_DATA[selectedProject]}
                onClose={handleClose}
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
              Decrypting...
            </span>
          </div>
        )}

      </div>
    </section>
  );
}