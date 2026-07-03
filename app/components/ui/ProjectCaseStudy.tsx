'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import type { Project } from '@/app/utils/types';
import { useModalStore } from '../../store/modalStore';
import { SiteViewer } from './ModalViewers';
import { lenisStart, lenisStop } from '../SmoothScroll';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,iframe,[tabindex]:not([tabindex="-1"])';

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
export default function ProjectCaseStudy({ project, onClose }: { project: Project; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const openModal = useModalStore((s) => s.open);

  useEffect(() => {
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
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, [onClose]);

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
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="cs-materialize relative z-10 w-full max-w-3xl max-h-[90vh] overflow-auto
                   rounded-xl border border-cyan-400/30 bg-[#04070c]/95 outline-none
                   shadow-[0_0_50px_rgba(34,211,238,0.18)]"
      >
        <div className="scanlines pointer-events-none absolute inset-0 opacity-[0.08] rounded-xl" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
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
            {project.resultat ?? (project.highlights?.length ? (
              <ul className="flex flex-wrap gap-2">
                {project.highlights.map((h) => (
                  <li key={h} className="text-xs px-2.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-200 font-mono">
                    ✓ {h}
                  </li>
                ))}
              </ul>
            ) : null)}
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
