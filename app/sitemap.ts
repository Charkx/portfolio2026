import type { MetadataRoute } from "next"

// Génère /sitemap.xml — liste les pages indexables du portfolio.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://charlymenthiller.vercel.app"
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]
}
