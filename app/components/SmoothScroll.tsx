"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import { useReducedMotion } from "../hooks/useReducedMotion"
import { useSceneStore } from "../store/sceneStore"
import { usePortfolioStore } from "../store/portfolioStore"

let lenis: Lenis | null = null
let programmatic = false // scroll déclenché par la nav → SectionSnap ne doit PAS s'en mêler

// Accès à l'instance (SectionSnap) — null si reduced-motion (scroll natif, pas de snap)
export const getLenis = () => lenis
// SectionSnap : ignore ses propres calculs pendant un saut de nav
export const isProgrammaticScroll = () => programmatic

/**
 * Cible de scroll d'une section. Normalement le HAUT de l'élément — SAUF « contact »
 * dont le contenu (carte + formulaire) se trouve à la FIN de l'étage 260vh (la
 * désintégration joue avant) : on vise le BAS DE PAGE pour atterrir sur le contenu.
 * Le bas de page plutôt que 97 % de l'étage, parce que le pied de page (mentions
 * légales, obligatoires) vit encore en dessous : viser l'étage seul le laissait sous
 * la ligne de flottaison et obligeait à scroller après avoir cliqué CONTACT. La carte
 * reste affichée à cette position (elle est en overlay `fixed`), donc on ne perd rien.
 * Heuristique desktop : uniquement quand l'étage est bien plus haut que l'écran.
 */
export function sectionTargetY(id: string): number {
  const el = document.getElementById(id)
  if (!el) return 0
  const top = el.getBoundingClientRect().top + window.scrollY
  const range = el.offsetHeight - window.innerHeight
  if (id === "contact" && range > window.innerHeight * 0.8) {
    const maxY = document.documentElement.scrollHeight - window.innerHeight
    return Math.max(top, maxY)
  }
  return Math.max(0, top)
}

/** Scroll fluide vers une section (nav HUD) — direct, sans que SectionSnap s'interpose. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const y = sectionTargetY(id)
  if (lenis) {
    programmatic = true
    // saut de nav : on ne montre que la section actuelle (source) et la cible → les
    // sections traversées restent masquées (synchronisé au canvas via le store)
    const source = usePortfolioStore.getState().currentSection
    useSceneStore.getState().startNavJump(source, id)
    lenis.scrollTo(y, {
      duration: 2.8, // durée du saut (dézoom → voyage → zoom sur la cible)
      lock: true,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      onComplete: () => { programmatic = false; useSceneStore.getState().endNavJump() },
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
