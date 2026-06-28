'use client';

import { TECH_STACK } from '@/app/utils/constants';

interface Props {
  selectedTech: string | null;
  hoveredTech:  string | null;
  levelFilter:  number; // 0 = tout, sinon 1/2/3
  onTechClick:  (name: string) => void;
  onTechHover:  (name: string | null) => void;
}

export default function TechList({
  selectedTech,
  hoveredTech,
  levelFilter,
  onTechClick,
  onTechHover,
}: Props) {
  return (
    <div className="space-y-8">
      {Object.entries(TECH_STACK).map(([category, items]) => (
        <div key={category} className="skill-category">
          <h3 className="text-lg font-mono text-pink-400 mb-4">
            &gt;&gt; {category}
          </h3>

          <div className="grid grid-cols-4 gap-3 text-white">
            {items.map((tech) => {
              const id = tech.name.toLowerCase();
              const isSelected = selectedTech === id;
              const isHovered  = hoveredTech === id;
              const dimmed     = levelFilter !== 0 && tech.level !== levelFilter;

              return (
                <div
                  key={tech.name}
                  id={`tech-trigger-${id}`}
                  role="button"
                  tabIndex={dimmed ? -1 : 0}
                  aria-pressed={isSelected}
                  aria-label={tech.name}
                  className={`
                    flex flex-col items-center justify-center cursor-pointer
                    transition-all duration-300 rounded-md p-1.5
                    hover:scale-110
                    ${dimmed ? 'opacity-20 pointer-events-none grayscale' : ''}
                    ${isSelected ? 'ring-2 ring-cyan-400' : ''}
                    ${isHovered && !isSelected ? 'scale-105' : ''}
                  `}
                  onMouseEnter={() => onTechHover(tech.name)}
                  onMouseLeave={() => onTechHover(null)}
                  onClick={() => onTechClick(tech.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onTechClick(tech.name);
                    }
                  }}
                >
                  <img
                    src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${tech.icon}/${tech.icon}-original.svg`}
                    alt={`${tech.name} logo`}
                    width={40}
                    height={40}
                    className="w-10 h-10"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                  <span className="mt-1.5 text-xs font-mono text-cyan-300 text-center leading-tight">
                    {tech.name}
                  </span>
                  <div className="mt-1 flex gap-0.5 text-[8px] leading-none" aria-label={`Niveau ${tech.level} sur 3`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={n <= tech.level ? 'text-cyan-300' : 'text-cyan-400/20'}>●</span>
                    ))}
                  </div>

                  {isSelected && (
                    <span className="mt-1 text-[10px] font-mono text-cyan-400 opacity-70">
                      ▸ décodé
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}