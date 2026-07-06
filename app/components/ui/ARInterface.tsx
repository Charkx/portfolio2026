import React, { useEffect, useRef, useState } from 'react';
import { PROFILE } from '../../utils/constants';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useModalStore } from '../../store/modalStore';
import { PdfViewer } from './ModalViewers';
import { useAudioStore } from '../../store/audioStore';
import { audioEngine } from '../../lib/audioEngine';
import { scrollToId } from '../SmoothScroll';
import { SignalMeter, SignalToast } from './SignalMeter';
import { Power, PowerOff, FileDown, Volume2, VolumeX } from 'lucide-react';

// Infobulle custom : instantanée et stylée (contrairement au `title` natif).
// `pointer-events-auto` sur le wrapper pour que le :hover se déclenche même
// dans le HUD qui est en pointer-events-none.
function HudTooltip({
  label,
  side = "bottom",
  children,
}: {
  label: string
  side?: "top" | "bottom"
  children: React.ReactNode
}) {
  const pos = side === "top" ? "bottom-full mb-2" : "top-full mt-2"
  return (
    <span className="group relative inline-flex items-center pointer-events-auto">
      {children}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute ${pos} left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-cyan-400/40 bg-black/90 px-2 py-1 text-[10px] font-mono text-cyan-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-50`}
      >
        {label}
      </span>
    </span>
  )
}

export default function ARInterface() {
  const [time, setTime] = useState(new Date());
  const { introPhase, currentSection, scrollProgress, setIntroPhase } = usePortfolioStore();
  const openModal = useModalStore((s) => s.open);
  const soundEnabled = useAudioStore((s) => s.enabled);
  const toggleSound = useAudioStore((s) => s.toggle);
  const volume = useAudioStore((s) => s.volume);
  const setVolume = useAudioStore((s) => s.setVolume);

  // Ouvre le CV dans la modale (sans quitter la page) — le href reste le repli sans JS.
  const openCv = (e: React.MouseEvent) => {
    e.preventDefault();
    openModal({
      title: "CV — Charly Menthiller",
      size: "xl",
      content: <PdfViewer src={PROFILE.cv} downloadName="CV_Charly_Menthiller.pdf" />,
    });
  };
  const booted = introPhase === "BOOTING" || introPhase === "UNLOCKED";
  const batteryLevel = Math.max(1, Math.round(scrollProgress * 100));

  const NAV = [
  { prefix: "COGNITIVE_PROFIL", label: "PROFIL",   section: "about" },
  { prefix: "SCAN_STATUS",      label: "SKILLS",   section: "skills" },
  { prefix: "MEMORY_ACCESS",    label: "PROJECTS", section: "projects" },
  { prefix: "UPLINK",           label: "CONTACT",  section: "contact" },
] as const;

  // Chapitres narratifs : le voyage se lit dans le HUD (change avec la section active)
  const CHAPTERS: Record<string, string> = {
    hero:     "01 · IDENTIFICATION",
    about:    "02 · MÉMOIRE.PROFIL",
    skills:   "03 · STRUCTURE.ADN",
    projects: "04 · MANIPULATION.RÉALITÉ",
    contact:  "05 · DÉCONNEXION",
  };

  // Son du déverrouillage (system power-on) / re-verrouillage (power-down) — no-op si son coupé
  const prevPhase = useRef(introPhase);
  useEffect(() => {
    if (introPhase === prevPhase.current) return;
    if (introPhase === "UNLOCKED") audioEngine.play("boot");
    else if (introPhase === "LOCKED") audioEngine.play("powerdown");
    prevPhase.current = introPhase;
  }, [introPhase]);

  // Scène sonore : musique d'entrée tant que verrouillé, nappe d'ambiance ensuite
  useEffect(() => {
    audioEngine.setScene(introPhase === "LOCKED" ? "entry" : "site");
  }, [introPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Cluster haut-droit TOUJOURS visible : MEMORY_DUMP (CV) + Power */}
      <div className="pointer-events-auto absolute top-0 right-6 h-16 z-20 flex items-center gap-4">
        {/* mobile : la barre d'état étant masquée, la jauge SIG (easter egg) vit ici */}
        {booted && (
          <div className="sm:hidden font-mono text-xs text-cyan-400">
            <SignalMeter booted={booted} />
          </div>
        )}
        <HudTooltip label="Télécharger le CV (memory dump)">
          <a
            href={PROFILE.cv}
            onClick={openCv}
            onMouseEnter={() => audioEngine.play('hover')}
            aria-label="Voir le CV"
            className="flex items-center gap-1.5 font-mono text-xs text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
          >
            <FileDown size={14}/>
            <span className="hidden sm:inline">MEMORY_DUMP</span>
          </a>
        </HudTooltip>
        <div className="flex items-center gap-2">
          <HudTooltip label={soundEnabled ? "Couper le son" : "Activer le son (effets de section)"}>
            <button
              aria-label={soundEnabled ? "Couper le son" : "Activer le son"}
              aria-pressed={soundEnabled}
              className={`transition-colors cursor-pointer ${soundEnabled ? "text-cyan-300 hover:text-cyan-100" : "text-cyan-400/50 hover:text-cyan-200"}`}
              onClick={toggleSound}
              onMouseEnter={() => audioEngine.play('hover')}
            >
              {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
            </button>
          </HudTooltip>
          {/* volume en barres de signal (langage HUD) : cliquer une barre = niveau n/5,
              cliquer alors que le son est coupé = le réactiver à ce niveau */}
          <div role="group" aria-label="Volume du son" className="flex items-end gap-[3px] h-4">
            {[1, 2, 3, 4, 5].map((n) => {
              const lit = soundEnabled && volume >= n / 5 - 0.001;
              return (
                <button
                  key={n}
                  aria-label={`Volume ${n} sur 5`}
                  aria-pressed={lit}
                  onClick={() => setVolume(n / 5)}
                  onMouseEnter={() => audioEngine.play('hover')}
                  className={`w-[4px] rounded-[1px] cursor-pointer transition-colors
                              ${lit ? "bg-cyan-300 hover:bg-cyan-100" : "bg-cyan-400/25 hover:bg-cyan-400/60"}`}
                  style={{ height: `${5 + n * 2.2}px` }}
                />
              );
            })}
          </div>
        </div>
        {/* langue : FR actif, EN à venir (même promesse que la console de calibrage) */}
        <div className="flex items-center gap-1 font-mono text-xs" role="group" aria-label="Langue">
          <button aria-pressed="true" className="text-cyan-300 cursor-pointer">FR</button>
          <span className="text-cyan-400/30" aria-hidden="true">·</span>
          <HudTooltip label="English — bientôt disponible">
            <button disabled className="text-gray-700 cursor-not-allowed">EN</button>
          </HudTooltip>
        </div>
        <HudTooltip label={introPhase === "LOCKED" ? "Déverrouiller l'accès au site" : "Reverrouiller (rejouer l'intro)"}>
          <button
            aria-label={introPhase === "LOCKED" ? "Déverrouiller l'interface" : "Verrouiller l'interface"}
            className="text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
            onClick={() => setIntroPhase(introPhase === "LOCKED" ? "UNLOCKED" : "LOCKED")}
            onMouseEnter={() => audioEngine.play('hover')}
          >
            {introPhase === "LOCKED" ? <Power size={18}/> : <PowerOff size={18}/>}
          </button>
        </HudTooltip>
      </div>
    
      {/* Top HUD */}

   {introPhase !== "LOCKED" && (
      <div className="hud-boot relative w-full h-full">
      <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent">
        {/* pr large : réserve la place du cluster droit (CV + volume + langue + power) */}
        <div className="flex justify-between items-center h-full pl-6 pr-[22rem] text-cyan-400 font-mono text-sm">

            <div className="flex items-center space-x-6">
                ID:
              <div className={booted ? "hud-reveal text-green-400" : "opacity-0"} style={{ '--i': 0 } as React.CSSProperties}>
                <span className="animate-pulse">●</span> {PROFILE.name.toUpperCase()}
              </div>
              <div className="text-cyan-300/80 hidden sm:block ">
                 PROFILE: <span className={booted ? "hud-reveal text-cyan-300/80" : "opacity-0"} style={{ '--i': 1 } as React.CSSProperties}>{PROFILE.title}</span>
              </div>
              <div>
              DEG LEVEL: <span className={booted ? "hud-reveal text-red-400" : "opacity-0"} style={{ '--i': 2 } as React.CSSProperties}>+5</span>
            </div>
            </div>

          {/* Chapitre courant — centré, re-révélé à chaque changement de section */}
          <div aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-0 h-16 hidden md:flex items-center">
            <span key={currentSection} className="hud-reveal font-mono text-xs tracking-[0.35em] text-cyan-300/90">
              {CHAPTERS[currentSection] ?? CHAPTERS.hero}
            </span>
          </div>

          <div className="flex hidden sm:flex items-center space-x-6">
            <div>
              BAT: <span className={booted ? "hud-reveal text-green-400" : "opacity-0"} style={{ '--i': 3 } as React.CSSProperties}>{batteryLevel}%</span>
            </div>
            <SignalMeter booted={booted} />
            <div>
              {time.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-between items-center h-full px-6 text-cyan-400 font-mono text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center gap-4">
              {NAV.map((item, idx) => (        // ← idx = la position
                <div key={item.section} className="flex items-center">
                  <div aria-hidden="true" className="hidden sm:flex text-cyan-400/40">{item.prefix}:</div>
                  <HudTooltip label={`Aller à la section ${item.label}`} side="top">
                    <button
                      aria-label={`Aller à la section ${item.label}`}
                      onClick={() => { audioEngine.play('nav'); scrollToId(item.section); }}
                      onMouseEnter={() => audioEngine.play('hover')}
                      className={`pointer-events-auto cursor-pointer hover:text-cyan-200 transition-colors ${
                        booted
                        ? `hud-reveal ${currentSection === item.section ? "text-green-400" : "text-cyan-400/40"}`
                        : "opacity-0"
                      }`}
                      style={{ '--i': idx + 4 } as React.CSSProperties}
                    >
                      {item.label}
                    </button>
                  </HudTooltip>
                </div>
              ))}
            </div>
          </div>

          <div aria-hidden="true" className="flex hidden sm:flex items-center space-x-6">
            <div>
              MODE: <span className={booted ? "hud-reveal text-cyan-400" : "opacity-0"} style={{ '--i': 9 } as React.CSSProperties}>ALTERNANCE</span>
            </div>
              <div className="text-cyan-300">
                DISPO: <span className={booted ? "hud-reveal text-green-400" : "opacity-0"} style={{ '--i': 10 } as React.CSSProperties}>09/2026</span>
              </div>
          </div>
        </div>
      </div>

      {/* Corner Elements (décoratif) */}
      <div aria-hidden="true">
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400" />
      </div>
      </div>
    )}
    <SignalToast />
    </div>
  );
};
