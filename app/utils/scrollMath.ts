// Fonctions PURES du snap de section. Elles vivaient dans la closure du useEffect de
// SectionSnap, donc hors d'atteinte d'un test. Extraites ici pour être couvertes : ce
// sont les seules du fichier dont une erreur ne se voit pas à la lecture.

/**
 * Index de l'ancre la plus proche de `y`.
 *
 * ATTENTION à ce que cette fonction ne dit PAS : « la plus proche » n'est pas « celle
 * d'où l'on vient ». Elle peut parfaitement désigner la section qu'on APPROCHE. C'est
 * exactement ce qui a causé le blocage en va-et-vient : après une sortie forcée, on
 * s'ancrait sur la section suivante alors qu'on était encore au-dessus d'elle, et la
 * règle « va à la voisine » lisait la descente en cours comme une demande de remontée.
 * Tout appelant doit donc traiter le résultat comme « l'ancre à rejoindre », jamais
 * comme « l'ancre d'où je pars ».
 *
 * En cas d'égalité parfaite, la PREMIÈRE ancre gagne (comparaison stricte) — le
 * comportement doit rester déterministe.
 */
export function nearest(y: number, tops: number[]): number {
  let best = 0;
  tops.forEach((t, k) => {
    if (Math.abs(y - t) < Math.abs(y - tops[best])) best = k;
  });
  return best;
}
