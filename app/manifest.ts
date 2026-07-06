import type { MetadataRoute } from "next"

// Manifest PWA minimal : nom, thème néon et icônes (favori / écran d'accueil Android).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Charly Menthiller — Développeur Full Stack",
    short_name: "C. Menthiller",
    description: "Portfolio cyberpunk — développeur full stack, alternance sept. 2026.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
