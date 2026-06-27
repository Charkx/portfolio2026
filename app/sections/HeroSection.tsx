"use client"
import dynamic from "next/dynamic"
import TerminalDisplay from "../components/ui/TerminalDisplay"
import { ErrorBoundary } from "../hooks/ErrorBoundary"
import { LazyMount } from "../components/LazyMount"

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
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20"
    >
      <div className="container w-full mx-auto px-4 flex flex-col gap-6 items-center z-10">
        {/* Carte biométrique 3D en grand : porte l'identité (nom, titre, dispo).
            LazyMount : le Canvas n'est vivant que tant que le Hero est à l'écran. */}
        <LazyMount className="w-full h-[72vh] relative">
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

        <TerminalDisplay/>
      </div>
    </section>
  )
}
