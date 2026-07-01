import type { MetadataRoute } from "next"

// Génère /robots.txt — autorise tout + pointe le sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = "https://charlymenthiller.vercel.app"
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  }
}
