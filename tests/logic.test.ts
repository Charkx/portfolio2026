import { describe, it, expect } from 'vitest';
import { nearest } from '../app/utils/scrollMath';
import { hostOpacity, OP_FULL, OP_DIM } from '../app/utils/holoDamage';
import { SIGNALS, discoveryProgress, isDiscoveryComplete, type SignalId } from '../app/store/discoveryStore';

describe('nearest() — ancrage du snap de section', () => {
  const T = [0, 1000, 2000, 3000, 4000];

  it('trouve l\'ancre exacte', () => {
    expect(nearest(2000, T)).toBe(2);
  });

  it('choisit la plus proche, pas la précédente', () => {
    expect(nearest(1900, T)).toBe(2);
    expect(nearest(1100, T)).toBe(1);
  });

  // C'est LE piège qui a causé le blocage en va-et-vient : à mi-chemin en descendant,
  // `nearest` désigne la section qu'on APPROCHE. Ce test fige ce comportement pour que
  // personne ne le prenne pour « l'ancre d'où je pars » (cf. le commentaire du module).
  it('à mi-chemin, désigne la section VISÉE et non celle qu\'on quitte', () => {
    expect(nearest(1600, T)).toBe(2);
  });

  it('en cas d\'égalité parfaite, la première ancre gagne (déterminisme)', () => {
    expect(nearest(1500, T)).toBe(1);
  });

  it('borne aux extrémités', () => {
    expect(nearest(-500, T)).toBe(0);
    expect(nearest(99999, T)).toBe(4);
  });

  // tops() renvoie Infinity pour une section absente du DOM (module 3D planté)
  it('ignore les ancres absentes (Infinity)', () => {
    expect(nearest(2000, [0, Infinity, 2000, Infinity])).toBe(2);
  });
});

describe('hostOpacity() — retour de dégâts du mini-jeu', () => {
  it('va bien de OP_FULL à OP_DIM', () => {
    expect(hostOpacity(1)).toBeCloseTo(OP_FULL, 5);
    expect(hostOpacity(0)).toBeCloseTo(OP_DIM, 5);
  });

  it('décroît de façon monotone', () => {
    for (let i = 0; i < 20; i++) {
      expect(hostOpacity(i / 20)).toBeLessThan(hostOpacity((i + 1) / 20));
    }
  });

  it('borne hors intervalle', () => {
    expect(hostOpacity(-3)).toBeCloseTo(OP_DIM, 5);
    expect(hostOpacity(42)).toBeCloseTo(OP_FULL, 5);
  });

  // Le cœur du réglage : chaque brèche retire le même POURCENTAGE, pas la même
  // quantité. C'est ce qui rend tous les impacts également visibles (Weber-Fechner).
  // Un retour à une interpolation linéaire casserait ce test sans rien casser d'autre.
  it('chaque brèche retire un ratio constant', () => {
    const pas = 0.15; // 15 pv sur 100 par brèche
    const ratios: number[] = [];
    for (let n = 0; n < 6; n++) {
      ratios.push(hostOpacity(1 - (n + 1) * pas) / hostOpacity(1 - n * pas));
    }
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0], 6);
  });

  it('la première brèche coûte plus qu\'une descente linéaire', () => {
    const geo = hostOpacity(1) - hostOpacity(0.85);
    const lin = (OP_FULL - OP_DIM) * 0.15;
    expect(geo).toBeGreaterThan(lin * 1.8);
  });
});

describe('progression des signaux (easter egg SIG)', () => {
  const ids = SIGNALS.map((s) => s.id) as SignalId[];

  it('cinq signaux, tous d\'identifiant unique', () => {
    expect(SIGNALS).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it('la progression va de 0 à 1', () => {
    expect(discoveryProgress([])).toBe(0);
    expect(discoveryProgress(ids)).toBe(1);
    expect(discoveryProgress(ids.slice(0, 2))).toBeCloseTo(0.4, 5);
  });

  it('le mini-jeu ne se déverrouille qu\'au dernier signal', () => {
    expect(isDiscoveryComplete(ids.slice(0, 4))).toBe(false);
    expect(isDiscoveryComplete(ids)).toBe(true);
  });
});
