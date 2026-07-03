'use client';

import { useRef } from 'react';

// Carrousel mobile des Data Cubes : un cube CSS 3D par projet, un seul visible à la fois.
// Swipe = navigation · tap = déploie le panneau d'étude de cas. Aucun WebGL.

const SIZE = 150; // arête du cube (px)
const HALF = SIZE / 2;

export type MobileCubeItem = { id: string; title: string; short: string; color: string };

// transformations des 6 faces (avant/arrière/droite/gauche/dessus/dessous)
const FACES = [
  `translateZ(${HALF}px)`,
  `rotateY(180deg) translateZ(${HALF}px)`,
  `rotateY(90deg) translateZ(${HALF}px)`,
  `rotateY(-90deg) translateZ(${HALF}px)`,
  `rotateX(90deg) translateZ(${HALF}px)`,
  `rotateX(-90deg) translateZ(${HALF}px)`,
];

export default function ProjectMobileCubes({ items, index, onChange, onOpen }: {
  items: MobileCubeItem[];
  index: number;
  onChange: (i: number) => void;
  onOpen: (i: number) => void;
}) {
  const startX = useRef<number | null>(null);
  const item = items[index];
  if (!item) return null;

  const go = (dir: number) => onChange((index + dir + items.length) % items.length);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const sx = startX.current; startX.current = null;
    const ex = e.changedTouches[0]?.clientX;
    if (sx == null || ex == null) return;
    const dx = ex - sx;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); // swipe gauche = suivant
  };

  return (
    <div className="flex flex-col items-center gap-5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center gap-5">
        <button
          type="button" onClick={() => go(-1)} aria-label="Projet précédent"
          className="w-10 h-10 rounded-full border border-cyan-400/40 text-cyan-300 text-xl cursor-pointer hover:bg-cyan-400/10"
        >
          ‹
        </button>

        {/* scène 3D CSS : le cube tourne lentement, re-glitche à chaque changement */}
        <div style={{ perspective: '700px', width: SIZE + 44, height: SIZE + 44 }} className="flex items-center justify-center">
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(index)}
            aria-label={`Ouvrir l'étude de cas — ${item.title}`}
            className="cube-spin card-glitch-in relative cursor-pointer"
            style={{ width: SIZE, height: SIZE, transformStyle: 'preserve-3d', background: 'transparent', border: 'none', padding: 0 }}
          >
            {FACES.map((t, f) => (
              <span
                key={f} aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center font-mono text-xs tracking-widest"
                style={{
                  transform: t,
                  background: `${item.color}14`,
                  border: `1px solid ${item.color}`,
                  boxShadow: `inset 0 0 18px ${item.color}40`,
                  color: item.color,
                }}
              >
                {f === 0 ? item.id : ''}
              </span>
            ))}
          </button>
        </div>

        <button
          type="button" onClick={() => go(1)} aria-label="Projet suivant"
          className="w-10 h-10 rounded-full border border-cyan-400/40 text-cyan-300 text-xl cursor-pointer hover:bg-cyan-400/10"
        >
          ›
        </button>
      </div>

      <div className="text-center">
        <div className="font-mono text-sm" style={{ color: item.color, textShadow: `0 0 10px ${item.color}80` }}>{item.short}</div>
        <p className="text-[11px] text-gray-500 font-mono mt-1">Glisse pour naviguer · touche le cube pour déployer</p>
      </div>

      {/* pagination */}
      <div className="flex gap-2.5">
        {items.map((it, i) => (
          <button
            key={it.id} type="button" onClick={() => onChange(i)}
            aria-label={`Aller au projet ${it.short}`} aria-current={i === index}
            className="w-2.5 h-2.5 rounded-full cursor-pointer transition-colors"
            style={{ background: i === index ? it.color : '#334155' }}
          />
        ))}
      </div>
    </div>
  );
}
