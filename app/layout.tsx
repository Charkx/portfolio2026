import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ton-portfolio.vercel.app"), // ← mets ton URL de déploiement
  title: "Charly Menthiller — Développeur Full Stack",
  description: "Portfolio de Charly Menthiller, développeur full stack en recherche d'alternance (sept. 2026). React, Next.js, Three.js.",
  openGraph: {
    title: "Charly Menthiller — Développeur Full Stack",
    description: "Développeur full stack · alternance sept. 2026 · React, Next.js, Three.js",
    url: "https://ton-portfolio.vercel.app",
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
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
