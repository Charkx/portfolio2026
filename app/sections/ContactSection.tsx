'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDragRotate } from '../hooks/useDragRotate';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ErrorBoundary } from '../hooks/ErrorBoundary';
import { useSceneStore } from '../store/sceneStore';
import ContactCard from '../components/3d/ContactCard';
import ContactForm from '../components/ui/ContactForm';
import ContactMobileCard from '../components/ContactMobileCard';

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
  const formRef = useRef<HTMLDivElement>(null);        // panneau formulaire (fondu tardif)
  const dragGlobe = useDragRotate('globe');
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
          : '> INTERFACE DE TRANSMISSION ACTIVE';
        if (line !== lineRef.current) { lineRef.current = line; setEndLine(line); }
        if (termRef.current) termRef.current.style.opacity = String(clamp((p - 0.1) / 0.12, 0, 1));

        const mounted = p > 0.78;
        if (mounted !== cardPhaseRef.current) { cardPhaseRef.current = mounted; setCardPhase(mounted); }
        const frozen = p > 0.82;
        if (frozen !== cardActiveRef.current) { cardActiveRef.current = frozen; setCardActive(frozen); }
        if (cardStageRef.current) cardStageRef.current.style.opacity = String(clamp((p - 0.80) / 0.05, 0, 1));

        if (formRef.current) {
          formRef.current.style.opacity = String(clamp((p - 0.93) / 0.07, 0, 1));
          formRef.current.style.pointerEvents = p > 0.96 ? 'auto' : 'none';
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
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative">
          <h2 className="sr-only">Contact</h2>
          {isMobile === false ? (
            <div data-holo="contact" className="h-72 cursor-grab touch-none" title="Glisse pour faire pivoter" {...dragGlobe} />
          ) : (
            <div className="flex justify-center"><CardImage /></div>
          )}
          <div className="flex justify-center"><ContactForm /></div>
        </div>
      </section>
    );
  }

  // --- MOBILE : carte CSS 3D (gyroscope) + formulaire ---
  if (isMobile) {
    return (
      <section id="contact" ref={sectionRef} className="relative bg-black min-h-screen flex flex-col items-center justify-center gap-10 py-20 px-4 scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20" />
        <h2 className="sr-only">Contact</h2>
        <div className="relative"><ContactMobileCard /></div>
        <div className="relative"><ContactForm /></div>
      </section>
    );
  }

  // --- DESKTOP : cinématique complète (désintégration → carte → formulaire) ---
  return (
    <section id="contact" ref={sectionRef} className="relative bg-black scroll-mt-20">
      <h2 className="sr-only">Contact</h2>

      {/* étage fin de session : le canvas partagé s'y niche plein écran et le corps s'y désintègre */}
      {isMobile === false && (
        <div ref={stageRef} className="relative" style={{ height: '260vh' }}>
          <div className="sticky top-0 h-screen overflow-hidden">
            <div
              data-holo="contact"
              className="absolute inset-0 cursor-grab touch-none"
              title="Glisse pour faire pivoter"
              {...dragGlobe}
            />
          </div>
        </div>
      )}

      {/* carte "artefact" + formulaire ancré dessus (canvas dédié, canvas partagé gelé) */}
      {isMobile === false && cardPhase && (
        <div ref={cardStageRef} className="pointer-events-none fixed inset-0 z-[40] bg-black" style={{ opacity: 0 }}>
          <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center"><CardImage /></div>}>
            <ContactCard />
          </ErrorBoundary>
          <div ref={formRef} className="absolute inset-0 flex items-center justify-center p-4" style={{ opacity: 0, pointerEvents: 'none' }}>
            <ContactForm />
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
