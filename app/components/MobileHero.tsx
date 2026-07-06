'use client';

import { useMemo, useState } from 'react';
import { PROFILE } from '../utils/constants';
import { GlitchText } from './ui/SectionTitle';
import ContactMobileCard from './ContactMobileCard';
import { scrollToId } from './SmoothScroll';
import { audioEngine } from '../lib/audioEngine';
import { useDiscoveryStore } from '../store/discoveryStore';

// Hero MOBILE après le boot : le canvas permanent (hologramme) est desktop-only,
// donc on affiche une identité claire + la carte gyroscope (l'artefact qui a servi
// de clé) + des lucioles de données TAPABLES — l'équivalent tactile de la récolte
// au survol du desktop (signal SIG "firefly" capturable sur mobile).

type Mote = { id: number; left: string; top: string; delay: string; popped: boolean };

function DataMotes() {
  const [motes, setMotes] = useState<Mote[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      left: `${12 + Math.random() * 76}%`,
      top: `${8 + Math.random() * 80}%`,
      delay: `${(i * 0.9).toFixed(1)}s`,
      popped: false,
    })),
  );

  const collect = (id: number) => {
    audioEngine.play('collect');
    useDiscoveryStore.getState().discover('firefly');
    setMotes((ms) => ms.map((m) => (m.id === id ? { ...m, popped: true } : m)));
  };

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {motes.map((m) => (
        <button
          key={m.id}
          type="button"
          tabIndex={-1}
          onClick={() => collect(m.id)}
          className={`pointer-events-auto absolute h-4 w-4 rounded-full bg-cyan-300/90 mote-float
                      transition-all duration-500 ${m.popped ? 'scale-[3] opacity-0 pointer-events-none' : ''}`}
          style={{ left: m.left, top: m.top, animationDelay: m.delay, boxShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 24px rgba(34,211,238,0.4)' }}
        />
      ))}
    </div>
  );
}

export default function MobileHero() {
  // les CTA suivent la nav du HUD (même son, même scroll)
  const go = useMemo(
    () => (id: string) => () => { audioEngine.play('nav'); scrollToId(id); },
    [],
  );

  return (
    <div className="relative w-full flex flex-col items-center gap-7 py-6 hud-boot">
      <DataMotes />

      {/* identité (le h1 SEO vit dans le shell serveur — ici c'est le visuel) */}
      <div className="text-center">
        <div className="text-green-400 font-mono text-[11px] tracking-[0.3em] mb-3">
          ● SESSION ACTIVE
        </div>
        <div className="text-4xl font-bold text-cyan-300 font-display leading-tight" style={{ textShadow: '0 0 18px rgba(34,211,238,0.5)' }}>
          <GlitchText text="CHARLY" duration={700} /><br />
          <GlitchText text="MENTHILLER" duration={1000} />
        </div>
        <p className="mt-3 text-cyan-100/90 font-mono text-sm">{PROFILE.title}</p>
        <p className="mt-1 text-green-400/90 font-mono text-xs tracking-wider">⏳ {PROFILE.availability}</p>
      </div>

      {/* l'artefact-clé, inclinable au gyroscope */}
      <ContactMobileCard />

      {/* accès directs */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={go('projects')}
          className="w-full rounded-lg px-6 py-3 font-mono text-sm font-semibold tracking-[0.15em] bg-cyan-500 text-black active:bg-cyan-400 transition-colors"
        >
          ▸ VOIR LES PROJETS
        </button>
        <button
          type="button"
          onClick={go('contact')}
          className="w-full rounded-lg px-6 py-3 font-mono text-sm tracking-[0.15em] border border-cyan-400/60 text-cyan-300 active:bg-cyan-400/10 transition-colors"
        >
          ME CONTACTER
        </button>
      </div>
    </div>
  );
}
