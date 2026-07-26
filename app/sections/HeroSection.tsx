"use client"
import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import TerminalDisplay from "../components/ui/TerminalDisplay"
import { ErrorBoundary } from "../hooks/ErrorBoundary"
import { LazyMount } from "../components/LazyMount"
import { usePortfolioStore } from "../store/portfolioStore"
import { useAudioStore } from "../store/audioStore"
import { useDragRotate } from "../hooks/useDragRotate"
import { PROFILE } from "../utils/constants"
import { useT } from "../i18n"

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
  const t = useT()

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
        {/* Identité EN CLAIR tant que l'accès n'est pas ouvert : sans elle, un visiteur
            qui débarque n'a sous les yeux qu'une carte 3D et un message d'erreur rouge.
            aria-hidden : le résumé sr-only de page.tsx porte déjà cette info aux lecteurs
            d'écran — inutile de la leur annoncer deux fois. */}
        {!unlocked && (
          <div className="text-center hud-reveal" aria-hidden="true">
            <div
              className="text-2xl md:text-4xl font-bold text-cyan-300 font-display tracking-wide"
              style={{ textShadow: "0 0 18px rgba(34,211,238,0.45)" }}
            >
              {PROFILE.name.toUpperCase()}
            </div>
            <p className="mt-1.5 text-cyan-100/80 font-mono text-xs md:text-sm tracking-wider">{t.hero.role}</p>
            <p className="mt-1 text-green-400 font-mono text-xs tracking-wider">{t.hero.availability}</p>
          </div>
        )}

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
              <p className="mt-1.5 text-green-400/90 font-mono text-xs tracking-wider" style={{ textShadow: "0 0 8px rgba(0,0,0,0.9)" }}>{t.hero.availability}</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-cyan-400/60 font-mono text-[11px] tracking-[0.25em]">
              <span>{t.hero.scroll}</span>
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
                    <span>{t.hero.module3dKo}</span>
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
                {t.hero.scan}
              </button>
            )}
            {/* Sortie de secours : c'est le chemin d'un visiteur pressé (recruteur), il
                doit donc SE VOIR. En gray-500 il tombait sous le seuil de contraste AA
                et se lisait comme une note de bas de page. */}
            <button
              type="button"
              onClick={() => enterWith(() => setIntroPhase("UNLOCKED"))}
              className="px-5 py-2 rounded-lg border border-cyan-400/25 text-cyan-200/90
                         font-mono text-xs tracking-wider cursor-pointer transition-all
                         hover:border-cyan-400/50 hover:text-cyan-100 hover:bg-cyan-400/5
                         focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {t.hero.skip}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
