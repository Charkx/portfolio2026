"use client";

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CognitiveProfile from '../components/3d/CognitiveProfil';
import { LazyMount } from '../components/LazyMount';
import { ABOUT_TEXT } from '../utils/constants';

gsap.registerPlugin(ScrollTrigger);

const scanColors = ['#ff00ff', '#9b5de5', '#00ffff', '#39ff14', '#ffe600'];

const BOOT_LINES = [
  '>> Initializing neural framework...',
  '>> Scanning memory core...',
  '>> Loading COGNITIVE_PROFILE.dat',
  '>> Decrypting semantic layers...',
  '>> Boot sequence complete.',
];

export default function AboutSection() {
  const blocksRef = useRef<HTMLDivElement[]>([]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [activeScanColor, setActiveScanColor] = useState(scanColors[0]);
  const [bootLogs, setBootLogs] = useState<string[]>([]);

  // Boot logs typing effect
  useEffect(() => {
    let currentLine = 0;
    let currentChar = 0;
    let displayedLine = '';
    let interval: NodeJS.Timeout;

    const typeLine = () => {
      const fullLine = BOOT_LINES[currentLine];

      interval = setInterval(() => {
        displayedLine += fullLine[currentChar];

        setBootLogs((prev) => {
          const updated = [...prev];
          updated[currentLine] = displayedLine;
          return updated;
        });

        currentChar++;

        if (currentChar >= fullLine.length) {
          clearInterval(interval);
          setVisibleIndex((prev) => prev + 1); // 👈 Dévoile un bloc

          currentLine++;
          displayedLine = '';
          currentChar = 0;

          if (currentLine < BOOT_LINES.length) {
            setTimeout(typeLine, 500); // Delay avant prochaine ligne
          }
        }
      }, 30);
    };

    setBootLogs(BOOT_LINES.map(() => '')); // Init lignes vides
    typeLine();

    return () => clearInterval(interval);
  }, []);

  // Scroll-triggered animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      ABOUT_TEXT.forEach((_, i) => {
        const block = blocksRef.current[i];
        if (!block) return;

        gsap.fromTo(
          block,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: block,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, blocksRef);

    return () => ctx.revert();
  }, []);

  // Handle click for scan animation
  const handleBlockClick = (i: number) => {
    const block = blocksRef.current[i];
    if (!block) return;

    setActiveScanColor(scanColors[i]);

    block.querySelectorAll('p').forEach((p, idx) => {
      gsap.fromTo(
        p,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, delay: idx * 0.05, duration: 1, ease: 'power1.out' }
      );
    });

    gsap.fromTo(
      block.querySelector('.scan-bar'),
      { scaleX: 0 },
      { scaleX: 2, duration: 1, transformOrigin: 'left', ease: 'power1.out' }
    );
  };

  return (
    <section
      id="about"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20"
    >
      {/* Boot log terminal */}
      <div className="text-green-400 font-mono text-sm mb-6 w-full max-w-3xl">
        {bootLogs.map((line, idx) => (
          <div key={idx}>
            {line}
            {/* Cursor only on current line */}
            {idx === bootLogs.length - 1 &&
              BOOT_LINES[idx] &&
              line.length < BOOT_LINES[idx].length && (
                <span className="animate-pulse">|</span>
              )}
          </div>
        ))}
      </div>

      <h2 className="text-4xl text-cyan-400 font-bold font-mono mb-12 z-10">
        COGNITIVE_PROFILE.dat
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 z-10 w-full max-w-6xl">
        <div className="flex flex-col justify-center space-y-6">
          {ABOUT_TEXT.map((block, i) => {
            const borderColors = [
              'border-pink-400/40 hover:border-pink-400/70',
              'border-purple-400/40 hover:border-purple-400/70',
              'border-cyan-400/40 hover:border-cyan-400/70',
              'border-green-400/40 hover:border-green-400/70',
              'border-yellow-400/40 hover:border-yellow-400/70',
            ];

            const isVisible = visibleIndex > i;

            return (
              <div
                key={i}
                className={`relative border p-4 rounded transition-all bg-black/50 cursor-pointer group overflow-hidden
                  ${borderColors[i] || ''}
                  ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                ref={(el) => { if (el) blocksRef.current[i] = el; }}
                onClick={() => handleBlockClick(i)}
              >
                {isVisible && (
                  <div className="scan-bar absolute left-0 top-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent scale-x-0" />
                )}

                <h3 className={`${block.color} text-sm mb-2 font-mono`}>
                  &gt;&gt; {block.title}
                </h3>
                {block.text.map((line, idx) => (
                  <p key={idx} className="text-white font-mono text-sm">{line}</p>
                ))}
              </div>
            );
          })}
        </div>

        <LazyMount className="h-[80vh] w-full">
          <CognitiveProfile activeColor={activeScanColor} />
        </LazyMount>
      </div>
    </section>
  );
}



