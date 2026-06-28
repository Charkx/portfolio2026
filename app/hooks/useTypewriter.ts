import { useEffect, useState } from 'react';

/**
 * Révèle un tableau de lignes ligne par ligne, lettre par lettre (effet terminal).
 * Se relance à chaque changement de `restartKey`.
 *
 * @param lines      les lignes à taper
 * @param restartKey valeur qui, en changeant, relance l'animation (ex: l'index sélectionné)
 * @param speed      intervalle entre deux ticks (ms)
 * @param step       nb de caractères ajoutés par tick (2 = un peu plus rapide)
 * @returns shown       portion visible de chaque ligne
 *          typingLine  index de la ligne en cours de frappe (-1 si terminé)
 *          done        true quand tout est affiché
 */
export function useTypewriter(
  lines: readonly string[],
  restartKey: unknown,
  speed = 16,
  step = 2,
) {
  // position courante : quelle ligne, et combien de ses caractères sont tapés
  const [pos, setPos] = useState({ line: 0, char: 0 });

  useEffect(() => {
    setPos({ line: 0, char: 0 }); // reset à chaque changement de catégorie
    const id = setInterval(() => {
      setPos((p) => {
        if (p.line >= lines.length) return p; // fini : on ne change plus (pas de re-render)
        const len = lines[p.line].length;
        const next = p.char + step;
        // ligne pas finie → on avance ; sinon → ligne suivante
        return next < len ? { line: p.line, char: next } : { line: p.line + 1, char: 0 };
      });
    }, speed);
    return () => clearInterval(id); // nettoyage : évite les timers qui s'empilent
    // restartKey suffit à relancer ; lines change en même temps que lui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey, speed, step]);

  const done = pos.line >= lines.length;
  const shown = lines.map((line, i) =>
    i < pos.line ? line : i === pos.line ? line.slice(0, pos.char) : ''
  );
  return { shown, typingLine: done ? -1 : pos.line, done };
}
