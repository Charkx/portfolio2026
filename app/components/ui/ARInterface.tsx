import React, { useEffect, useState } from 'react';
import { PROFILE } from '../../utils/constants';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useModalStore } from '../../store/modalStore';
import { PdfViewer } from './ModalViewers';
import { Power, PowerOff, FileDown } from 'lucide-react';

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
  const [signalStrength, setSignalStrength] = useState(95);
  const { introPhase, currentSection, scrollProgress, setIntroPhase } = usePortfolioStore();
  const openModal = useModalStore((s) => s.open);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setSignalStrength(90 + Math.random() * 10);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Cluster haut-droit TOUJOURS visible : MEMORY_DUMP (CV) + Power */}
      <div className="pointer-events-auto absolute top-0 right-6 h-16 z-20 flex items-center gap-4">
        <HudTooltip label="Télécharger le CV (memory dump)">
          <a
            href={PROFILE.cv}
            onClick={openCv}
            aria-label="Voir le CV"
            className="flex items-center gap-1.5 font-mono text-xs text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
          >
            <FileDown size={14}/>
            <span className="hidden sm:inline">MEMORY_DUMP</span>
          </a>
        </HudTooltip>
        <HudTooltip label={introPhase === "LOCKED" ? "Déverrouiller l'accès au site" : "Reverrouiller (rejouer l'intro)"}>
          <button
            aria-label={introPhase === "LOCKED" ? "Déverrouiller l'interface" : "Verrouiller l'interface"}
            className="text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
            onClick={() => setIntroPhase(introPhase === "LOCKED" ? "UNLOCKED" : "LOCKED")}
          >
            {introPhase === "LOCKED" ? <Power size={18}/> : <PowerOff size={18}/>}
          </button>
        </HudTooltip>
      </div>
    
      {/* Top HUD */}

   {introPhase !== "LOCKED" && (
      <div className="hud-boot relative w-full h-full">
      <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center h-full pl-6 pr-44 text-cyan-400 font-mono text-sm">

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

          <div className="flex hidden sm:flex items-center space-x-6">
            <div>
              BAT: <span className={booted ? "hud-reveal text-green-400" : "opacity-0"} style={{ '--i': 3 } as React.CSSProperties}>{batteryLevel}%</span>
            </div>
            <div>
              SIG: <span className={booted ? "hud-reveal text-cyan-400" : "opacity-0"} style={{ '--i': 4 } as React.CSSProperties}>{signalStrength.toFixed(0)}%</span>
            </div>
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
                      onClick={() => document.getElementById(item.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
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
    </div>
  );
};
