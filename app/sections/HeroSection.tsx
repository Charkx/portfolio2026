"use client"
import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import TerminalDisplay from "../components/ui/TerminalDisplay"
import { ErrorBoundary } from "../hooks/ErrorBoundary"
import { LazyMount } from "../components/LazyMount"
import { usePortfolioStore } from "../store/portfolioStore"
import { useAudioStore } from "../store/audioStore"
import { useDragRotate } from "../hooks/useDragRotate"

// Canvas 3D (Three.js) chargé côté client après le 1er paint : le shell du Hero
// s'affiche immédiatement, Three.js arrive ensuite → meilleur FCP/LCP.
const BiometricCard = dynamic(() => import("../components/3d/BiometricCard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-cyan-400/50 font-mono text-sm">
      <span className="animate-pulse">{"// initializing biometric scan..."}</span>
    </div>
  ),
})

export default function HeroSection({
  onScan,
}: {
  onScan: () => void
}) {
  const { introPhase, setIntroPhase } = usePortfolioStore()
  const unlocked = introPhase === "UNLOCKED"
  const dragHuman = useDragRotate("human")

  // mobile : pas de canvas permanent (hologramme desktop-only) → après le boot,
  // le hero affiche une identité + la carte gyro au lieu d'un écran vide
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Opt-in audio : le choix se fait dans la console de calibrage, appliqué au clic
  // d'entrée (geste utilisateur → l'AudioContext a le droit de démarrer).
  const setSoundEnabled = useAudioStore((s) => s.setEnabled)
  const enterWith = useCallback((enter: () => void) => {
    setSoundEnabled(useAudioStore.getState().optIn)
    enter()
  }, [setSoundEnabled])

  return (
    <section
      id="hero"
      className="holo-veil-fade relative min-h-screen flex items-center justify-center px-4 pt-16 pb-24 md:py-0"
    >
      {/* Slot corps-entier : le canvas partagé (page) s'y matérialise une fois la carte scannée.
          Desktop déverrouillé : pivoter l'hologramme à la souris. Mobile : le slot reste
          transparent aux gestes (scroll + tap lucioles passent). */}
      <div
        data-holo="hero"
        aria-hidden
        className={`absolute inset-0 ${unlocked && !isMobile ? "z-20 cursor-grab touch-none" : "pointer-events-none"}`}
        {...(unlocked && !isMobile ? dragHuman : {})}
      />

      <div className="container w-full mx-auto px-4 flex flex-col gap-4 items-center z-10">
        {/* Carte biométrique 3D = clé d'entrée du site. Une fois scannée (UNLOCKED) :
            elle s'estompe pour laisser place à l'hologramme (canvas permanent, mobile inclus).
            Mobile : identité compacte superposée — l'hologramme reste la star. */}
        {unlocked && isMobile ? (
          <div className="relative flex flex-col items-center justify-between h-[88svh] pt-1 pb-2 pointer-events-none hud-boot">
            {/* titre seul, sans cadre — placé au-dessus de l'hologramme (ombre pour la lisibilité) */}
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-300 font-display" style={{ textShadow: "0 0 10px rgba(0,0,0,0.9), 0 0 22px rgba(34,211,238,0.55)" }}>
                CHARLY MENTHILLER
              </div>
              <p className="mt-1.5 text-green-400/90 font-mono text-xs tracking-wider" style={{ textShadow: "0 0 8px rgba(0,0,0,0.9)" }}>⏳ Alternance · Septembre 2026</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-cyan-400/60 font-mono text-[11px] tracking-[0.25em]">
              <span>SCROLL</span>
              <span className="animate-bounce text-cyan-300">▾</span>
            </div>
          </div>
        ) : (
          <div
            className="w-full h-[38vh] md:h-[56vh] relative transition-opacity duration-700"
            style={{ opacity: unlocked ? 0 : 1, pointerEvents: unlocked ? "none" : "auto" }}
          >
            <LazyMount className="w-full h-full relative">
              <ErrorBoundary
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-cyan-400/50 font-mono text-sm">
                    <span>{"// module 3D indisponible"}</span>
                  </div>
                }
              >
                <BiometricCard onScan={() => enterWith(onScan)} />
              </ErrorBoundary>
            </LazyMount>
          </div>
        )}

        {/* Terminal : invite au repos, puis scan → CALIBRAGE pas-à-pas → boot */}
        <TerminalDisplay />

        {/* Chemin d'entrée accessible : vrais boutons DOM (clavier + sans WebGL).
            La carte 3D reste le geste "wow", ces boutons garantissent l'accès. */}
        {!unlocked && (
          <div className="flex flex-col items-center gap-3">
            {introPhase === "LOCKED" && (
              <button
                type="button"
                onClick={() => enterWith(onScan)}
                className="px-6 py-2.5 rounded-lg border border-cyan-400/60 bg-cyan-400/5 text-cyan-300
                           font-mono text-sm tracking-[0.2em] cursor-pointer transition-all
                           hover:bg-cyan-400/15 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]
                           focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                INITIER LE SCAN
              </button>
            )}
            <button
              type="button"
              onClick={() => enterWith(() => setIntroPhase("UNLOCKED"))}
              className="text-gray-500 hover:text-cyan-300 font-mono text-xs underline underline-offset-4
                         cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              Passer l&apos;intro
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
