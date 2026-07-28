"use client"

// Doit s'exécuter avant le montage de tout <Canvas> R3F (corrige le crash
// "Invalid argument not valid semver" de l'extension React DevTools).
import "./lib/devtoolsSemverGuard"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import HeroSection from "./sections/HeroSection"
import { CyberpunkLoader } from "./components/ui/LoadingScreen"
import { useOptimizedScroll } from "./hooks/useOptimizedScroll"
import { usePortfolioStore } from "./store/portfolioStore"
import { useModalStore } from "./store/modalStore"
import ARInterface from "./components/ui/ARInterface"
import CustomCursor from "./components/ui/CustomCursor"
import SmoothScroll from "./components/SmoothScroll"
import SectionSnap from "./components/SectionSnap"
import ModalRoot from "./components/ui/ModalRoot"
import LegalContent from "./components/LegalContent"
import { preloadAssets } from "./lib/preloadAssets"
import { ErrorBoundary } from "./hooks/ErrorBoundary"
import { useReducedMotion } from "./hooks/useReducedMotion"
import { useT } from "./i18n"
import { useLangStore } from "./store/langStore"

// Modèles 3D lourds préchargés pendant l'écran de chargement (progression réelle).
const HEAVY_ASSETS = [
  "/3d/holograming_man.glb",
  "/3d/brain_hologram.glb",
]

// Repli d'une section dont le module 3D a planté. `fallback={null}` la faisait
// DISPARAÎTRE en silence : le visiteur parcourait un portfolio amputé sans jamais
// savoir qu'il manquait quelque chose, et la nav du HUD pointait vers une ancre
// inexistante. On conserve donc l'id (nav et snap continuent de fonctionner) et on
// dit ce qui s'est passé, sans jargon d'erreur.
function SectionCrashed({ id, title, message }: { id: string; title: string; message: string }) {
  return (
    <section
      id={id}
      className="relative z-20 min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <h2 className="font-display text-cyan-400 text-lg sm:text-xl">{title}</h2>
      <p className="font-mono text-cyan-400/70 text-xs max-w-md leading-relaxed">{message}</p>
    </section>
  )
}

// Petit fallback pendant le chargement client des sections 3D
function SectionFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-cyan-400/60 font-mono text-sm">
      <span className="animate-pulse">{"// loading module..."}</span>
    </div>
  )
}

// Sections lourdes (Three.js) chargées côté client uniquement (ssr:false) :
// code-split hors du bundle initial, montées dès l'hydratation de la page.
const AboutSection = dynamic(() => import("./sections/AboutSection"), {
  ssr: false,
  loading: SectionFallback,
})
const SkillsSection = dynamic(() => import("./sections/SkillsSection"), {
  ssr: false,
  loading: SectionFallback,
})
const ProjectsSection = dynamic(
  () => import("./sections/ProjectsSection").then((m) => m.ProjectsSection),
  { ssr: false, loading: SectionFallback }
)
const ContactSection = dynamic(() => import("./sections/ContactSection"), {
  ssr: false,
  loading: SectionFallback,
})
// Canvas 3D partagé (humain holographique) — se niche dans les slots des sections migrées
const AugmentedHumanLayer = dynamic(() => import("./components/3d/AugmentedHumanLayer"), {
  ssr: false,
})

export default function ClientApp() {
  // sélecteurs et non `usePortfolioStore()` : sans eux, cette racine se re-rendait
  // à chaque image de scroll (scrollProgress change ~60 fois/s), entraînant tout
  // l'arbre — HUD, canvas 3D et les quatre sections.
  const isLoading = usePortfolioStore((s) => s.isLoading)
  const setIsLoading = usePortfolioStore((s) => s.setIsLoading)
  const introPhase = usePortfolioStore((s) => s.introPhase)
  const setIntroPhase = usePortfolioStore((s) => s.setIntroPhase)
  const t = useT()
  const openModal = useModalStore((s) => s.open)
  const [progress, setProgress] = useState(0)

  // Hook pour améliorer le scroll (expérience utilisateur)
  useOptimizedScroll()

  // Reflète le mouvement réduit EFFECTIF (réglage console OU préférence système)
  // sur <html> → les animations CSS suivent aussi (cf. globals.css [data-motion])
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? "reduced" : "full"
  }, [reducedMotion])

  // <html lang> suit la langue persistée dès le boot (la réhydratation du store
  // ne repasse pas par setLang) puis chaque bascule FR/EN
  const lang = useLangStore((s) => s.lang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // Vrai chargement : précharge les modèles 3D (le loader reflète la progression réelle).
  useEffect(() => {
    let done = false
    const start = performance.now()
    const finish = () => {
      if (done) return
      done = true
      setProgress(100)
      setIsLoading(false)
    }
    preloadAssets(HEAVY_ASSETS, (p) => setProgress(p)).finally(() => {
      // affichage minimum de 900 ms pour ne pas "flasher"
      window.setTimeout(finish, Math.max(0, 900 - (performance.now() - start)))
    })
    const cap = window.setTimeout(finish, 6000) // filet : ne bloque jamais >6 s
    return () => window.clearTimeout(cap)
  }, [setIsLoading])

  if (isLoading) {
    return (
      <div aria-live="polite">
        <CyberpunkLoader progress={progress} />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <SmoothScroll />
      <CustomCursor />
      <ARInterface />
      <main className="relative z-10">
        {/* environnement permanent (voûte + poussière cyan) : présent du verrouillage
            à la carte finale — le corps holographique ne se matérialise qu'au déverrouillage */}
        <AugmentedHumanLayer />

        <HeroSection
          onScan={() => { if (introPhase === "LOCKED") setIntroPhase("SCANNING") }}
        />

        {introPhase === "UNLOCKED" && (
          <>
              {/* amorcer le scroll suffit : le site pose l'utilisateur sur la section suivante */}
              <SectionSnap />
              <ErrorBoundary fallback={<SectionCrashed id="about" title={t.about.title} message={t.misc.sectionKo} />}>
                <AboutSection />
              </ErrorBoundary>
              <ErrorBoundary fallback={<SectionCrashed id="skills" title={t.skills.title} message={t.misc.sectionKo} />}>
                <SkillsSection />
              </ErrorBoundary>
              <ErrorBoundary fallback={<SectionCrashed id="projects" title={t.projects.title} message={t.misc.sectionKo} />}>
                <ProjectsSection />
              </ErrorBoundary>
              <ErrorBoundary fallback={<SectionCrashed id="contact" title={t.contact.title} message={t.misc.sectionKo} />}>
                <ContactSection />
              </ErrorBoundary>
          </>
        )}

        {/* z-[45] : la carte de fin de session est un overlay `fixed` en z-40 qui
            recouvrait ce pied de page et l'assombrissait de son voile — d'où des mentions
            légales « en fondu », qu'on ne pouvait lire qu'en perdant la section contact.
            En passant au-dessus, les deux coexistent. (Le HUD reste en z-50.)
            /30 = 2,3:1 : un contenu obligatoire par la loi ne peut pas être à la limite
            du lisible. /70 passe le seuil AA sans casser la discrétion d'un pied de page. */}
        {/* fond retiré sur mobile aussi : il formait la même bande opaque que la section
            contact, juste en dessous. L'une sans l'autre aurait donné une arête franche. */}
        {/* pb-20 SANS variante desktop : la barre du HUD fait 64 px sur TOUS les écrans
            et se pose par-dessus le contenu. Le `md:pb-6` ne réservait que 24 px, si bien
            qu'en bas de page les mentions légales passaient sous la navigation.
            C'est la même règle que pour les sections, cf. globals.css. */}
        <footer className="relative z-[45] bg-transparent pt-6 pb-20 text-center text-cyan-100/70 font-mono text-xs">
          <span>© {new Date().getFullYear()} Charly Menthiller</span>
          <span className="mx-2">·</span>
          {/* href = repli sans JS (page indexable) · onClick = modale sans quitter la page */}
          <a
            href="/mentions-legales"
            onClick={(e) => {
              e.preventDefault()
              openModal({ title: t.misc.legalModal, size: "md", content: <LegalContent /> })
            }}
            className="hover:text-cyan-300 transition-colors underline"
          >
            {t.misc.footerLegal}
          </a>
        </footer>
      </main>

      <ModalRoot />
    </div>
  )
}
