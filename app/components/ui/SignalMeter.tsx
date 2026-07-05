"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  useDiscoveryStore,
  SIGNALS,
  discoveryProgress,
  isDiscoveryComplete,
} from "../../store/discoveryStore"
import { audioEngine } from "../../lib/audioEngine"

/**
 * Jauge SIG du HUD — reflète les 5 signaux cachés captés (0 → 100 %).
 * À 100 %, la jauge se change en bouton lumineux ouvrant la transmission secrète.
 * Au survol : panneau détaillant les signaux captés / encore masqués.
 */
export function SignalMeter({ booted }: { booted: boolean }) {
  const router = useRouter()
  const found = useDiscoveryStore((s) => s.found)
  const pct = Math.round(discoveryProgress(found) * 100)
  const complete = isDiscoveryComplete(found)

  const open = () => {
    audioEngine.play("success")
    router.push("/transmission")
  }

  return (
    <div className="group relative pointer-events-auto">
      {complete ? (
        <button
          onClick={open}
          onMouseEnter={() => audioEngine.play("hover")}
          aria-label="Signal complet — ouvrir la transmission secrète"
          className="font-mono text-green-300 hover:text-green-100 animate-pulse cursor-pointer transition-colors"
          style={{ textShadow: "0 0 8px rgba(74,222,128,0.8)" }}
        >
          SIG: <span className="tracking-wider">[ACCÈS] ▸</span>
        </button>
      ) : (
        <span>
          SIG:{" "}
          <span
            className={booted ? "hud-reveal text-cyan-400" : "opacity-0"}
            style={{ "--i": 4 } as React.CSSProperties}
          >
            {booted ? pct : 0}%
          </span>
        </span>
      )}

      {/* Panneau de détail — checklist des signaux (captés en clair, masqués sinon) */}
      <div
        className="pointer-events-none absolute right-0 top-full mt-3 w-60 rounded border border-cyan-400/40
                   bg-black/90 backdrop-blur-sm p-3 font-mono text-[10px] leading-relaxed
                   opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 z-50"
      >
        <div className="mb-1.5 tracking-widest text-cyan-300/90">
          &gt; SIGNAUX CAPTÉS · {found.length}/{SIGNALS.length}
        </div>
        {SIGNALS.map((sig) => {
          const got = found.includes(sig.id)
          return (
            <div
              key={sig.id}
              className={got ? "text-cyan-300" : "text-cyan-400/30"}
            >
              {got ? `◆ ${sig.label}` : "◇ ▓▓▓▓ ▓▓▓▓"}
            </div>
          )
        })}
        <div className="mt-2 pt-2 border-t border-cyan-400/15 text-[9px] tracking-wide">
          {complete ? (
            <span className="text-green-400">▸ TRANSMISSION DÉVERROUILLÉE</span>
          ) : (
            <span className="text-cyan-400/50">Capte tous les signaux pour déverrouiller</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Toast éphémère à chaque signal nouvellement capté (feedback + son).
 * Se monte à la racine du HUD ; disparaît seul après ~2,6 s.
 */
export function SignalToast() {
  const lastFound = useDiscoveryStore((s) => s.lastFound)
  const clearLast = useDiscoveryStore((s) => s.clearLast)
  const found = useDiscoveryStore((s) => s.found)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!lastFound) return
    const complete = isDiscoveryComplete(found)
    audioEngine.play(complete ? "success" : "activation")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => clearLast(), 2600)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [lastFound, found, clearLast])

  const sig = SIGNALS.find((s) => s.id === lastFound)
  const complete = isDiscoveryComplete(found)
  const pct = Math.round(discoveryProgress(found) * 100)

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-[70]
                  font-mono text-center transition-all duration-300
                  ${lastFound ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
    >
      {sig && (
        <div
          className={`rounded border px-4 py-2 backdrop-blur-sm
                      ${complete ? "border-green-400/60 bg-green-950/40" : "border-cyan-400/50 bg-black/80"}`}
        >
          <div className={`text-xs tracking-widest ${complete ? "text-green-300" : "text-cyan-300"}`}>
            ◆ {sig.label}
          </div>
          <div className={`mt-0.5 text-[10px] ${complete ? "text-green-400" : "text-cyan-400/70"}`}>
            {complete ? "SIGNAL COMPLET — TRANSMISSION DÉVERROUILLÉE" : `SIGNAL +20% · SIG ${pct}%`}
          </div>
        </div>
      )}
    </div>
  )
}
