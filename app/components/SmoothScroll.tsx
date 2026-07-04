"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import { useReducedMotion } from "../hooks/useReducedMotion"

let lenis: Lenis | null = null

/** Scroll fluide vers une section (utilisé par la nav HUD) — repli natif si Lenis inactif. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: 0 })
  else el.scrollIntoView({ behavior: "smooth", block: "start" })
}

// Pause/reprise du scroll (ex. pendant qu'une modale est ouverte)
export const lenisStop = () => lenis?.stop()
export const lenisStart = () => lenis?.start()

// Accès à l'instance (SectionSnap) — null si reduced-motion (scroll natif, pas de snap)
export const getLenis = () => lenis

/** Active le smooth scroll Lenis — suit le mouvement réduit EFFECTIF (console
 *  de calibrage OU préférence système) : réduit → scroll natif, pas de snap. */
export default function SmoothScroll() {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    let raf = 0
    const loop = (t: number) => { lenis?.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis?.destroy()
      lenis = null
    }
  }, [reduced])
  return null
}
