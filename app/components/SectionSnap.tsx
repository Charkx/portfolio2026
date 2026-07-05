'use client';

import { useEffect } from 'react';
import { getLenis, isProgrammaticScroll, sectionTargetY } from './SmoothScroll';

// Sections alignées un-écran (l'intérieur de l'étage contact — 260vh — reste
// scrubbable librement : contact est la dernière ancre, aucun snap vers le bas)
const SECTION_IDS = ['hero', 'about', 'skills', 'projects', 'contact'];

// Déclenchement : dès que l'utilisateur quitte une section de TRIGGER px,
// le site l'emmène à la suivante — le voyage caméra devient une transition
// maîtrisée et l'utilisateur atterrit toujours posé sur la section.
const TRIGGER = 90;
const SNAP_DURATION = 5; // s — laisse le plan large + le voile se lire

/**
 * Snap de section : amorcer le scroll suffit, le site place l'utilisateur
 * sur la section suivante (desktop + Lenis actif uniquement ; en
 * reduced-motion Lenis est absent → scroll natif, aucun détournement).
 */
export default function SectionSnap() {
  useEffect(() => {
    let settled = 0;      // section sur laquelle on est posé
    let snapping = false; // animation en cours → on n'écoute plus

    // cible de chaque section (contact = fin de l'étage, là où la carte + le
    // formulaire s'affichent) — même calcul que la nav HUD
    const tops = () =>
      SECTION_IDS.map((id) => (document.getElementById(id) ? sectionTargetY(id) : Infinity));

    // ancre initiale = section la plus proche (le navigateur peut restaurer le scroll)
    const nearest = (y: number, T: number[]) => {
      let best = 0;
      T.forEach((t, k) => { if (Math.abs(y - t) < Math.abs(y - T[best])) best = k; });
      return best;
    };
    settled = nearest(window.scrollY, tops());

    const onScroll = () => {
      const lenis = getLenis();
      // saut de nav en cours → on laisse la nav faire, sans re-snapper par-dessus
      if (snapping || isProgrammaticScroll() || !lenis || window.innerWidth < 768) return;
      const y = window.scrollY;
      const T = tops();

      // resynchronise : posé pile sur une section (nav HUD, arrivée de snap…)
      T.forEach((t, k) => { if (Math.abs(y - t) < 6) settled = k; });

      const delta = y - T[settled];
      // très loin de l'ancre (scrub interne de l'étage contact, saut nav) → on ré-ancre sans snapper
      if (Math.abs(delta) > window.innerHeight * 1.2) { settled = nearest(y, T); return; }

      let target = -1;
      if (delta > TRIGGER && settled < T.length - 1 && y < T[settled + 1] - 10) target = settled + 1;
      else if (delta < -TRIGGER && settled > 0) target = settled - 1;
      if (target === -1 || !Number.isFinite(T[target])) return;

      snapping = true;
      const to = target;
      lenis.scrollTo(T[to], {
        duration: SNAP_DURATION,
        lock: true, // le geste utilisateur n'interrompt pas le voyage
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        onComplete: () => { settled = to; snapping = false; },
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
