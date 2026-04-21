'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function TerminalDisplay({
  isScanned,
  onScanComplete,
}: {
  isScanned: boolean
  onScanComplete: () => void
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ id: string; text: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'granted'>('idle');


  const scanSequence = [
    '> Initializing retina scan...',
    '> Card detected.',
    '> Subject: MENTHILLER.CHARLY_009',
    '> Status: ACTIVE NODE',
    '> Clearance verified. Access granted.',
    '> Launching neuro-visual interface...',
  ];

  // Initial message
  useEffect(() => {
    if (status === 'idle') {
      setLines([{ id: 'terminal-line-0', text: '> Awaiting card scan...' }]);
    }
  }, [status]);

  // Scanning process
  useEffect(() => {
  if (!isScanned || status !== 'idle') return;

  setStatus('scanning');
  setLines([]); // reset

  const displayLines = async () => {
    for (let i = 0; i < scanSequence.length; i++) {
      const lineText = scanSequence[i];
      const id = `terminal-line-${i}`;

      // Affiche la ligne
      setLines((prev) => [...prev, { text: lineText, id }]);

      // Attendre que le DOM soit prêt
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          const el = document.getElementById(id);
          if (el) {
            gsap.fromTo(
              el,
              { opacity: 0, y: 20 },
              {
                opacity: 1,
                y: 0,
                duration: 0.3,
                ease: 'power2.out',
                onComplete: () => {
                  // Attente visible avant disparition
                  setTimeout(() => {
                    gsap.to(el, {
                      opacity: 0,
                      y: -20,
                      duration: 0.3,
                      ease: 'power2.in',
                      onComplete: () => {
                        // Supprime l'élément en gardant les autres
                        setLines((prev) => prev.filter((line) => line.id !== id));
                        resolve();
                      },
                    });
                  }, 800);
                },
              }
            );
          } else {
            resolve(); // fallback
          }
        });
      });
    }

    // Affiche le message final
    setTimeout(() => {
      setStatus('granted');
      onScanComplete();
    }, 400);
  };

  displayLines();
}, [isScanned, status]);
  return (
    <div className="text-center mt-4">
      <div className="text-green-400 text-xl font-mono neon-glow animate-pulse mb-2">
        {status === 'granted' ? 'ACCESS GRANTED' : 'SCAN CARD CODE TO ACCESS DATA'}
      </div>

      <div
  ref={terminalRef}
  className="text-left text-cyan-300 text-sm font-mono max-h-64 overflow-y-hidden px-4 min-h-[100px]"
>
  {lines.map((line) => (
    <div key={line.id} id={line.id} className="terminal-line">
      {line.text}
    </div>
  ))}

  {status === 'scanning' && <div className="terminal-cursor">_</div>}

  {status === 'granted' && (
    <div className="mt-2">Scroll to continue neural interface initialization...</div>
  )}
</div>
    </div>
  );
}
