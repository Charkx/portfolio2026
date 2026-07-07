import type { MetadataRoute } from "next"
import { SITE_URL } from "./utils/constants"

// Génère /sitemap.xml — liste les pages indexables du portfolio.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]
}
