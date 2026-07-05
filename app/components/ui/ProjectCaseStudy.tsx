'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { gsap } from 'gsap';
import type { Project } from '@/app/utils/types';
import { useModalStore } from '../../store/modalStore';
import { audioEngine } from '../../lib/audioEngine';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { SiteViewer } from './ModalViewers';
import { lenisStart, lenisStop } from '../SmoothScroll';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,iframe,[tabindex]:not([tabindex="-1"])';

// grille de rematérialisation : le panneau apparaît carré par carré (ordre aléatoire),
// comme si les éclats du cube se réassemblaient en pixels
const TILE_COLS = 12;
const TILE_ROWS = 8;

// Bloc d'étude de cas (CONTEXTE / MA CONTRIBUTION / …)
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <div className="text-xs text-cyan-400/60 font-mono mb-1 uppercase tracking-[0.2em]">{label}</div>
      <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/**
 * Panneau « étude de cas » DOM — se matérialise quand un Data Cube explose (projectDeployed).
 * Accessible : role=dialog, focus piégé/restauré, Échap + clic hors panneau pour fermer.
 * Partagé desktop/mobile · z-[70] (la démo SiteViewer s'ouvre au-dessus en z-[100]).
 */
export default function ProjectCaseStudy({ project, accent = '#22d3ee', onClose }: { project: Project; accent?: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const openModal = useModalStore((s) => s.open);
  const reducedMotion = useReducedMotion();

  // REMATÉRIALISATION : une grille de tuiles (teintées couleur projet) recouvre le
  // panneau puis se dissout carré par carré en ordre aléatoire — les éclats du cube
  // se réassemblent en pixels. Une fois finie, plus AUCUN style animé ne reste.
  useLayoutEffect(() => {
    const panel = panelRef.current, back = backdropRef.current, tiles = tilesRef.current;
    if (!panel || !back) return;
    if (reducedMotion) return; // reduced-motion : fondu CSS (cs-materialize → cs-fade)

    const tl = gsap.timeline();
    tl.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0);
    // le panneau devient visible d'un coup MAIS entièrement couvert par les tuiles
    tl.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.1, clearProps: 'opacity' }, 0.05);
    if (tiles) {
      const cells = Array.from(tiles.children) as HTMLElement[];
      tl.to(cells, {
        opacity: 0, scale: 1.15, duration: 0.16, ease: 'power1.in',
        stagger: { each: 0.006, from: 'random' },
        onComplete: () => { tiles.style.display = 'none'; }, // plus rien ne bouge ensuite
      }, 0.15);
    }
    return () => { tl.kill(); };
  }, [reducedMotion]);

  // FERMETURE inverse : les tuiles recouvrent le panneau carré par carré, le panneau
  // s'éteint, PUIS onClose démonte (→ les éclats 3D refluent reformer le cube)
  const closingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    audioEngine.play('reflow'); // tuiles qui se libèrent → reflux des éclats → cube reformé
    const panel = panelRef.current, back = backdropRef.current, tiles = tilesRef.current;
    if (reducedMotion || !panel || !back || !tiles) { onClose(); return; }
    tiles.style.display = 'grid';
    const cells = Array.from(tiles.children) as HTMLElement[];
    gsap.set(cells, { opacity: 0, scale: 1.15 });
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(cells, { opacity: 1, scale: 1, duration: 0.14, ease: 'power1.out', stagger: { each: 0.005, from: 'random' } }, 0);
    tl.to(panel, { opacity: 0, duration: 0.14 }, '>-0.02');
    tl.to(back, { opacity: 0, duration: 0.22 }, '<');
  }, [onClose, reducedMotion]);

  useEffect(() => {
    audioEngine.play('materialize'); // les tuiles se verrouillent (le derez a joué au clic)
    prevFocus.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenisStop();
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      lenisStart();
      prevFocus.current?.focus?.();
    };
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); requestClose(); return; }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, [requestClose]);

  // démo live dans la modale globale (sans quitter la page) — href reste le repli sans JS
  const openDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    openModal({ title: `${project.title} — démo live`, size: 'xl', content: <SiteViewer src={project.demo} /> });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cs-title"
      onKeyDown={onKeyDown}
    >
      {/* fond assombri — clic pour fermer */}
      <div ref={backdropRef} className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={requestClose} aria-hidden="true" />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`${reducedMotion ? 'cs-materialize' : ''} relative z-10 w-full max-w-3xl max-h-[90vh] overflow-auto
                   rounded-xl border border-cyan-400/30 bg-[#04070c]/95 outline-none
                   shadow-[0_0_50px_rgba(34,211,238,0.18)]`}
        style={reducedMotion ? undefined : { opacity: 0 }}
      >
        {/* scanlines STATIQUES (la version animée .scanlines fait vibrer le texte) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.07]"
          aria-hidden="true"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.35) 2px, rgba(0,255,255,0.35) 4px)' }}
        />

        {/* tuiles de rematérialisation — dissoutes carré par carré puis retirées */}
        {!reducedMotion && (
          <div ref={tilesRef} className="pointer-events-none absolute inset-0 z-30 grid" aria-hidden="true"
               style={{ gridTemplateColumns: `repeat(${TILE_COLS}, 1fr)`, gridTemplateRows: `repeat(${TILE_ROWS}, 1fr)` }}>
            {Array.from({ length: TILE_COLS * TILE_ROWS }).map((_, i) => (
              <span
                key={i}
                style={{ background: '#06121c', border: `1px solid ${accent}26`, boxShadow: `inset 0 0 8px ${accent}22` }}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={requestClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded
                     text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-400/10 text-2xl leading-none
                     transition-colors cursor-pointer"
        >
          ×
        </button>

        {/* screenshot */}
        {project.image && (
          <div className="relative h-44 md:h-56 w-full overflow-hidden rounded-t-xl border-b border-cyan-400/20">
            <Image
              src={project.image}
              alt={`Aperçu — ${project.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#04070c] to-transparent" />
          </div>
        )}

        <div className="p-6 space-y-5">
          <header>
            <div className="text-pink-400/70 text-[11px] font-mono tracking-wider mb-1">
              &gt; DOSSIER PROJET — {project.memId} · {project.classification}
            </div>
            <h2 id="cs-title" className="text-2xl font-bold text-cyan-300 font-mono">{project.title}</h2>
          </header>

          <Block label="Contexte">{project.probleme ?? project.description}</Block>
          <Block label="Ma contribution">{project.solution ?? project.contribution}</Block>
          <Block label="Résultat">
            {project.resultat || project.highlights?.length ? (
              <>
                {project.resultat && <p>{project.resultat}</p>}
                {project.highlights?.length ? (
                  <ul className={`flex flex-wrap gap-2 ${project.resultat ? 'mt-3' : ''}`}>
                    {project.highlights.map((h) => (
                      <li key={h} className="text-xs px-2.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-200 font-mono">
                        ✓ {h}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </Block>

          {/* stack technique */}
          <div>
            <div className="text-xs text-cyan-400/60 font-mono mb-2 uppercase tracking-[0.2em]">Stack technique</div>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span key={t} className="text-xs px-3 py-1 bg-pink-900/50 text-pink-300 rounded-full border border-pink-400/30 font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* liens */}
          <div className="flex flex-wrap gap-3 pt-1">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-cyan-400/40 rounded-lg text-cyan-300 text-sm font-mono
                           hover:bg-cyan-400/10 hover:border-cyan-400/70 transition-all cursor-pointer"
              >
                VOIR LE CODE
              </a>
            )}
            {project.demo && (
              <a
                href={project.demo}
                onClick={openDemo}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-black text-sm font-mono
                           font-semibold transition-all cursor-pointer"
              >
                LANCER LA DÉMO
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
