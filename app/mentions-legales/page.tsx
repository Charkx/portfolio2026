import type { Metadata } from "next"
import Link from "next/link"
import LegalContent from "../components/LegalContent"
import { PROFILE } from "../utils/constants"

export const metadata: Metadata = {
  title: "Mentions légales — Charly Menthiller",
  description: "Mentions légales du portfolio de Charly Menthiller.",
}

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-20">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block text-cyan-400/70 hover:text-cyan-300 font-mono text-xs mb-8 transition-colors"
        >
          ← Retour au portfolio
        </Link>

        <h1 className="text-3xl font-bold text-cyan-300 font-mono mb-10">Mentions légales</h1>

        <LegalContent />

        <p className="text-cyan-100/30 text-xs font-mono mt-12">
          © {new Date().getFullYear()} {PROFILE.name}
        </p>
      </div>
    </main>
  )
}
