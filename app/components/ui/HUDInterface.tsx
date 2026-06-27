"use client"

import type { ReactNode } from "react"

interface HUDInterfaceProps {
  children: ReactNode
  className?: string
}

/**
 * Cadre HUD cyberpunk : encadre son contenu avec des coins lumineux,
 * un liseré néon et un bandeau d'état. Utilisé comme conteneur de section.
 */
export function HUDInterface({ children, className = "" }: HUDInterfaceProps) {
  return (
    <div
      className={`relative w-full rounded-xl border border-cyan-400/30
                  bg-black/40 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,255,255,0.08)]
                  px-4 py-10 sm:px-8 ${className}`}
    >
      {/* Coins lumineux */}
      <span aria-hidden="true" className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-cyan-400/70" />
      <span aria-hidden="true" className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-cyan-400/70" />
      <span aria-hidden="true" className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-cyan-400/70" />
      <span aria-hidden="true" className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-cyan-400/70" />

      {/* Bandeau d'état */}
      <div
        aria-hidden="true"
        className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2
                   text-[10px] font-mono text-cyan-400/70 tracking-widest uppercase"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        HUD_INTERFACE // ONLINE
      </div>

      {children}
    </div>
  )
}

export default HUDInterface
