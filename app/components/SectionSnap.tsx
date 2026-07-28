'use client';

import { useEffect } from 'react';
import { getLenis, isProgrammaticScroll, sectionTargetY } from './SmoothScroll';
import { nearest } from '../utils/scrollMath';

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
const GRACE = 500;       // ms — laisse mourir l'élan du geste déclencheur
// La porte de sortie regarde le SENS du geste, pas seulement sa quantité.
// Pousser DANS le sens du voyage n'est pas une demande de sortie : on emmène déjà
// l'utilisateur là où il va, il est juste impatient. Le laisser couper l'animation
// revenait à sauter le dézoom/zoom de l'hologramme — le cœur du site — précisément
// quand personne ne l'avait demandé. Seul un geste à CONTRE-SENS est sans ambiguïté :
// celui-là veut repartir ailleurs, et on lui rend la main.
const ESCAPE_BACK = 200; // px cumulés à contre-sens au-delà de la grâce

// Après une sortie forcée, le site NE REPREND PAS la main tant que l'utilisateur
// scrolle encore. Sans ce délai, il re-snappait à l'événement `scroll` suivant :
// on reprenait le volant à quelqu'un qui venait tout juste de nous l'arracher, et
// comme `nearest()` peut désigner la section qu'on APPROCHE (et non celle qu'on a
// quittée), la règle « va à la voisine » lisait la descente en cours comme une
// demande de remontée. Résultat : bloqué sur place, en va-et-vient.
// Le réarmement se mesure sur les gestes RÉELS (molette, doigt) et non sur l'événement
// `scroll`, que le lissage de Lenis continue d'émettre bien après le dernier geste.
const REARM_IDLE = 420; // ms sans geste → le site peut de nouveau proposer un snap

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
    let adrift = false;   // l'utilisateur a repris la main → aucun snap tant qu'il scrolle
    let rearm = 0;        // timer de réarmement après une sortie forcée
    let travelDir = 0;    // sens du voyage en cours : +1 descend, -1 remonte

    // cible de chaque section (contact = fin de l'étage, là où la carte + le
    // formulaire s'affichent) — même calcul que la nav HUD
    const tops = () =>
      SECTION_IDS.map((id) => (document.getElementById(id) ? sectionTargetY(id) : Infinity));

    // ancre initiale = section la plus proche (le navigateur peut restaurer le scroll)
    settled = nearest(window.scrollY, tops());

    // Départ d'un voyage — un seul endroit, partagé par le déclenchement normal et
    // par le réarmement après une sortie forcée.
    const startSnap = (to: number, T: number[]) => {
      const lenis = getLenis();
      if (!lenis || !Number.isFinite(T[to])) return;
      snapping = true;
      snapStart = performance.now();
      escapeAcc = 0;
      travelDir = Math.sign(T[to] - window.scrollY) || 1;
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

    // Réarmement après une sortie forcée : quand les gestes cessent, on rejoint
    // l'ancre la PLUS PROCHE — jamais une voisine. C'est la seconde moitié du
    // correctif : `settled` désigne ici une section où l'on n'est jamais arrivé, et
    // lui appliquer la règle « va à la voisine » renvoyait l'utilisateur en arrière.
    const scheduleRearm = () => {
      window.clearTimeout(rearm);
      rearm = window.setTimeout(() => {
        adrift = false;
        if (snapping || isProgrammaticScroll() || window.innerWidth < 768) return;
        const T = tops();
        const k = nearest(window.scrollY, T);
        settled = k;
        const d = Math.abs(window.scrollY - T[k]);
        // au-delà d'un écran et demi, on est dans le scrub interne de l'étage contact
        // (ou juste après un saut de nav) : on se ré-ancre sans rien imposer
        if (d > TRIGGER && d <= window.innerHeight * 1.2) startSnap(k, T);
      }, REARM_IDLE);
    };

    const onScroll = () => {
      const lenis = getLenis();
      // saut de nav en cours → on laisse la nav faire, sans re-snapper par-dessus
      // `adrift` : il vient de reprendre la main, on ne la lui redemande pas tout de suite
      if (snapping || adrift || isProgrammaticScroll() || !lenis || window.innerWidth < 768) return;
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

      startSnap(target, T);
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
      adrift = true; // il a le volant, il le garde tant qu'il pousse
      settled = nearest(window.scrollY, tops());
      scheduleRearm();
    };

    const onWheel = (e: WheelEvent) => {
      // tant qu'il pousse encore, le réarmement est repoussé d'autant
      if (adrift) { scheduleRearm(); return; }
      if (!snapping) return;
      if (performance.now() - snapStart < GRACE) return; // encore l'élan du départ
      // deltaY n'est pas toujours en pixels (Firefox molette = lignes, deltaMode 1)
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      // dans le sens du voyage → on ne sort pas : c'est de l'impatience, pas un refus.
      // L'animation va au bout, et l'utilisateur arrive là où il voulait aller.
      if (Math.sign(px) === travelDir) return;
      escapeAcc += Math.abs(px);
      if (escapeAcc >= ESCAPE_BACK) releaseControl();
    };

    // un doigt qui se pose pendant le voyage est toujours une intention délibérée
    const onTouch = () => {
      if (adrift) { scheduleRearm(); return; }
      if (snapping) releaseControl();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouch);
      window.clearTimeout(release);
      window.clearTimeout(rearm);
    };
  }, []);

  return null;
}
