import type { Metadata } from "next"

// Page secrète (mini-jeu) : title diégétique + noindex — elle se mérite, elle ne se google pas.
export const metadata: Metadata = {
  title: "TRANSMISSION_009 // signal décrypté",
  robots: { index: false, follow: false },
}

export default function TransmissionLayout({ children }: { children: React.ReactNode }) {
  return children
}
