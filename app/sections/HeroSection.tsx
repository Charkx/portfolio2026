"use client"
import BiometricCard from "../components/3d/BiometricCard"
import TerminalDisplay from "../components/ui/TerminalDisplay"

export default function HeroSection({
  onScan,
  onAccessGranted,
  scanInitiated,
}: {
  onScan: () => void
  onAccessGranted: () => void
  scanInitiated: boolean
}) {
  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20"
    >
      <div className="container w-full h-screen mx-auto px-4 flex flex-col gap-12 items-center z-10">
        <div className="w-full h-8/10 relative">
          <BiometricCard onScan={onScan} />
        </div>

        <TerminalDisplay
          isScanned={scanInitiated}
          onScanComplete={onAccessGranted}
        />
      </div>
    </section>
  )
}