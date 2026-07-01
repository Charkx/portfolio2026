import type { Metadata } from "next";
import { Orbitron, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Titres = Orbitron (sci-fi) · corps/mono = IBM Plex Mono (remplace Courier New)
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://charlymenthiller.vercel.app/"),
  title: "Charly Menthiller — Développeur Full Stack",
  description: "Portfolio de Charly Menthiller, développeur full stack en recherche d'alternance (sept. 2026). React, Next.js, Three.js.",
  openGraph: {
    title: "Charly Menthiller — Développeur Full Stack",
    description: "Développeur full stack · alternance sept. 2026 · React, Next.js, Three.js",
    url: "https://charlymenthiller.vercel.app/",
    siteName: "Charly Menthiller",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Charly Menthiller — Développeur Full Stack",
    description: "Développeur full stack · alternance sept. 2026",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${plexMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
