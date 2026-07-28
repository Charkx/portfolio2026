import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TECH_STACK, techIcon, PROFILE } from '../app/utils/constants';

const ICON_DIR = join(process.cwd(), 'public', 'icons', 'tech');
const ALL_TECHS = Object.values(TECH_STACK).flat();

// Ces tests portent sur des liens ENTRE fichiers : TypeScript ne peut rien en dire,
// et un manque ne se voit qu'à l'écran, sous la forme d'un logo absent. C'est
// exactement ce qui est arrivé en ajoutant GSAP — devicon n'a pas cette icône.
describe('icônes de la stack technique', () => {
  it('chaque techno déclarée a son fichier SVG en local', () => {
    const manquants = ALL_TECHS
      .filter((t) => !existsSync(join(ICON_DIR, `${t.icon}.svg`)))
      .map((t) => `${t.name} → ${t.icon}.svg`);
    expect(manquants).toEqual([]);
  });

  it("aucune icône orpheline dans public/ (une techno retirée doit emporter son fichier)", () => {
    const attendus = new Set<string>(ALL_TECHS.map((t) => t.icon));
    const orphelins = readdirSync(ICON_DIR)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace(/\.svg$/, ''))
      .filter((slug) => !attendus.has(slug));
    expect(orphelins).toEqual([]);
  });

  it('chaque SVG porte une couleur : un logo sans fill rend noir sur fond noir', () => {
    const sansCouleur = ALL_TECHS.filter((t) => {
      const svg = readFileSync(join(ICON_DIR, `${t.icon}.svg`), 'utf-8');
      return !/fill=|style=/.test(svg);
    }).map((t) => t.name);
    expect(sansCouleur).toEqual([]);
  });

  it('techIcon() pointe bien dans public/', () => {
    expect(techIcon('react')).toBe('/icons/tech/react.svg');
  });
});

describe('fichiers référencés par le profil', () => {
  it('le CV existe vraiment à son chemin public', () => {
    expect(existsSync(join(process.cwd(), 'public', PROFILE.cv))).toBe(true);
  });
});

describe('contraintes de nommage des technos', () => {
  // le name sert d'identifiant CSS (#tech-trigger-{name}) : espace ou point = sélecteur cassé
  it('aucun nom ne contient d\'espace ni de point', () => {
    const invalides = ALL_TECHS.filter((t) => /[\s.]/.test(t.name)).map((t) => t.name);
    expect(invalides).toEqual([]);
  });

  it('les noms sont uniques', () => {
    const noms = ALL_TECHS.map((t) => t.name);
    expect(noms.length).toBe(new Set(noms).size);
  });

  it('chaque techno a un niveau entre 1 et 3 et une description non vide', () => {
    for (const t of ALL_TECHS) {
      expect([1, 2, 3], `${t.name}`).toContain(t.level);
      expect(t.desc.trim().length, `${t.name}`).toBeGreaterThan(0);
    }
  });
});
