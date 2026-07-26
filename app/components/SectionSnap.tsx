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
// Durée du voyage : le dézoom sur l'hologramme puis le zoom sur le module de la
// section est le cœur du site, il doit se LIRE en entier. C'est LE curseur de
// rythme des transitions — la seule valeur à toucher pour les régler.
const SNAP_DURATION = 5; // s

// Le voyage est VERROUILLÉ (`lock` dans scrollTo). Sans verrou, Lenis rappelle
// scrollTo() à chaque cran de molette avec sa durée par défaut et écrase l'animation
// en cours : le geste qui déclenche le voyage le tue dans la foulée, et la durée
// ci-dessus n'a plus aucun effet visible.
// Le verrou seul serait une prison, alors on ouvre une porte de sortie. Elle se
// mesure en QUANTITÉ de scroll, pas en délai entre deux crans : une molette classique
// envoie des crans espacés de plusieurs centaines de ms, qu'un critère temporel
// prendrait pour « un nouveau geste » et qui couperaient le voyage sans arrêt.
// Il faut donc pousser franchement pour reprendre la main — un cran perdu ne suffit pas.
const GRACE = 500;        // ms — laisse mourir l'élan du geste déclencheur
const ESCAPE_DELTA = 240; // px cumulés au-delà de la grâce → l'utilisateur veut sortir

/**
 * Snap de section : amorcer le scroll suffit, le site place l'utilisateur
 * sur la section suivante (desktop + Lenis actif uniquement ; en
 * reduced-motion Lenis est absent → scroll natif, aucun détournement).
 */
export default function SectionSnap() {
  useEffect(() => {
    let settled = 0;      // section sur laquelle on est posé
    let snapping = false; // animation en cours → on n'écoute plus
    let release = 0;      // filet : rend la main même si le voyage n'aboutit pas
    let snapStart = 0;    // horodatage du départ (fenêtre de grâce)
    let escapeAcc = 0;    // scroll cumulé pendant le voyage (porte de sortie)

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
      snapStart = performance.now();
      escapeAcc = 0;
      const to = target;
      lenis.scrollTo(T[to], {
        duration: SNAP_DURATION,
        lock: true, // sinon le geste déclencheur écrase l'animation (cf. plus haut)
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        onComplete: () => { settled = to; snapping = false; },
      });

      // Voyage interrompu (reprise de la main, onglet en arrière-plan qui gèle le rAF)
      // → Lenis n'appelle jamais onComplete : sans ce filet, `snapping` resterait vrai
      // et le snap serait mort pour le reste de la session.
      window.clearTimeout(release);
      release = window.setTimeout(() => {
        if (!snapping) return;
        snapping = false;
        settled = nearest(window.scrollY, tops()); // on se ré-ancre là où il s'est arrêté
      }, SNAP_DURATION * 1000 + 150);
    };

    // Porte de sortie : coupe le voyage et rend le scroll immédiatement.
    // stop() annule l'animation ET libère le verrou, start() réactive le scroll —
    // les deux sont l'API publique de Lenis (elles passent toutes deux par reset()).
    const releaseControl = () => {
      const lenis = getLenis();
      if (!lenis) return;
      lenis.stop();
      lenis.start();
      window.clearTimeout(release);
      snapping = false;
      settled = nearest(window.scrollY, tops());
    };

    const onWheel = (e: WheelEvent) => {
      if (!snapping) return;
      if (performance.now() - snapStart < GRACE) return; // encore l'élan du départ
      // deltaY n'est pas toujours en pixels (Firefox molette = lignes, deltaMode 1)
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      escapeAcc += Math.abs(px);
      if (escapeAcc >= ESCAPE_DELTA) releaseControl();
    };

    // un doigt qui se pose pendant le voyage est toujours une intention délibérée
    const onTouch = () => { if (snapping) releaseControl(); };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouch);
      window.clearTimeout(release);
    };
  }, []);

  return null;
}
