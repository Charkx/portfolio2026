'use client';

import { TECH_STACK } from '@/app/utils/constants';

interface Props {
  selectedTech: string | null;
  hoveredTech:  string | null;
  onTechClick:  (name: string) => void;
  onTechHover:  (name: string | null) => void;
}

export default function TechList({
  selectedTech,
  hoveredTech,
  onTechClick,
  onTechHover,
}: Props) {
  return (
    <div className="space-y-16">
      {Object.entries(TECH_STACK).map(([category, items]) => (
        <div key={category} className="skill-category">
          <h3 className="text-xl font-mono text-pink-400 mb-6">
            &gt;&gt; {category}
          </h3>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 text-white">
            {items.map((tech) => {
              const id = tech.name.toLowerCase();
              const isSelected = selectedTech === id;
              const isHovered  = hoveredTech === id;

              return (
                <div
                  key={tech.name}
                  id={`tech-trigger-${id}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={tech.name}
                  className={`
                    flex flex-col items-center justify-center cursor-pointer
                    transition-transform duration-300 rounded-md p-2
                    hover:scale-110
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
                    width={48}
                    height={48}
                    className={`w-12 h-12 ${tech.icon === 'nextjs' ? 'invert' : ''}`}
                    loading="lazy"
                  />
                  <span className="mt-2 text-sm font-mono text-cyan-300">
                    {tech.name}
                  </span>

                  {isSelected && (
                    <span className="mt-1 text-xs font-mono text-cyan-400 opacity-70">
                      Clic → muter
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