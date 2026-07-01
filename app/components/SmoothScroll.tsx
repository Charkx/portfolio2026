"use client"

import { useEffect } from "react"
import Lenis from "lenis"

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

/** Monté une fois : active le smooth scroll Lenis (sauf prefers-reduced-motion). */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    let raf = 0
    const loop = (t: number) => { lenis?.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis?.destroy()
      lenis = null
    }
  }, [])
  return null
}
