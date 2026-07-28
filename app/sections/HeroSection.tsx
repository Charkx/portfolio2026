"use client"
import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import TerminalDisplay from "../components/ui/TerminalDisplay"
import { ErrorBoundary } from "../hooks/ErrorBoundary"
import { LazyMount } from "../components/LazyMount"
import { usePortfolioStore } from "../store/portfolioStore"
import { useAudioStore } from "../store/audioStore"
import { useDragRotate } from "../hooks/useDragRotate"
import { scrollToId } from "../components/SmoothScroll"
import { PROFILE } from "../utils/constants"
import { useModalStore } from "../store/modalStore"
import { PdfViewer, CalendlyViewer } from "../components/ui/ModalViewers"
import { GlitchText } from "../components/ui/SectionTitle"
import { useT } from "../i18n"

// Canvas 3D (Three.js) chargé côté client après le 1er paint : le shell du Hero
// s'affiche immédiatement, Three.js arrive ensuite → meilleur FCP/LCP.
const BiometricCard = dynamic(() => import("../components/3d/BiometricCard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-cyan-400/70 font-mono text-sm">
      <span className="animate-pulse">{"// initializing biometric scan..."}</span>
    </div>
  ),
})

export default function HeroSection({
  onScan,
}: {
  onScan: () => void
}) {
  const introPhase = usePortfolioStore((s) => s.introPhase)
  const setIntroPhase = usePortfolioStore((s) => s.setIntroPhase)
  const unlocked = introPhase === "UNLOCKED"
  const dragHuman = useDragRotate("human")
  const openModal = useModalStore((s) => s.open)
  const t = useT()

  // mêmes modales que le HUD et la section contact — un seul chemin de lecture par action
  const openCv = useCallback(() => {
    openModal({
      title: t.hud.cvModalTitle,
      size: "xl",
      content: <PdfViewer src={PROFILE.cv} downloadName="CV_Charly_Menthiller.pdf" />,
    })
  }, [openModal, t])

  // (pas de setEndSessionSent ici : la célébration du code-barres est un clin d'œil
  //  propre à la section contact, il n'a pas de sens depuis l'écran d'accueil)
  const openCalendly = useCallback(() => {
    openModal({
      title: t.contact.calendlyModal,
      size: "lg",
      content: <CalendlyViewer src={PROFILE.calendly} />,
    })
  }, [openModal, t])

  // mobile : pas de canvas permanent (hologramme desktop-only) → après le boot,
  // le hero affiche une identité + la carte gyro au lieu d'un écran vide
  // Compteur de re-décodage : changer la `key` de GlitchText le remonte, donc rejoue
  // le scramble. Aucun ajout au composant — il sait déjà faire, et il respecte déjà
  // le mouvement réduit (il rend le texte final sans jamais le brouiller).
  const [decode, setDecode] = useState(0)
  const [scan, setScan] = useState(0) // relevé de droite : re-scan en cascade
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Opt-in audio : le choix se fait dans la console de calibrage, appliqué au clic
  // d'entrée (geste utilisateur → l'AudioContext a le droit de démarrer).
  const setSoundEnabled = useAudioStore((s) => s.setEnabled)
  const enterWith = useCallback((enter: () => void) => {
    setSoundEnabled(useAudioStore.getState().optIn)
    enter()
  }, [setSoundEnabled])

  return (
    <section
      id="hero"
      className="holo-veil-fade relative min-h-[100svh] flex items-center justify-center px-4 pt-20 pb-24 md:py-0"
    >
      {/* Slot corps-entier : le canvas partagé (page) s'y matérialise une fois la carte scannée.
          Desktop déverrouillé : pivoter l'hologramme à la souris. Mobile : le slot reste
          transparent aux gestes (scroll + tap lucioles passent). */}
      <div
        data-holo="hero"
        aria-hidden
        className={`absolute inset-0 ${unlocked && !isMobile ? "z-20 cursor-grab touch-none" : "pointer-events-none"}`}
        {...(unlocked && !isMobile ? dragHuman : {})}
      />

      {/* RELEVÉ DE SCAN (desktop, une fois l'accès ouvert). Déverrouiller effaçait
          l'identité : le bloc nom/rôle/dispo est dans `!unlocked`, si bien qu'un
          visiteur qui passe l'intro arrivait sur un hologramme anonyme, sans intitulé
          de poste ni date d'alternance. Le mobile, lui, gardait une surcouche.
          Placé SUR LES CÔTÉS et non au centre : la largeur desktop est inutilisée, et
          surtout le corps 3D reste dégagé. `pointer-events-none` sur tout le calque —
          il est au-dessus du slot de drag (z-20), il ne doit pas lui voler la souris ;
          seuls les trois boutons d'action réactivent les événements. */}
      {unlocked && !isMobile && (
        <div className="hidden md:block absolute inset-0 z-30 pointer-events-none hud-boot">
          {/* colonne gauche : QUI — le bloc dominant. C'est l'information la plus
              importante de la page, elle doit peser plus que le statut et la stack,
              pas moins. Colonne plus large et typographie d'un cran au-dessus de
              tout le reste du relevé. */}
          <div
            className="group pointer-events-auto absolute left-4 lg:left-10 xl:left-16 top-1/2 -translate-y-1/2 w-56 lg:w-72 xl:w-96 font-mono"
            aria-hidden="true"
            onMouseEnter={() => setDecode((n) => n + 1)}
          >
            <div className="flex items-center gap-2 text-cyan-400/60 text-[10px] lg:text-xs tracking-[0.3em]">
              <span>&gt; {t.hero.annot.subject}</span>
              {/* le filet s'allume vers l'hologramme au survol — un relevé qui « accroche » */}
              <span className="h-px flex-1 bg-cyan-400/30 transition-all duration-500 group-hover:bg-cyan-300/70 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            </div>
            <div className="mt-3 text-cyan-200 text-2xl lg:text-4xl xl:text-5xl font-display leading-[1.05]"
                 style={{ textShadow: "0 0 20px rgba(34,211,238,0.45)" }}>
              <GlitchText key={decode} text={PROFILE.name.toUpperCase()} duration={520} />
            </div>
            <p className="mt-3 text-cyan-100/90 text-xs lg:text-base xl:text-lg leading-snug">{t.hero.role}</p>
            <p className="mt-2 text-cyan-400/65 text-[11px] lg:text-sm leading-relaxed">{t.hero.annot.level}</p>
          </div>

          {/* colonne droite : quoi — la disponibilité est LA donnée qui décide */}
          <div
            className="group pointer-events-auto absolute right-4 lg:right-12 xl:right-20 top-1/2 -translate-y-1/2 w-48 lg:w-64 xl:w-72 font-mono text-right"
            onMouseEnter={() => setScan((n) => n + 1)}
          >
            <div className="flex items-center gap-2 text-cyan-400/50 text-[10px] lg:text-[11px] tracking-[0.3em]" aria-hidden="true">
              <span className="h-px flex-1 bg-cyan-400/25 transition-all duration-500 group-hover:bg-cyan-300/70 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              <span>{t.hero.annot.status} &lt;</span>
            </div>
            <div className="mt-3 text-green-400 text-xs lg:text-lg tracking-wider" aria-hidden="true"
                 style={{ textShadow: "0 0 14px rgba(74,222,128,0.4)" }}>
              ◆ <GlitchText key={`d${scan}`} text={t.hero.annot.dispo} duration={420} />
            </div>
            <div className="mt-1 text-green-400/75 text-[10px] lg:text-xs tracking-wider" aria-hidden="true">
              ◆ <GlitchText key={`c${scan}`} text={t.hero.annot.contract} duration={420} delay={110} />
            </div>

            <div className="mt-6 flex items-center gap-2 text-cyan-400/50 text-[10px] lg:text-[11px] tracking-[0.3em]" aria-hidden="true">
              <span className="h-px flex-1 bg-cyan-400/25 transition-all duration-500 group-hover:bg-cyan-300/70 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              <span>{t.hero.annot.stack} &lt;</span>
            </div>
            <p className="mt-2 text-cyan-100/85 text-[11px] lg:text-sm leading-relaxed whitespace-pre-line" aria-hidden="true">
              <GlitchText key={`s${scan}`} text={t.hero.annot.stackValue} duration={520} delay={220} />
            </p>

            {/* ACTIONS : le premier écran n'offrait aucun moyen d'agir. Hiérarchie
                assumée — prendre rendez-vous est le geste le plus engageant, il est
                donc le seul en plein ; le CV est le repli, et le lien texte renvoie
                à la section contact pour qui veut d'abord tout voir. */}
            <div className="mt-6 flex items-center gap-2 text-cyan-400/50 text-[10px] lg:text-[11px] tracking-[0.3em]" aria-hidden="true">
              <span className="h-px flex-1 bg-cyan-400/25 transition-all duration-500 group-hover:bg-cyan-300/70 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              <span>{t.hero.annot.actions} &lt;</span>
            </div>
            <div className="mt-3 flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={openCalendly}
                className="pointer-events-auto rounded bg-cyan-500 hover:bg-cyan-400 px-3.5 py-1.5
                           text-black font-semibold text-[10px] lg:text-xs tracking-[0.12em]
                           cursor-pointer transition-colors
                           focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                {t.contact.calendlyBtn}
              </button>
              <button
                type="button"
                onClick={openCv}
                className="pointer-events-auto rounded border border-cyan-400/40 px-3.5 py-1
                           text-cyan-200 text-[10px] lg:text-xs tracking-[0.12em] cursor-pointer transition-all
                           hover:bg-cyan-400/10 hover:border-cyan-400/70
                           focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {t.hero.annot.cv}
              </button>
              <button
                type="button"
                onClick={() => scrollToId("contact")}
                className="pointer-events-auto text-cyan-400/70 hover:text-cyan-200 text-[10px] lg:text-[11px]
                           tracking-wider cursor-pointer transition-colors
                           focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {t.hero.annot.contact}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container w-full mx-auto px-4 flex flex-col gap-4 items-center z-10">
        {/* Identité EN CLAIR tant que l'accès n'est pas ouvert : sans elle, un visiteur
            qui débarque n'a sous les yeux qu'une carte 3D et un message d'erreur rouge.
            aria-hidden : le résumé sr-only de page.tsx porte déjà cette info aux lecteurs
            d'écran — inutile de la leur annoncer deux fois. */}
        {!unlocked && (
          <div className="text-center hud-reveal" aria-hidden="true">
            <div
              className="text-2xl md:text-4xl font-bold text-cyan-300 font-display tracking-wide"
              style={{ textShadow: "0 0 18px rgba(34,211,238,0.45)" }}
            >
              {PROFILE.name.toUpperCase()}
            </div>
            <p className="mt-1.5 text-cyan-100/80 font-mono text-xs md:text-sm tracking-wider">{t.hero.role}</p>
            <p className="mt-1 text-green-400 font-mono text-xs tracking-wider">{t.hero.availability}</p>
          </div>
        )}

        {/* Carte biométrique 3D = clé d'entrée du site. Une fois scannée (UNLOCKED) :
            elle s'estompe pour laisser place à l'hologramme (canvas permanent, mobile inclus).
            Mobile : identité compacte superposée — l'hologramme reste la star. */}
        {unlocked && isMobile ? (
          <div className="relative flex flex-col items-center justify-between h-[88svh] pt-1 pb-2 pointer-events-none hud-boot">
            {/* titre seul, sans cadre — placé au-dessus de l'hologramme (ombre pour la lisibilité) */}
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-300 font-display" style={{ textShadow: "0 0 10px rgba(0,0,0,0.9), 0 0 22px rgba(34,211,238,0.55)" }}>
                CHARLY MENTHILLER
              </div>
              <p className="mt-1.5 text-green-400/90 font-mono text-xs tracking-wider" style={{ textShadow: "0 0 8px rgba(0,0,0,0.9)" }}>{t.hero.availability}</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-cyan-400/60 font-mono text-[11px] tracking-[0.25em]">
              <span>{t.hero.scroll}</span>
              <span className="animate-bounce text-cyan-300">▾</span>
            </div>
          </div>
        ) : (
          <div
            className="w-full h-[38vh] md:h-[56vh] relative transition-opacity duration-700"
            style={{ opacity: unlocked ? 0 : 1, pointerEvents: unlocked ? "none" : "auto" }}
          >
            <LazyMount className="w-full h-full relative">
              <ErrorBoundary
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-cyan-400/70 font-mono text-sm">
                    <span>{t.hero.module3dKo}</span>
                  </div>
                }
              >
                <BiometricCard onScan={() => enterWith(onScan)} />
              </ErrorBoundary>
            </LazyMount>
          </div>
        )}

        {/* Terminal : invite au repos, puis scan → CALIBRAGE pas-à-pas → boot */}
        <TerminalDisplay />

        {/* Chemin d'entrée accessible : vrais boutons DOM (clavier + sans WebGL).
            La carte 3D reste le geste "wow", ces boutons garantissent l'accès. */}
        {!unlocked && (
          <div className="flex flex-col items-center gap-3">
            {introPhase === "LOCKED" && (
              <button
                type="button"
                onClick={() => enterWith(onScan)}
                className="px-6 py-2.5 rounded-lg border border-cyan-400/60 bg-cyan-400/5 text-cyan-300
                           font-mono text-sm tracking-[0.2em] cursor-pointer transition-all
                           hover:bg-cyan-400/15 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]
                           focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {t.hero.scan}
              </button>
            )}
            {/* Sortie de secours : c'est le chemin d'un visiteur pressé (recruteur), il
                doit donc SE VOIR. En gray-500 il tombait sous le seuil de contraste AA
                et se lisait comme une note de bas de page. */}
            <button
              type="button"
              onClick={() => enterWith(() => setIntroPhase("UNLOCKED"))}
              className="px-5 py-2 rounded-lg border border-cyan-400/25 text-cyan-200/90
                         font-mono text-xs tracking-wider cursor-pointer transition-all
                         hover:border-cyan-400/50 hover:text-cyan-100 hover:bg-cyan-400/5
                         focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {t.hero.skip}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
