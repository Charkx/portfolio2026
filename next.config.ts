import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Le lint ne bloque pas le déploiement (il reste lançable via `npm run lint`).
    // Évite qu'une règle ESLint stricte fasse échouer le build sur Vercel.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
