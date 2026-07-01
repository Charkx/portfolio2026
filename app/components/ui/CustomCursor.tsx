"use client"

import { useEffect, useRef, useState } from "react"
import { useSceneStore } from "../../store/sceneStore"

// Cliquables (→ le réticule pivote) · modules 3D draggables (→ état "grab")
const CLICKABLE = 'a, button, [role="button"], input, textarea, select, [data-cursor="interactive"]'
const GRABBABLE = "[data-holo]"

/**
 * Curseur custom cyberpunk : réticule de visée (crochets d'angle) + point central.
 * - point toujours centré dans le cadre (aucun décalage)
 * - cadre immobile par défaut ; PIVOTE seulement sur un élément cliquable
 * - état "grab" distinct (cadre en losange + remplissage) sur un module 3D, et
 *   "prise" (cadre resserré + blanc) pendant qu'on le fait pivoter.
 * Actif seulement sur pointeur fin (souris).
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const dotRef = useRef<HTMLDivElement>(null)
  const reticleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    setEnabled(true)
    document.body.classList.add("custom-cursor")

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    let overClick = false
    let overGrab = false
    let angle = 0
    let scale = 1
    let last = performance.now()
    let raf = 0

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX; pos.y = e.clientY
      const el = e.target as Element | null
      overGrab = !!el?.closest?.(GRABBABLE)
      overClick = !overGrab && !!el?.closest?.(CLICKABLE)
    }
    const fade = (o: string) => () => {
      if (dotRef.current) dotRef.current.style.opacity = o
      if (reticleRef.current) reticleRef.current.style.opacity = o
    }
    const hide = fade("0"), show = fade("1")

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      const dragging = useSceneStore.getState().dragFocus !== null
      const grab = overGrab || dragging

      // rotation : SEULEMENT sur cliquable ; sinon on rejoint 0° (ou 45° en mode grab) au plus court
      if (overClick && !grab) {
        angle += 150 * dt
      } else {
        const target = grab ? 0 : 45 // normal = losange · grab = carré
        let a = angle % 360; if (a < 0) a += 360
        let diff = target - a
        if (diff > 180) diff -= 360
        if (diff < -180) diff += 360
        angle = a + diff * 0.25
      }

      // échelle selon l'état
      const targetScale = dragging ? 0.9 : overGrab ? 1.7 : overClick ? 1.4 : 1
      scale += (targetScale - scale) * 0.25

      const d = dotRef.current, r = reticleRef.current
      // point ET cadre exactement sur le curseur → le point ne sort jamais du cadre
      if (d) {
        d.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`
        d.style.opacity = grab ? "0" : "1" // en mode grab, le cadre suffit
      }
      if (r) {
        r.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`
        r.style.color = dragging ? "#ffffff" : "rgb(34,211,238)"
        r.style.background = grab ? "rgba(34,211,238,0.12)" : "transparent"
        r.style.filter = overClick || grab
          ? "drop-shadow(0 0 5px rgba(34,211,238,0.9))"
          : "drop-shadow(0 0 2px rgba(34,211,238,0.5))"
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", hide)
    document.addEventListener("mouseenter", show)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", hide)
      document.removeEventListener("mouseenter", show)
      document.body.classList.remove("custom-cursor")
    }
  }, [])

  if (!enabled) return null
  return (
    <>
      <div
        ref={reticleRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-[6px] will-change-transform"
        style={{ color: "rgb(34,211,238)" }}
      >
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 13 V6 H13" />
            <path d="M25 6 H32 V13" />
            <path d="M6 25 V32 H13" />
            <path d="M25 32 H32 V25" />
          </g>
        </svg>
      </div>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1 w-1 rounded-full bg-cyan-300 will-change-transform"
        style={{ boxShadow: "0 0 6px rgba(34,211,238,0.9)" }}
      />
    </>
  )
}
