// Courbe de retour de dégâts du mini-jeu, extraite de la boucle useFrame pour être
// testable. C'est un réglage qui a demandé plusieurs passes et dont une régression
// serait SILENCIEUSE : le jeu continuerait de tourner, les impacts se verraient juste
// moins bien. Exactement le genre de chose qu'un test protège mieux qu'une relecture.

export const OP_FULL = 0.75; // intégrité intacte
export const OP_DIM = 0.08;  // au bord de la rupture

/**
 * Luminosité de l'hôte pour une intégrité donnée (0 → 1).
 *
 * Décroissance GÉOMÉTRIQUE et non linéaire : l'œil juge les écarts de luminosité en
 * relatif (Weber-Fechner). Retirer 0,10 à 0,75 est imperceptible, le même 0,10 à 0,20
 * est brutal — un pas linéaire ment donc à l'œil. Ici chaque brèche retire le même
 * POURCENTAGE, ce qui rend tous les impacts également visibles.
 */
export function hostOpacity(integrity: number): number {
  const hp = Math.min(Math.max(integrity, 0), 1);
  return OP_FULL * Math.pow(OP_DIM / OP_FULL, 1 - hp);
}
