import next from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...next,
  {
    // Les règles React Compiler (eslint-config-next@16) sont très strictes sur
    // le code react-three-fiber (refs lus au render, Math.random en init de ref…).
    // On les garde visibles en warning plutôt que de bloquer le build.
    // À traiter comme dette technique, fichier par fichier.
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
];

export default eslintConfig;
