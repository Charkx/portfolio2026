'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ErrorBoundary } from '../hooks/ErrorBoundary';
import { useSceneStore } from '../store/sceneStore';
import BiometricCard from '../components/3d/BiometricCard';
import { ContactChannels } from '../components/ui/ContactChannels';
import { SectionTitle } from '../components/ui/SectionTitle';
import { useT } from '../i18n';
import { getDict } from '../i18n';

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

// Révélation à CLIQUET des coordonnées. L'opacité était une fonction pure de la
// progression, donc réversible : un coup de molette vers le haut escamotait l'email
// qu'on venait de lire — le pire moment pour faire disparaître une adresse.
// Hystérésis : ça se révèle à 90 % et ça ne se referme qu'en dessous de 78 %, c'est-à-
// dire quand on quitte vraiment la station (sinon l'overlay resterait plaqué à l'écran
// par-dessus la section Projets).
const REVEAL_IN = 0.90;
const REVEAL_OUT = 0.78;

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

    const st = ScrollTrigger.create({
      trigger: stageRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        setEndSession(p);

        // cliquet : une fois les coordonnées atteintes, elles restent jusqu'à ce qu'on
        // quitte la station pour de bon
        if (p >= REVEAL_IN) revealedRef.current = true;
        else if (p < REVEAL_OUT) revealedRef.current = false;
        const revealed = revealedRef.current;

        const mounted = revealed || p > 0.78;
        if (mounted !== cardPhaseRef.current) { cardPhaseRef.current = mounted; setCardPhase(mounted); }
        const frozen = revealed || p > 0.82;
        if (frozen !== cardActiveRef.current) { cardActiveRef.current = frozen; setCardActive(frozen); }
        if (cardStageRef.current) cardStageRef.current.style.opacity = revealed ? '1' : String(clamp((p - 0.80) / 0.05, 0, 1));

        // coordonnées terminal : apparition juste après que la carte se pose
        if (infoRef.current) {
          infoRef.current.style.opacity = revealed ? '1' : String(clamp((p - 0.90) / 0.06, 0, 1));
          infoRef.current.style.pointerEvents = revealed || p > 0.94 ? 'auto' : 'none';
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

  // --- REDUCED-MOTION : version statique (pas de désintégration ni de séquence caméra) ---
  if (reducedMotion) {
    return (
      <section id="contact" ref={sectionRef} className="relative bg-black min-h-screen flex items-center py-20 scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20" />
        <div className="container mx-auto px-4 flex flex-col items-center gap-10 relative">
          <SectionTitle
            kicker={t.contact.kicker}
            title={t.contact.title}
            hint={t.contact.hint}
          />
          {isMobile === false ? (
            <div data-holo="contact" className="h-72 w-full max-w-lg" />
          ) : (
            <div className="flex justify-center"><CardImage /></div>
          )}
          <div className="w-full max-w-xl"><ContactChannels /></div>
        </div>
      </section>
    );
  }

  // --- MOBILE : la carte artefact SEULE (fond sombre → l'hologramme est masqué) + coordonnées ---
  if (isMobile) {
    return (
      <section id="contact" ref={sectionRef} className="relative z-20 flex flex-col items-center justify-start gap-4 pt-20 pb-8 px-4 scroll-mt-20 bg-[#05070a]">
        {/* ancre 5e station : sert UNIQUEMENT à mapper le scroll (le fond sombre masque
            l'hologramme partagé — au contact, seule la carte subsiste) */}
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
          {/* LA carte 3D, seule (le même artefact que l'entrée — orbit coupé au tactile) */}
          <div className="relative w-full max-w-md h-[40svh]">
            <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center"><CardImage /></div>}>
              <BiometricCard />
            </ErrorBoundary>
          </div>
          {/* canaux : intitulé = la carte parle · valeur = ouvre le canal */}
          <div className="w-full max-w-md glass-panel rounded-xl p-4"><ContactChannels /></div>
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
          {/* py-16 = la hauteur exacte des deux barres du HUD (h-16) : le contenu se
              centre ENTRE elles au lieu de passer dessous. La carte perd 6vh pour que
              l'ensemble tienne encore sur un écran d'ordinateur portable. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 py-16">
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
        </div>
      )}

    </section>
  );
}
