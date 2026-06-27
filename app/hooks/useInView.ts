"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Observe un élément et indique s'il est (proche d')à l'écran.
 * Sert à monter/démonter les Canvas WebGL lourds au scroll, afin de ne jamais
 * garder trop de contextes WebGL vivants en même temps (sinon le navigateur en
 * évince un — typiquement celui du Hero — qui devient blanc).
 */
export function useInView<T extends HTMLElement>(rootMargin = "300px") {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
