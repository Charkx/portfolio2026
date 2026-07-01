"use client"

import { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { ModalSize } from "../../store/modalStore"
import { lenisStart, lenisStop } from "../SmoothScroll"

const MAX_W: Record<ModalSize, string> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-[min(95vw,1100px)]",
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,iframe,[tabindex]:not([tabindex="-1"])'

/**
 * Modale accessible réutilisable (portée sur <body>, au-dessus du canvas 3D).
 * Échap + clic sur le fond pour fermer · focus piégé · scroll bloqué · focus restauré.
 */
export default function Modal({
  title,
  size = "md",
  onClose,
  children,
}: {
  title: string
  size?: ModalSize
  onClose: () => void
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden" // bloque le scroll derrière
    lenisStop() // stoppe le smooth scroll pendant la modale

    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      lenisStart()
      prevFocus.current?.focus?.() // rend le focus au déclencheur
    }
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose]
  )

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={onKeyDown}
    >
      {/* fond assombri (matche le voile du canvas) — clic pour fermer */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${MAX_W[size]} max-h-[90vh] flex flex-col rounded-lg
                    border border-cyan-400/30 bg-[#04070c]/95 outline-none
                    shadow-[0_0_40px_rgba(34,211,238,0.15)]`}
      >
        <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-cyan-400/20 shrink-0">
          <h2 className="text-cyan-300 font-mono text-sm tracking-widest uppercase">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-cyan-400/70 hover:text-cyan-200 text-2xl leading-none w-8 h-8
                       flex items-center justify-center rounded hover:bg-cyan-400/10 transition-colors cursor-pointer"
          >
            ×
          </button>
        </header>

        <div className="overflow-auto p-5 grow">{children}</div>
      </div>
    </div>,
    document.body
  )
}
