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

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

// Repli image (WebGL indisponible / reduced-motion)
function CardImage() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/id_card.jpg" alt="Carte d'identité — Charly Menthiller" className="w-[300px] max-w-full rounded-lg border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]" />;
}

export default function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);       // étage collant (budget de scroll)
  const termRef = useRef<HTMLDivElement>(null);        // terminal "fin de session"
  const cardStageRef = useRef<HTMLDivElement>(null);   // overlay carte (canvas dédié)
  const infoRef = useRef<HTMLDivElement>(null);        // coordonnées terminal sous la carte
  const reducedMotion = useReducedMotion();
  const setEndSession = useSceneStore((s) => s.setEndSessionProgress);
  const setCardActive = useSceneStore((s) => s.setEndSessionCardActive);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [cardPhase, setCardPhase] = useState(false);
  const [endLine, setEndLine] = useState('');
  const cardPhaseRef = useRef(false);
  const cardActiveRef = useRef(false);
  const lineRef = useRef('');

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

        const line = p < 0.1 ? ''
          : p < 0.8 ? '> FIN DE SESSION... DÉCONNEXION DU LIEN NEURAL'
          : p < 0.92 ? '> ARTEFACT DÉTECTÉ : CARTE.MENTHILLER_009'
          : '> CANAL DE TRANSMISSION OUVERT';
        if (line !== lineRef.current) { lineRef.current = line; setEndLine(line); }
        if (termRef.current) termRef.current.style.opacity = String(clamp((p - 0.1) / 0.12, 0, 1));

        const mounted = p > 0.78;
        if (mounted !== cardPhaseRef.current) { cardPhaseRef.current = mounted; setCardPhase(mounted); }
        const frozen = p > 0.82;
        if (frozen !== cardActiveRef.current) { cardActiveRef.current = frozen; setCardActive(frozen); }
        if (cardStageRef.current) cardStageRef.current.style.opacity = String(clamp((p - 0.80) / 0.05, 0, 1));

        // coordonnées terminal : apparition juste après que la carte se pose
        if (infoRef.current) {
          infoRef.current.style.opacity = String(clamp((p - 0.90) / 0.06, 0, 1));
          infoRef.current.style.pointerEvents = p > 0.94 ? 'auto' : 'none';
        }
      },
    });
    return () => {
      st.kill();
      setEndSession(0);
      setCardActive(false);
      cardActiveRef.current = false;
      cardPhaseRef.current = false;
    };
  }, [isMobile, reducedMotion, setEndSession, setCardActive]);

  // --- REDUCED-MOTION : version statique (pas de désintégration ni de séquence caméra) ---
  if (reducedMotion) {
    return (
      <section id="contact" ref={sectionRef} className="relative bg-black min-h-screen flex items-center py-20 scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20" />
        <div className="container mx-auto px-4 flex flex-col items-center gap-10 relative">
          <SectionTitle
            kicker="FIN DE SESSION — ARTEFACT DÉTECTÉ"
            title="CONTACT:TRANSMISSION"
            hint="La carte est le seul artefact qui subsiste — établis le lien."
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

  // --- MOBILE : carte CSS 3D (gyroscope) + coordonnées ---
  if (isMobile) {
    return (
      <section id="contact" ref={sectionRef} className="relative min-h-[100svh] flex flex-col items-center justify-center gap-4 pt-16 pb-24 px-4 scroll-mt-20">
        <SectionTitle
          className="relative"
          kicker="FIN DE SESSION — ARTEFACT DÉTECTÉ"
          title="CONTACT:TRANSMISSION"
        />
        {/* slot du canvas partagé : l'hologramme termine son voyage ici (5e ancre) */}
        <div data-holo="contact" aria-hidden className="h-[14svh] w-full" />
        {/* LA carte 3D (le même artefact que l'entrée — orbit coupé au tactile) */}
        <div className="relative w-full max-w-md h-[30svh] z-10">
          <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center"><CardImage /></div>}>
            <BiometricCard />
          </ErrorBoundary>
        </div>
        {/* canaux sur panneau de verre : lisibles par-dessus le voyage (même langage que Skills) */}
        <div className="relative w-full max-w-md glass-panel rounded-xl p-4 z-10"><ContactChannels /></div>
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 py-8">
            {/* titre unifié (même hiérarchie que les autres sections) */}
            <SectionTitle kicker="FIN DE SESSION — ARTEFACT DÉTECTÉ" title="CONTACT:TRANSMISSION" />
            {/* pointer-events-auto : la carte se tourne à la souris (orbit), comme à l'entrée */}
            <div className="relative w-full max-w-3xl h-[48vh] pointer-events-auto">
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

      {/* terminal "fin de session" — au-dessus du canvas et de la carte */}
      <div
        ref={termRef}
        aria-hidden="true"
        className="pointer-events-none fixed bottom-16 inset-x-0 z-[60] text-center font-mono text-cyan-300 text-sm tracking-[0.3em]"
        style={{ opacity: 0 }}
      >
        {endLine}
      </div>
    </section>
  );
}
