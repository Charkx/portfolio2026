import { describe, it, expect } from 'vitest';
import { fr, en } from '../app/i18n/dict';
import { TECH_STACK } from '../app/utils/constants';

// TypeScript contraint déjà EN par `typeof fr`, donc une clé manquante ne compile pas.
// Ce qu'il ne voit PAS : une valeur vide, une traduction restée en français, ou un
// dictionnaire dérivé (techDesc côté EN est écrit à la main) qui oublie une entrée.
// C'est arrivé en ajoutant GSAP : sans sa description anglaise, la modale affichait
// une fiche vide en EN — invisible à la compilation comme au lint.

type Node = string | ((...a: never[]) => unknown) | { [k: string]: Node } | readonly Node[];

function chemins(n: Node, prefixe = ''): [string, Node][] {
  if (typeof n !== 'object' || n === null) return [[prefixe, n]];
  return Object.entries(n).flatMap(([k, v]) =>
    chemins(v as Node, prefixe ? `${prefixe}.${k}` : k),
  );
}

describe('dictionnaires FR / EN', () => {
  it('exposent exactement les mêmes chemins de clés', () => {
    const cf = chemins(fr as unknown as Node).map(([k]) => k).sort();
    const ce = chemins(en as unknown as Node).map(([k]) => k).sort();
    expect(ce).toEqual(cf);
  });

  it("aucune chaîne vide (une clé sans valeur s'affiche comme un trou)", () => {
    for (const [langue, dict] of [['fr', fr], ['en', en]] as const) {
      const vides = chemins(dict as unknown as Node)
        .filter(([, v]) => typeof v === 'string' && v.trim() === '')
        .map(([k]) => `${langue}.${k}`);
      expect(vides).toEqual([]);
    }
  });

  it('chaque techno a une description dans les DEUX langues', () => {
    const noms = Object.values(TECH_STACK).flat().map((t) => t.name);
    for (const nom of noms) {
      expect(fr.skills.techDesc[nom]?.trim(), `fr — ${nom}`).toBeTruthy();
      expect(en.skills.techDesc[nom]?.trim(), `en — ${nom}`).toBeTruthy();
    }
  });

  it("les descriptions anglaises ne sont pas de simples copies du français", () => {
    const noms = Object.values(TECH_STACK).flat().map((t) => t.name);
    const copies = noms.filter((n) => fr.skills.techDesc[n] === en.skills.techDesc[n]);
    expect(copies).toEqual([]);
  });

  it('les cinq chapitres du HUD existent dans les deux langues', () => {
    for (const section of ['hero', 'about', 'skills', 'projects', 'contact']) {
      expect(fr.hud.chapters[section], `fr — ${section}`).toBeTruthy();
      expect(en.hud.chapters[section], `en — ${section}`).toBeTruthy();
    }
  });
});
