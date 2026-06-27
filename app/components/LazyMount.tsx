"use client"

import type { CSSProperties, ReactNode } from "react"
import { useInView } from "../hooks/useInView"

/**
 * Réserve l'espace (className/style) en permanence pour éviter tout saut de
 * mise en page, mais ne monte ses enfants (typiquement un <Canvas> WebGL lourd)
 * que lorsqu'on s'en approche au scroll — et les démonte quand on s'en éloigne.
 */
export function LazyMount({
  className,
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const { ref, inView } = useInView<HTMLDivElement>("300px")
  return (
    <div ref={ref} className={className} style={style}>
      {inView ? children : null}
    </div>
  )
}
