import React, { useEffect, useState } from 'react';
import { PROFILE } from '../../utils/constants';
import { usePortfolioStore } from '../../store/portfolioStore';
import { Power, PowerOff } from 'lucide-react';

export default function ARInterface() {
  const [time, setTime] = useState(new Date());
  const [signalStrength, setSignalStrength] = useState(95);
  const { introPhase, currentSection, scrollProgress, setIntroPhase } = usePortfolioStore();
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
      {/* Bouton TOUJOURS visible (même en LOCKED) */}
      <button
        aria-label={introPhase === "LOCKED" ? "Déverrouiller l'interface" : "Verrouiller l'interface"}
        className="text-cyan-400 pointer-events-auto absolute top-0 right-10 h-16 flex items-center"
        onClick={() => setIntroPhase(introPhase === "LOCKED" ? "UNLOCKED" : "LOCKED")}
      >
        {introPhase === "LOCKED" ? <Power size={18}/> : <PowerOff size={18}/>}
      </button>
    
      {/* Top HUD */}

   {introPhase !== "LOCKED" && (
      <div className="hud-boot relative w-full h-full">
      <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center h-full pl-6 pr-20 text-cyan-400 font-mono text-sm">

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
                  <button
                    aria-label={`Aller à la section ${item.label}`}
                    onClick={() => document.getElementById(item.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}                   className={`pointer-events-auto cursor-pointer hover:text-cyan-200 transition-colors ${
                      booted
                      ? `hud-reveal ${currentSection === item.section ? "text-green-400" : "text-cyan-400/40"}`
                      : "opacity-0"
                    }`}
                    style={{ '--i': idx + 4 } as React.CSSProperties}   // ← cascade auto
                  >
                    {item.label}
                  </button>
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
