"use client"

import { useState } from "react"
import { HUDInterface } from "../components/ui/HUDInterface"
import { NeuralTransmissionTerminal } from "../components/ui/NeuralTransmissionTerminal"

export function ContactSection() {
  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isTransmitting, setIsTransmitting] = useState(false)
  const [transmissionComplete, setTransmissionComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation simple côté client
    if (!formData.name || !formData.email || !formData.message) {
      setError("Merci de remplir tous les champs.")
      return
    }

    setIsTransmitting(true)

    // Simulation de transmission (remplace par un appel API réel plus tard)
    setTimeout(() => {
      setIsTransmitting(false)
      setTransmissionComplete(true)

      // Reset après 3 secondes
      setTimeout(() => {
        setTransmissionComplete(false)
        setFormData({ name: "", email: "", message: "" })
      }, 3000)
    }, 2000)
  }

  // Gestion du changement de champ
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Affichage du terminal de transmission pendant l'envoi ou la confirmation
  if (isTransmitting || transmissionComplete) {
    return (
      <section id="contact" className="min-h-screen flex items-center justify-center" aria-live="polite">
        <NeuralTransmissionTerminal isTransmitting={isTransmitting} isComplete={transmissionComplete} />
      </section>
    )
  }

  return (
    <section id="contact" className="min-h-screen flex items-center justify-center py-20">
      <HUDInterface>
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Informations de contact */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-6xl font-bold text-red-400">
                  NEURAL
                  <span className="text-cyan-400 block">CONTACT</span>
                </h2>
                <p className="text-gray-300 font-mono text-lg">{"// Establishing secure connection..."}</p>
                <p className="text-gray-400">
                  Initiez une transmission sécurisée pour établir un contact direct avec mon interface neural.
                </p>
              </div>

              {/* Méthodes de contact */}
              <div className="space-y-6">
                <div className="bg-black/50 border border-cyan-500/30 rounded-lg p-6">
                  <h3 className="text-cyan-400 font-semibold mb-4 font-mono">DIRECT CHANNELS</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <a
                        href="mailto:email@neural.link"
                        className="text-gray-300 font-mono underline hover:text-cyan-400 transition"
                        aria-label="Envoyer un email"
                      >
                        email@neural.link
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      <a
                        href="https://www.linkedin.com/in/charly-menthiller/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 font-mono underline hover:text-cyan-400 transition"
                        aria-label="Voir le profil LinkedIn"
                      >
                        linkedin.com/in/charly-menthiller
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                      <a
                        href="https://github.com/cyberpunk-dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 font-mono underline hover:text-cyan-400 transition"
                        aria-label="Voir le profil GitHub"
                      >
                        github.com/cyberpunk-dev
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-black/50 border border-green-500/30 rounded-lg p-6">
                  <h3 className="text-green-400 font-semibold mb-4 font-mono">SYSTEM STATUS</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Neural Interface</span>
                      <span className="text-green-400">ONLINE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Response Time</span>
                      <span className="text-cyan-400">{"< 24H"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Encryption Level</span>
                      <span className="text-red-400">MAXIMUM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire de contact */}
            <div className="space-y-6">
              <div className="bg-black/50 border border-red-500/30 rounded-lg p-6">
                <h3 className="text-red-400 font-semibold mb-6 font-mono">TRANSMISSION FORM</h3>

                <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulaire de contact">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2 font-mono">
                      SENDER_ID
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="bg-black/50 border-gray-600 text-white placeholder-gray-500 font-mono"
                      placeholder="Votre nom"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2 font-mono">
                      NEURAL_ADDRESS
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="bg-black/50 border-gray-600 text-white placeholder-gray-500 font-mono"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2 font-mono">
                      MESSAGE_PAYLOAD
                    </label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      className="bg-black/50 border-gray-600 text-white placeholder-gray-500 font-mono min-h-[120px]"
                      placeholder="Votre message sécurisé..."
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm font-mono mb-2" aria-live="assertive">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-300"
                  >
                    INITIATE TRANSMISSION
                  </button>
                </form>
              </div>

              {/* Avertissement de sécurité */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-yellow-400 font-semibold font-mono text-sm">SECURITY NOTICE</span>
                </div>
                <p className="text-yellow-300 text-sm">
                  Toutes les transmissions sont chiffrées et sécurisées. Vos données sont protégées par des protocoles
                  de sécurité avancés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </HUDInterface>
    </section>
  )
}
