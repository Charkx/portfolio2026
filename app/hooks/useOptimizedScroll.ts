"use client"

import { useEffect, useMemo } from "react"
import { usePortfolioStore} from "../store/portfolioStore"

// Ordre du document : la section active se déduit d'une MESURE, pas d'un index.
const SECTIONS = ["hero", "about", "skills", "projects", "contact"]

// Fonction de throttle personnalisée
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean
  return (function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }) as T
}

export function useOptimizedScroll() {
  const { setCurrentSection, setScrollProgress } = usePortfolioStore()

  // useMemo (pas useCallback) : la fonction throttlée n'est créée qu'une fois,
  // sinon throttle() serait ré-exécuté à chaque render
  const handleScroll = useMemo(
    () => throttle(() => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight

      // Section active = celle qui occupe le MILIEU de l'écran, mesurée sur le DOM.
      // L'ancien calcul — floor(scrollY / innerHeight) — supposait que chaque section
      // fait exactement un écran. C'est faux dès qu'un contenu déborde, et franchement
      // faux pour l'étage contact qui fait 260vh : le HUD pouvait donc annoncer une
      // section pendant qu'on en regardait une autre. Il divergeait surtout de
      // sectionTargetY(), qui mesure réellement le DOM et pilote la nav ET le snap :
      // deux sources de vérité pour une même question.
      const mid = scrollY + windowHeight / 2
      let current = SECTIONS[0]
      for (const id of SECTIONS) {
        const el = document.getElementById(id)
        if (!el) continue // les sections lourdes ne sont montées qu'après le boot
        if (mid >= el.getBoundingClientRect().top + scrollY) current = id
      }
      setCurrentSection(current)

      // Progression globale — alimente la jauge BAT du HUD
      const range = document.documentElement.scrollHeight - windowHeight
      setScrollProgress(range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0)
    }, 16), // ~60fps
    [setCurrentSection, setScrollProgress],
  )


  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })

    // Appel initial
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])
}
