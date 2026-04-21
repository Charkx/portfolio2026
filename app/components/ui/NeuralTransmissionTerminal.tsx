"use client"

import { useState, useEffect } from "react"

interface NeuralTransmissionTerminalProps {
  isTransmitting?: boolean
  isComplete?: boolean
}

export function NeuralTransmissionTerminal({
  isTransmitting = false,
  isComplete = false,
}: NeuralTransmissionTerminalProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)

  const transmissionSteps = [
    "Initializing neural interface...",
    "Establishing secure connection...",
    "Encrypting data payload...",
    "Transmitting to neural network...",
    "Verifying data integrity...",
    "Transmission complete!",
  ]

  useEffect(() => {
    if (isTransmitting && currentStep < transmissionSteps.length) {
      const timer = setTimeout(() => {
        setLogs((prev) => [...prev, `> ${transmissionSteps[currentStep]}`])
        setCurrentStep((prev) => prev + 1)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isTransmitting, currentStep, transmissionSteps])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Terminal Header */}
        <div className="bg-gray-900 border-b border-cyan-400 p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-cyan-400 font-mono text-sm">NEURAL_TRANSMISSION_TERMINAL</span>
            </div>
            <div className="text-green-400 font-mono text-sm">
              {isComplete ? "TRANSMISSION_COMPLETE" : "TRANSMITTING..."}
            </div>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="bg-black border-2 border-cyan-400 rounded-b-lg p-6 font-mono text-green-400">
          <div className="space-y-2 mb-6">
            <div className="text-cyan-400">NEURAL TRANSMISSION PROTOCOL v2.077</div>
            <div className="text-gray-400">Copyright (c) 2077 Night City Corp.</div>
            <div className="text-gray-400">All rights reserved.</div>
            <div className="border-t border-gray-700 my-4"></div>
          </div>

          {/* Logs */}
          <div className="space-y-1 mb-6 min-h-[200px]">
            {logs.map((log, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-cyan-400">[{String(index + 1).padStart(2, "0")}]</span>
                <span className="text-green-400">{log}</span>
                {index === logs.length - 1 && isTransmitting && <span className="animate-pulse">_</span>}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          {isTransmitting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress:</span>
                <span>{Math.round((currentStep / transmissionSteps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-green-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / transmissionSteps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Completion Message */}
          {isComplete && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl text-green-400 mb-2">✓ TRANSMISSION SUCCESSFUL</div>
                <div className="text-cyan-400">Neural link established successfully</div>
                <div className="text-gray-400 text-sm mt-2">Your message has been received and processed.</div>
              </div>

              <div className="border border-green-400 rounded p-4 bg-green-400/10">
                <div className="text-green-400 font-semibold mb-2">SYSTEM STATUS:</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    Connection: <span className="text-green-400">STABLE</span>
                  </div>
                  <div>
                    Latency: <span className="text-cyan-400">12ms</span>
                  </div>
                  <div>
                    Encryption: <span className="text-yellow-400">AES-256</span>
                  </div>
                  <div>
                    Status: <span className="text-green-400">ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Command Prompt */}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-cyan-400">neural@interface:~$</span>
            <span className="animate-pulse">_</span>
          </div>
        </div>
      </div>
    </div>
  )
}
