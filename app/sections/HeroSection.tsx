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
  const { introPhase } = usePortfolioStore()
  const unlocked = introPhase === "UNLOCKED"
  const dragHuman = useDragRotate("human")

  return (
    <section
      id="hero"
      className="holo-veil-fade relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20"
    >
      {/* Slot corps-entier : le canvas partagé (page) s'y matérialise une fois la carte scannée.
          Une fois déverrouillé, on peut faire pivoter l'hologramme à la souris (le terminal reste au-dessus). */}
      <div
        data-holo="hero"
        aria-hidden
        className={`absolute inset-0 ${unlocked ? "z-20 cursor-grab touch-none" : "pointer-events-none"}`}
        {...(unlocked ? dragHuman : {})}
      />

      <div className="container w-full mx-auto px-4 flex flex-col gap-6 items-center z-10">
        {/* Carte biométrique 3D = clé d'entrée du site. Une fois scannée (UNLOCKED),
            elle s'estompe pour laisser place à l'hologramme humain. */}
        <div
          className="w-full h-[72vh] relative transition-opacity duration-700"
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
      </div>
    </section>
  )
}
