"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Gamepad2 } from "lucide-react"
import {
  useDiscoveryStore,
  SIGNALS,
  discoveryProgress,
  isDiscoveryComplete,
} from "../../store/discoveryStore"
import { audioEngine } from "../../lib/audioEngine"
import { useT } from "../../i18n"

/**
 * Jauge SIG du HUD — reflète les 5 signaux cachés captés (0 → 100 %).
 * À 100 %, la jauge se change en bouton lumineux ouvrant la transmission secrète.
 * Le panneau de détail s'ouvre au survol ET au clic : c'est la RÈGLE du mini-jeu,
 * pas une infobulle d'appoint. Au survol seul, elle n'existait pas au doigt — un
 * visiteur mobile voyait un pourcentage monter sans jamais savoir de quoi.
 */
export function SignalMeter({ booted }: { booted: boolean }) {
  const router = useRouter()
  const t = useT()
  const found = useDiscoveryStore((s) => s.found)
  const pct = Math.round(discoveryProgress(found) * 100)
  const complete = isDiscoveryComplete(found)
  const [pinned, setPinned] = useState(false)
  const panelId = useId()

  const open = () => {
    audioEngine.play("success")
    router.push("/transmission")
  }

  // Ouvert au clic → se referme au premier geste ailleurs, ou à Échap. Le panneau
  // reste en pointer-events-none : il n'a rien de cliquable, et ça garantit qu'un
  // appui dessus ne bloque jamais la fermeture.
  useEffect(() => {
    if (!pinned) return
    const away = () => setPinned(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPinned(false) }
    document.addEventListener("pointerdown", away)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", away)
      document.removeEventListener("keydown", onKey)
    }
  }, [pinned])

  return (
    <div className="group relative pointer-events-auto">
      {complete ? (
        <button
          onClick={open}
          onMouseEnter={() => audioEngine.play("hover")}
          aria-label={t.signals.accessAria}
          className="group/sig inline-flex items-center min-h-11 font-mono text-cyan-400 cursor-pointer"
        >
          {/* « SIG: » reste cyan quel que soit l'état : c'est l'étiquette de la jauge,
              elle ne change pas de nature quand le jeu se débloque. Seule la RÉCOMPENSE
              passe au vert et pulse — le contraste entre les deux est justement ce qui
              signale qu'il s'est passé quelque chose.
              (espacement par ml-1 et non par une espace typographique : dans un
              conteneur flex, l'espace de fin est un nœud à part et peut se voir
              supprimé — « SIG:[PLAY] » collé.) */}
          SIG:
          <span
            className="ml-1 inline-flex items-center animate-pulse text-green-300 transition-colors group-hover/sig:text-green-100"
            style={{ textShadow: "0 0 8px rgba(74,222,128,0.8)" }}
          >
            <span className="tracking-wider">{t.signals.access}</span>
            <Gamepad2 size={14} className="ml-1.5" aria-hidden="true" />
          </span>
        </button>
      ) : (
        // Tant que le mini-jeu est en cours, la jauge est un BOUTON : son seul rôle
        // est d'ouvrir la checklist. (Une fois complète, elle sert à entrer dans la
        // transmission — l'action prend alors le pas sur l'explication.)
        <button
          type="button"
          aria-expanded={pinned}
          aria-controls={panelId}
          // pas d'aria-label : le nom accessible doit rester « SIG: 42% », c'est-à-dire
          // le texte visible. `panelHeader` est un fragment ponctué (« > SIGNAUX CAPTÉS · »),
          // il ferait un nom illisible et décorrélé de ce qu'on voit à l'écran.
          onPointerDown={(e) => e.stopPropagation()} // sinon l'écouteur global referme aussitôt
          onClick={() => setPinned((v) => !v)}
          className="inline-flex items-center min-h-11 cursor-pointer"
        >
          SIG:
          <span
            className={booted ? "hud-reveal text-cyan-400 ml-1" : "opacity-0 ml-1"}
            style={{ "--i": 3 } as React.CSSProperties}
          >
            {booted ? pct : 0}%
          </span>
        </button>
      )}

      {/* Panneau de détail — checklist des signaux (captés en clair, masqués sinon) */}
      <div
        id={panelId}
        className={`pointer-events-none absolute right-0 top-full w-60 rounded border border-cyan-400/40
                   bg-black/90 backdrop-blur-sm p-3 font-mono text-[10px] leading-relaxed
                   transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 z-50
                   ${pinned ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      >
        <div className="mb-1.5 tracking-widest text-cyan-300/90">
          {t.signals.panelHeader} {found.length}/{SIGNALS.length}
        </div>
        {SIGNALS.map((sig) => {
          const got = found.includes(sig.id)
          return (
            <div
              key={sig.id}
              className={got ? "text-cyan-300" : "text-cyan-400/30"}
            >
              {got ? `◆ ${t.signals.labels[sig.id] ?? sig.label}` : "◇ ▓▓▓▓ ▓▓▓▓"}
            </div>
          )
        })}
        <div className="mt-2 pt-2 border-t border-cyan-400/15 text-[9px] tracking-wide">
          {complete ? (
            <span className="text-green-400">{t.signals.unlocked}</span>
          ) : (
            <span className="text-cyan-400/70">{t.signals.hint}</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Toast éphémère à chaque signal nouvellement capté (feedback + son).
 * Se monte à la racine du HUD ; disparaît seul après ~2,6 s.
 */
export function SignalToast() {
  const t = useT()
  const lastFound = useDiscoveryStore((s) => s.lastFound)
  const clearLast = useDiscoveryStore((s) => s.clearLast)
  const found = useDiscoveryStore((s) => s.found)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!lastFound) return
    const complete = isDiscoveryComplete(found)
    audioEngine.play(complete ? "success" : "activation")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => clearLast(), 2600)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [lastFound, found, clearLast])

  const sig = SIGNALS.find((s) => s.id === lastFound)
  const complete = isDiscoveryComplete(found)
  const pct = Math.round(discoveryProgress(found) * 100)

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-[70]
                  font-mono text-center transition-all duration-300
                  ${lastFound ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
    >
      {sig && (
        <div
          className={`rounded border px-4 py-2 backdrop-blur-sm
                      ${complete ? "border-green-400/60 bg-green-950/40" : "border-cyan-400/50 bg-black/80"}`}
        >
          <div className={`text-xs tracking-widest ${complete ? "text-green-300" : "text-cyan-300"}`}>
            ◆ {t.signals.labels[sig.id] ?? sig.label}
          </div>
          <div className={`mt-0.5 text-[10px] ${complete ? "text-green-400" : "text-cyan-400/70"}`}>
            {complete ? t.signals.toastComplete : t.signals.toastStep(pct)}
          </div>
        </div>
      )}
    </div>
  )
}
