// Précharge des assets lourds en suivant la progression réelle (octets téléchargés).
// Les fichiers atterrissent dans le cache HTTP → le chargement 3D suivant est instantané.
// En cas d'échec réseau, on n'échoue jamais (la fraction passe à 1) pour ne pas bloquer le site.

export async function preloadAssets(urls: string[], onProgress: (percent: number) => void): Promise<void> {
  const fracs = new Array(urls.length).fill(0)
  const report = () => onProgress((fracs.reduce((a, b) => a + b, 0) / urls.length) * 100)

  await Promise.all(
    urls.map(async (url, i) => {
      try {
        const res = await fetch(url)
        const total = Number(res.headers.get("content-length")) || 0
        if (!res.body || !total) {
          await res.arrayBuffer()
          fracs[i] = 1; report(); return
        }
        const reader = res.body.getReader()
        let loaded = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          loaded += value.length
          fracs[i] = Math.min(loaded / total, 1)
          report()
        }
        fracs[i] = 1; report()
      } catch {
        fracs[i] = 1; report() // échec → on ne bloque pas
      }
    })
  )
}
