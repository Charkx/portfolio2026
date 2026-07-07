import type { Metadata } from "next";
import { Orbitron, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, PROFILE } from "./utils/constants";

// Titres = Orbitron (sci-fi) · corps/mono = IBM Plex Mono (remplace Courier New)
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Charly Menthiller — Développeur Full Stack",
  description: "Portfolio de Charly Menthiller, développeur full stack en recherche d'alternance (sept. 2026). React, Next.js, Three.js.",
  keywords: ["Charly Menthiller", "développeur full stack", "alternance 2026", "React", "Next.js", "Three.js", "développeur web", "Avignon", "portfolio"],
  authors: [{ name: PROFILE.name, url: SITE_URL }],
  creator: PROFILE.name,
  // canonical → dit à Google que .com est LA version de référence (évite le doublon vercel.app)
  alternates: { canonical: "/" },
  openGraph: {
    title: "Charly Menthiller — Développeur Full Stack",
    description: "Développeur full stack · alternance sept. 2026 · React, Next.js, Three.js",
    url: SITE_URL,
    siteName: "Charly Menthiller",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Charly Menthiller — Développeur Full Stack",
    description: "Développeur full stack · alternance sept. 2026",
  },
  // Vérification Google Search Console (méthode balise HTML) — colle ici le code fourni :
  // verification: { google: "xxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
}

// Données structurées : aide Google à comprendre « personne + site »
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      name: PROFILE.name,
      jobTitle: "Développeur Full Stack",
      description: PROFILE.subtitle,
      url: SITE_URL,
      email: `mailto:${PROFILE.email}`,
      sameAs: [PROFILE.github, PROFILE.linkedin],
    },
    {
      "@type": "WebSite",
      name: "Charly Menthiller — Portfolio",
      url: SITE_URL,
      inLanguage: "fr-FR",
      author: { "@type": "Person", name: PROFILE.name },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${plexMono.variable}`}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
