// Corrige un crash de l'extension React DevTools :
//   "Invalid argument not valid semver ('' received)"
//
// react-three-fiber crée son propre react-reconciler pour le <Canvas>. Au moment
// où ce reconciler s'enregistre auprès du hook DevTools, il transmet parfois une
// `version` vide. L'extension fait alors un `gte('')` (comparaison semver) qui jette
// une exception → l'initialisation du reconciler R3F échoue → le Canvas reste blanc.
//
// Ce garde assainit la version transmise au hook (valeur de repli valide). Il est
// totalement inerte si l'extension React DevTools n'est pas installée — donc aucun
// impact pour les visiteurs, c'est uniquement un confort en développement.

interface DevtoolsRenderer {
  version?: unknown
  reconcilerVersion?: string
}

interface DevtoolsHook {
  renderers?: Map<number, DevtoolsRenderer> & { forEach?: (cb: (r: DevtoolsRenderer) => void) => void }
  inject?: (renderer: DevtoolsRenderer) => number
}

if (typeof window !== "undefined") {
  const hook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevtoolsHook })
    .__REACT_DEVTOOLS_GLOBAL_HOOK__

  if (hook) {
    const FALLBACK = "19.0.0"

    const sanitize = (renderer: DevtoolsRenderer): DevtoolsRenderer => {
      if (renderer && (typeof renderer.version !== "string" || renderer.version === "")) {
        try {
          renderer.version = renderer.reconcilerVersion || FALLBACK
        } catch {
          /* objet figé — on ignore */
        }
      }
      return renderer
    }

    // Renderers déjà enregistrés (ex. react-dom)
    try {
      hook.renderers?.forEach?.(sanitize)
    } catch {
      /* noop */
    }

    // Futurs enregistrements (ex. le reconciler R3F au montage du Canvas)
    if (typeof hook.inject === "function") {
      const originalInject = hook.inject.bind(hook)
      hook.inject = (renderer: DevtoolsRenderer) => originalInject(sanitize(renderer))
    }
  }
}

export {}
