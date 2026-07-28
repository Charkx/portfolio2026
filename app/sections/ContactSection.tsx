'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ErrorBoundary } from '../hooks/ErrorBoundary';
import { useSceneStore } from '../store/sceneStore';
import BiometricCard from '../components/3d/BiometricCard';
import { ContactChannels } from '../components/ui/ContactChannels';
import { SiteFooter } from '../components/ui/SiteFooter';
import { SectionTitle } from '../components/ui/SectionTitle';
import { useT } from '../i18n';
import { getDict } from '../i18n';

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

// Révélation à CLIQUET des coordonnées. L'opacité était une fonction pure de la
// progression, donc réversible : un coup de molette vers le haut escamotait l'email
// qu'on venait de lire — le pire moment pour faire disparaître une adresse.
// Hystérésis : ça se fige quand le pied de page arrive, et ça ne se referme que bien
// plus haut, quand on quitte vraiment la station (sinon l'overlay resterait plaqué à
// l'écran par-dessus la section Projets).
//
// Ces seuils se mesurent en PIXELS RESTANTS jusqu'au bas du document, plus en
// pourcentage de progression. Un pourcentage ne veut pas dire la même distance selon
// l'écran : 10 % valaient 160 px sur un portable et 300 px sur un grand moniteur, si
// bien que les coordonnées se figeaient loin avant la fin et qu'il restait une portion
// de scroll où plus rien n'arrivait — le pied de page semblait « détaché » de la
// section. Exprimés en multiples de sa propre hauteur, les paliers tombent au même
// endroit partout : le fondu s'amorce quand il est à deux hauteurs, les coordonnées
// sont figées quand il touche l'écran.
const FOOT_IN = 1;    // × hauteur du pied de page : coordonnées figées
const FOOT_START = 2; // × : début du fondu
const FOOT_OUT = 4;   // × : au-delà, on a quitté la station

// Repli image (WebGL indisponible / reduced-motion)
function CardImage() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/id_card.jpg" alt={getDict().contact.cardAlt} className="w-[300px] max-w-full rounded-lg border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]" />;
}

export default function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);       // étage collant (budget de scroll)
  const cardStageRef = useRef<HTMLDivElement>(null);   // overlay carte (canvas dédié)
  const infoRef = useRef<HTMLDivElement>(null);        // coordonnées terminal sous la carte
  const reducedMotion = useReducedMotion();
  const setEndSession = useSceneStore((s) => s.setEndSessionProgress);
  const setCardActive = useSceneStore((s) => s.setEndSessionCardActive);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [cardPhase, setCardPhase] = useState(false);
  const t = useT();
  const cardPhaseRef = useRef(false);
  const cardActiveRef = useRef(false);
  const revealedRef = useRef(false);   // cliquet de révélation des coordonnées

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Cinématique fin de session — desktop, mouvement autorisé uniquement
  useEffect(() => {
    if (isMobile !== false || reducedMotion) return;

    // L'étage s'arrête au PIED DE PAGE, pas à sa propre fin : il est le dernier élément
    // du document, donc le seul repère qui garantisse qu'on voie l'un ET l'autre. Sans
    // ça, la cinématique se terminait une centaine de pixels avant le bas de la page, et
    // ces derniers pixels — pendant lesquels il ne se passe plus rien — étaient à la
    // charge du visiteur.
    const foot = document.getElementById('page-end');
    const footH = foot?.getBoundingClientRect().height || 120;

    const st = ScrollTrigger.create({
      trigger: stageRef.current,
      start: 'top top',
      end: 'bottom bottom',
      ...(foot ? { endTrigger: foot } : {}),
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        setEndSession(p);

        // distance restante jusqu'au bas du document, dérivée de la progression pour
        // rester en phase avec elle (et non lue sur le scroller, que Lenis lisse).
        const remain = (1 - p) * (self.end - self.start);

        // cliquet : une fois les coordonnées atteintes, elles restent jusqu'à ce qu'on
        // quitte la station pour de bon
        if (remain <= footH * FOOT_IN) revealedRef.current = true;
        else if (remain > footH * FOOT_OUT) revealedRef.current = false;
        const revealed = revealedRef.current;

        const mounted = revealed || p > 0.78;
        if (mounted !== cardPhaseRef.current) { cardPhaseRef.current = mounted; setCardPhase(mounted); }
        const frozen = revealed || p > 0.82;
        if (frozen !== cardActiveRef.current) { cardActiveRef.current = frozen; setCardActive(frozen); }
        if (cardStageRef.current) cardStageRef.current.style.opacity = revealed ? '1' : String(clamp((p - 0.80) / 0.05, 0, 1));

        // coordonnées terminal : le fondu s'amorce à deux hauteurs de pied de page et
        // s'achève quand il touche l'écran — les deux se lisent alors ensemble.
        if (infoRef.current) {
          const fade = clamp((footH * FOOT_START - remain) / (footH * (FOOT_START - FOOT_IN)), 0, 1);
          infoRef.current.style.opacity = revealed ? '1' : String(fade);
          infoRef.current.style.pointerEvents = revealed || fade > 0.9 ? 'auto' : 'none';
        }
      },
    });

    return () => {
      st.kill();
      setEndSession(0);
      setCardActive(false);
      cardActiveRef.current = false;
      cardPhaseRef.current = false;
      revealedRef.current = false;
    };
  }, [isMobile, reducedMotion, setEndSession, setCardActive]);

  // MOBILE : la même désintégration, pilotée par le scroll de la section.
  // Le mobile n'a pas l'étage de 260vh, donc rien ne pilotait `endSessionProgress` :
  // le corps restait planté derrière la carte, et c'est le fond opaque qui le
  // masquait. Le fond retiré, il fallait le faire vraiment disparaître — et le
  // mécanisme existait déjà, il n'était simplement jamais alimenté ici.
  // (mouvement réduit exclu : AugmentedHumanScene y calcule sa propre dissolution
  //  à partir de la progression des fondus, sinon les deux se marcheraient dessus.)
  useEffect(() => {
    if (isMobile !== true || reducedMotion) return;

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom', // la section entre par le bas
      end: 'top 30%',      // son titre est presque en haut → le corps a fini de se dissoudre
      scrub: true,
      // 0.85 = la borne haute de la courbe côté scène : 0 → 0.15 recule la caméra au
      // plan large, 0.15 → 0.85 dissout le corps de haut en bas (cf. AugmentedHumanScene).
      onUpdate: (self) => setEndSession(self.progress * 0.85),
    });

    return () => { st.kill(); setEndSession(0); };
  }, [isMobile, reducedMotion, setEndSession]);

  // --- REDUCED-MOTION : version statique (pas de désintégration ni de séquence caméra) ---
  if (reducedMotion) {
    return (
      // z-20 : le canvas permanent est un calque `fixed` en z-index 5. Les autres
      // sections passent devant grâce à .holo-veil-fade (qui pose z-20) — celle-ci ne
      // porte pas cette classe, elle restait donc DERRIÈRE l'hologramme, invisible.
      // C'est la même valeur que partout ailleurs, pas un cas particulier.
      <section id="contact" ref={sectionRef} className="relative z-20 min-h-[100svh] flex items-center py-20 scroll-mt-20">
        {/* AUCUN fond : comme toutes les autres sections, le monde 3D reste visible
            derrière. Un fond opaque ici faisait de contact la seule section à masquer
            le site. La lisibilité passe par le glass-panel des coordonnées, exactement
            comme About et Skills le font pour leurs blocs de texte. */}
        {/* ancre de station : mappe le scroll pour la caméra */}
        <div data-holo="contact" aria-hidden className="absolute inset-0 pointer-events-none" />
        <div className="container mx-auto px-4 flex flex-col items-center gap-10 relative">
          <SectionTitle
            kicker={t.contact.kicker}
            title={t.contact.title}
            hint={t.contact.hint}
          />
          {/* LA carte, la même qu'à l'entrée (face HUD) — pas la texture de dos.
              Son flottement est figé en mouvement réduit, cf. BiometricCard. */}
          <div className="relative w-full max-w-md h-[22svh] sm:h-[40svh]">
            <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center"><CardImage /></div>}>
              <BiometricCard />
            </ErrorBoundary>
          </div>
          <div className="w-full max-w-xl"><ContactChannels /></div>
        </div>
      </section>
    );
  }

  // --- MOBILE : la carte artefact + coordonnées, SUR le monde 3D comme partout ailleurs ---
  if (isMobile) {
    return (
      // Plus de fond opaque : contact était la seule section à masquer la scène, ce qui
      // la sortait de la DA au lieu de la conclure. `pb-6` et non 20 : le pied de page
      // suit immédiatement et porte déjà sa propre garde sous la barre du HUD — les deux
      // marges s'additionnaient et repoussaient les mentions légales hors de l'écran.
      <section id="contact" ref={sectionRef} className="relative z-20 flex flex-col items-center justify-start gap-3 pt-20 pb-6 px-4 scroll-mt-20">
        {/* ancre 5e station : mappe le scroll pour la caméra */}
        <div data-holo="contact" aria-hidden className="absolute inset-0 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 w-full">
          <SectionTitle
            kicker={t.contact.kicker}
            title={t.contact.title}
          />
          {/* fonctionnement de la section */}
          <p className="-mt-1 text-cyan-400/70 font-mono text-[11px] tracking-wider text-center">
            {t.contact.howto}
          </p>
          {/* LA carte 3D (le même artefact que l'entrée — orbit coupé au tactile).
              22svh : c'est la HAUTEUR qui commande sa taille à l'écran, pas la largeur.
              Sa caméra a une ouverture verticale fixe, si bien que borner `max-w` ne
              l'aurait pas rétrécie d'un pixel — ça n'aurait fait que rogner les marges
              autour. 22svh au lieu de 28 la réduit d'un cinquième dans les deux sens. */}
          <div className="relative w-full max-w-md h-[22svh]">
            <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center"><CardImage /></div>}>
              <BiometricCard />
            </ErrorBoundary>
          </div>
          {/* canaux à nu : pas de panneau. Le bloc mono se lit directement sur la scène,
              comme le terminal d'accueil — c'est le design d'origine. */}
          <div className="w-full max-w-md"><ContactChannels /></div>
        </div>
      </section>
    );
  }

  // --- DESKTOP : cinématique complète (désintégration → carte plein écran → coordonnées) ---
  // fond transparent : le monde 3D permanent (canvas derrière le contenu) sert de décor
  return (
    <section id="contact" ref={sectionRef} className="relative bg-transparent scroll-mt-20">
      <h2 className="sr-only">Contact</h2>

      {/* étage fin de session : le canvas partagé s'y niche plein écran et le corps s'y désintègre */}
      {isMobile === false && (
        <div ref={stageRef} className="relative" style={{ height: '260vh' }}>
          <div className="sticky top-0 h-screen overflow-hidden">
            <div data-holo="contact" className="absolute inset-0" />
          </div>
        </div>
      )}

      {/* carte "artefact" EN GRAND, centrée (comme à l'arrivée sur le site) + coordonnées terminal.
          Fond semi-transparent : l'environnement (voûte + poussière cyan) reste visible derrière */}
      {isMobile === false && cardPhase && (
        <div ref={cardStageRef} className="pointer-events-none fixed inset-0 z-[40] bg-black/30" style={{ opacity: 0 }}>
          {/* pt-16 = la barre HAUTE du HUD (h-16). En BAS il faut réserver bien plus :
              la barre (64 px) ET le pied de page, qui est en flux normal tout en bas du
              document et se retrouve donc dans le même écran que ce calque `fixed`.
              96 px = les 80 px de marge basse du pied de page + sa ligne de texte ;
              pb-32 (128 px) laisse 32 px de respiration au-dessus. Sans cette réserve,
              les coordonnées venaient s'écrire par-dessus les mentions légales — c'est
              à ce calque de céder la place, pas au pied de page, qui n'a nulle part
              où aller. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 pt-16 pb-32">
            {/* titre unifié (même hiérarchie que les autres sections) : le hint sous le
                titre remplace l'ancienne ligne de terminal flottante en bas d'écran —
                elle était le seul élément de ce type du site et se superposait au HUD. */}
            <SectionTitle kicker={t.contact.kicker} title={t.contact.title} hint={t.contact.hint} />
            {/* pointer-events-auto : la carte se tourne à la souris (orbit), comme à l'entrée */}
            <div className="relative w-full max-w-3xl h-[42vh] pointer-events-auto">
              <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center"><CardImage /></div>}>
                <BiometricCard />
              </ErrorBoundary>
            </div>
            <div ref={infoRef} className="w-full max-w-xl" style={{ opacity: 0, pointerEvents: 'none' }}>
              <ContactChannels />
            </div>
          </div>

          {/* Le pied de page, ICI. Ce calque est `fixed` et couvre tout l'écran : celui
              du flux, tout en bas du document, n'entrait dans le champ qu'au dernier
              pixel de scroll — il fallait aller le chercher alors que la page était
              finie. Il s'affiche donc avec la carte, et l'exemplaire du flux s'efface
              pendant ce temps (cf. SiteFooter). pb-20 : la barre basse du HUD, toujours.
              La réserve pb-32 du bloc au-dessus est ce qui lui laisse la place. */}
          <SiteFooter className="pointer-events-auto absolute bottom-0 left-0 right-0 pb-20 text-center text-cyan-100/70 font-mono text-xs" />
        </div>
      )}

    </section>
  );
}
