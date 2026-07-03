"use client"
import dynamic from "next/dynamic"
import TerminalDisplay from "../components/ui/TerminalDisplay"
import { ErrorBoundary } from "../hooks/ErrorBoundary"
import { LazyMount } from "../components/LazyMount"
import { usePortfolioStore } from "../store/portfolioStore"
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

  return (
    <section
      id="hero"
      className="holo-veil-fade relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20 md:bg-none"
    >
      {/* Slot corps-entier : le canvas partagé (page) s'y matérialise une fois la carte scannée.
          Une fois déverrouillé, on peut faire pivoter l'hologramme à la souris (le terminal reste au-dessus). */}
      <div
        data-holo="hero"
        aria-hidden
        className={`absolute inset-0 ${unlocked ? "z-20 cursor-grab touch-none" : "pointer-events-none"}`}
        {...(unlocked ? dragHuman : {})}
      />

      <div className="container w-full mx-auto px-4 flex flex-col gap-4 items-center z-10">
        {/* Carte biométrique 3D = clé d'entrée du site. Une fois scannée (UNLOCKED),
            elle s'estompe pour laisser place à l'hologramme humain. */}
        <div
          className="w-full h-[52vh] md:h-[56vh] relative transition-opacity duration-700"
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
              <BiometricCard onScan={onScan} />
            </ErrorBoundary>
          </LazyMount>
        </div>

        <TerminalDisplay/>

        {/* Chemin d'entrée accessible : vrais boutons DOM (clavier + sans WebGL).
            La carte 3D reste le geste "wow", ces boutons garantissent l'accès. */}
        {!unlocked && (
          <div className="flex flex-col items-center gap-3">
            {introPhase === "LOCKED" && (
              <button
                type="button"
                onClick={onScan}
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
              onClick={() => setIntroPhase("UNLOCKED")}
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
