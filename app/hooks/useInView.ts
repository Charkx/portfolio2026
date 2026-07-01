"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Observe un élément et indique s'il est (proche d')à l'écran.
 * Sert à monter/démonter les Canvas WebGL lourds au scroll, afin de ne jamais
 * garder trop de contextes WebGL vivants en même temps (sinon le navigateur en
 * évince un — typiquement celui du Hero — qui devient blanc).
 *
 * Utilise une *callback ref* : l'observer se (re)branche dès que le nœud apparaît
 * dans le DOM, même s'il est rendu de façon conditionnelle (après un état async).
 */
export function useInView<T extends HTMLElement>(rootMargin = "300px") {
  const [node, setNode] = useState<T | null>(null)
  const [inView, setInView] = useState(false)

  const ref = useCallback((el: T | null) => setNode(el), [])

  useEffect(() => {
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, rootMargin])

  return { ref, inView }
}
