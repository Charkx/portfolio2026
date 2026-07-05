"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import { useReducedMotion } from "../hooks/useReducedMotion"
import { useSceneStore } from "../store/sceneStore"

let lenis: Lenis | null = null
let programmatic = false // scroll déclenché par la nav → SectionSnap ne doit PAS s'en mêler

// Accès à l'instance (SectionSnap) — null si reduced-motion (scroll natif, pas de snap)
export const getLenis = () => lenis
// SectionSnap : ignore ses propres calculs pendant un saut de nav
export const isProgrammaticScroll = () => programmatic

/**
 * Cible de scroll d'une section. Normalement le HAUT de l'élément — SAUF « contact »
 * dont le contenu (carte + formulaire) se trouve à la FIN de l'étage 260vh (la
 * désintégration joue avant) : on vise ~97 % de l'étage pour atterrir sur le contenu.
 * Heuristique desktop : uniquement quand l'étage est bien plus haut que l'écran.
 */
export function sectionTargetY(id: string): number {
  const el = document.getElementById(id)
  if (!el) return 0
  const top = el.getBoundingClientRect().top + window.scrollY
  const range = el.offsetHeight - window.innerHeight
  if (id === "contact" && range > window.innerHeight * 0.8) return top + range * 0.97
  return Math.max(0, top)
}

/** Scroll fluide vers une section (nav HUD) — direct, sans que SectionSnap s'interpose. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const y = sectionTargetY(id)
  if (lenis) {
    programmatic = true
    // drapeau store (synchronisé avec le canvas dynamique : caméra plan large + voile plein)
    useSceneStore.getState().setNavJumping(true)
    lenis.scrollTo(y, {
      duration: 1.4, // saut direct et vif (pas le voyage lent section par section)
      lock: true,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      onComplete: () => { programmatic = false; useSceneStore.getState().setNavJumping(false) },
    })
  } else {
    window.scrollTo({ top: y, behavior: "smooth" })
  }
}

// Pause/reprise du scroll (ex. pendant qu'une modale est ouverte)
export const lenisStop = () => lenis?.stop()
export const lenisStart = () => lenis?.start()

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
