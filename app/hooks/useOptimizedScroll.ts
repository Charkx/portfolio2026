"use client"

import { useEffect, useCallback } from "react"
import { usePortfolioStore } from "../store/portfolioStore"

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
  const { setCurrentSection, setScrollY, setSkillsProgress, setInterferenceLevel } = usePortfolioStore()

  const handleScroll = useCallback(
    throttle(() => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // Mise à jour de la position de scroll
      setScrollY(scrollY)

      // Calcul de la section actuelle
      const sections = ["hero", "about", "skills", "projects", "contact"]
      const sectionHeight = windowHeight
      const currentSectionIndex = Math.floor(scrollY / sectionHeight)
      const currentSection = sections[Math.min(currentSectionIndex, sections.length - 1)]

      setCurrentSection(currentSection)

      // Calcul du progrès des compétences (section skills)
      const skillsStart = sectionHeight * 2 // Section skills est la 3ème
      const skillsEnd = sectionHeight * 3

      if (scrollY >= skillsStart && scrollY <= skillsEnd) {
        const skillsProgress = Math.min(6, Math.floor(((scrollY - skillsStart) / (skillsEnd - skillsStart)) * 6))
        setSkillsProgress(skillsProgress)
      }

      // Calcul du niveau d'interférence basé sur le scroll
      const scrollProgress = scrollY / (documentHeight - windowHeight)
      const interferenceLevel = 0.3 + scrollProgress * 0.4 // Entre 0.3 et 0.7
      setInterferenceLevel(interferenceLevel)
    }, 16), // ~60fps
    [setCurrentSection, setScrollY, setSkillsProgress, setInterferenceLevel],
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
