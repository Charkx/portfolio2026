# Portfolio 3D — Charly Menthiller

Portfolio interactif au parti pris cyberpunk : un hologramme humain en WebGL sert de fil conducteur, et chaque section du CV (parcours, compétences, projets, contact) est un module 3D qu'on manipule directement — cortex scannable, hélice d'ADN des langages, data-cubes de projets. Le tout en Next.js 15 / React 19 / Three.js, avec un HUD bilingue FR/EN, un moteur audio entièrement synthétisé (aucun fichier son), et un contenu HTML indexable rendu côté serveur pour ne rien sacrifier au SEO ni aux lecteurs d'écran.

🔗 **Démo en ligne : [charlymenthiller.com](https://charlymenthiller.com)**

---

## ✨ Fonctionnalités principales

**Expérience 3D**
- **Canvas partagé unique** (`AugmentedHumanLayer`) : un seul contexte WebGL traverse tout le site ; les sections HTML pilotent les modules 3D qui s'y nichent via un store dédié (`sceneStore`) — le HTML écrit, la 3D lit.
- **Matériau holographique custom** : shader injecté par `onBeforeCompile` (matérialisation progressive, edge glow, onde de choc à l'origine du clic), avec repli émissif si la compilation du shader échoue.
- **Modules interactifs** : cerveau holographique lié aux blocs du parcours, hélice d'ADN filtrable par niveau de maîtrise, data-cubes de projets qui explosent en étude de cas, carte biométrique de contact, logo 3D.
- **Mini-jeu caché** (`/transmission`) : 5 signaux disséminés dans le site (persistés en `localStorage`) déverrouillent une session de défense de 45 s — la page reste verrouillée tant que la découverte n'est pas complète.

**Performance**
- **Garde-fou FPS au runtime** : sous 40 fps pendant 3 s consécutives, la scène bascule automatiquement en mode éco (halo simplifié, DPR plafonné), une seule fois par session. Le bloom est *conservé* en éco — c'est lui qui fait qu'un hologramme ressemble à un hologramme — mais rendu bon marché par un seuil de luminance élevé.
- **Éco par défaut sur tactile** (`pointer: coarse`) pour garantir la fluidité au premier contact, surchargeable depuis la console de calibrage.
- **Code-splitting agressif** : toutes les sections Three.js sont en `dynamic(..., { ssr: false })` — hors du bundle initial, aucune exécution WebGL au prerender/build.
- **`LazyMount`** : réserve l'espace en permanence (zéro saut de layout) mais ne monte les canvas qu'à l'approche du scroll, et les démonte en s'éloignant.
- **Préchargement à progression réelle** : les `.glb` sont streamés via `ReadableStream` avec suivi des octets — la barre de chargement reflète le téléchargement réel, avec plafond de sécurité à 6 s et échec réseau non bloquant.
- **Aucun asset servi par un tiers** : ni CDN d'icônes, ni HDR distant. Les 17 SVG de la stack sont locaux (76 Ko) et l'environnement de la carte biométrique est procédural (`<Lightformer>`) au lieu d'un HDR de 1,7 Mo — un portfolio que consulte un recruteur ne doit pas dépendre de la disponibilité d'un tiers.

**Accessibilité & SEO**
- **Résumé serveur `sr-only`** dans `page.tsx` : identité, projets et contacts présents dans le HTML initial, lisibles par les crawlers et les lecteurs d'écran, indépendamment de la couche 3D.
- **`prefers-reduced-motion` respecté et surchargeable** : le réglage manuel de la console prime, se reflète sur `<html data-motion>` (les animations CSS suivent) et désactive le scroll détourné au profit du scroll natif.
- **JSON-LD `Person` + `WebSite`**, canonical vers le domaine custom, `sitemap.xml` et `robots.txt` générés, manifest PWA, image OpenGraph générée à la volée par `next/og` (aucun asset à maintenir).
- **404 diégétique volontairement statique** : aucun JS, aucune 3D — instantanée et robuste.

**Détails d'implémentation**
- **i18n maison** : dictionnaire FR/EN typé (`Dict`), langue persistée via `zustand/persist`, `<html lang>` synchronisé dès le boot — sans dépendance externe.
- **Moteur audio 100 % synthétisé** (Web Audio) : réverbe algorithmique sur impulse response générée, FM métallique, balayages filtrés — une vingtaine de cues, zéro fichier audio. Coupé par défaut, le contexte n'est créé qu'au geste utilisateur.
- **Scroll piloté par Lenis** + snap de section maison : amorcer le scroll suffit à être posé sur la section suivante ; neutralisé en mouvement réduit.
- **`ErrorBoundary` par section** : un module 3D qui échoue n'emporte pas le reste de la page.
- **Machine d'état explicite** pour le parcours de sélection des projets (`useProjectManager`) : transitions valides uniquement.
- **Aucune donnée personnelle sensible dans le bundle client** : le numéro de téléphone est volontairement absent de `constants.ts`, qui part côté client.

---

## 🧰 Stack technique

| Domaine | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack en dev) |
| Langage | TypeScript 5 (`strict: true`) |
| UI | React 19 |
| 3D | Three.js 0.178 · React Three Fiber 9 · Drei 10 · Postprocessing 3 |
| Styles | Tailwind CSS 4 (via `@tailwindcss/postcss`) |
| Animation | GSAP 3 · Lenis 1.3 (smooth scroll) |
| État | Zustand 5 (+ middleware `persist`) |
| Icônes | lucide-react · devicon + simple-icons (SVG **servis en local**) |
| Audio | Web Audio API (synthèse maison, sans dépendance) |
| Typographie | Orbitron + IBM Plex Mono (`next/font`) |
| Qualité | ESLint 9 (`eslint-config-next`) · Vitest 4 |
| Déploiement | Vercel |

---

## 🚀 Lancer en local

**Prérequis** : Node.js ≥ 20 (requis par Next.js 15) et npm.

```bash
git clone https://github.com/Charkx/portfolio2026.git
cd portfolio2026
npm install
npm run dev
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build de production
npm run start   # sert le build de production
npm run lint    # ESLint (non bloquant au build, cf. next.config.ts)
npm test        # Vitest — logique pure et invariants d'assets/i18n
```

Aucune variable d'environnement n'est nécessaire.

---

## 🧪 Tests

27 tests, sans DOM ni WebGL. Ils couvrent délibérément ce que **ni TypeScript ni
ESLint ne peuvent voir** :

| Fichier | Ce qu'il protège |
|---|---|
| `tests/assets.test.ts` | Chaque techno déclarée a bien son SVG local, aucun fichier orphelin, chaque logo porte une couleur, le CV existe à son chemin. *Un manque ici n'échoue pas : il affiche un trou.* |
| `tests/i18n.test.ts` | Parité des clés FR/EN, aucune chaîne vide, une description par techno dans les deux langues — et aucune traduction anglaise restée identique au français. |
| `tests/logic.test.ts` | `nearest()` (ancrage du snap de section) et `hostOpacity()` (courbe de dégâts du mini-jeu), extraites de leurs closures pour être testables. |

Le rendu 3D et les composants React ne sont pas testés : il faudrait jsdom et des
mocks WebGL pour des tests qui casseraient à chaque ajustement visuel. Trois
fichiers de logique pure valent mieux qu'une suite qu'on finit par désactiver.

> Au premier lancement, la suite a trouvé un vrai défaut : `vercel.svg` n'avait
> aucune couleur de remplissage — un triangle noir, donc invisible sur le fond
> sombre du site.

---

## 📁 Structure des fichiers

```
app/
├─ layout.tsx                 # metadata, JSON-LD, polices (Orbitron + IBM Plex Mono)
├─ page.tsx                   # page serveur : résumé sr-only indexable + montage du client
├─ ClientApp.tsx              # orchestration : préchargement, loader, sections dynamiques
├─ sections/                  # Hero · About · Skills · Projects · Contact
├─ components/
│  ├─ 3d/                     # canvas partagé, scène, cerveau, ADN, data-cubes, carte, shader holo
│  ├─ ui/                     # HUD AR, console de calibrage, curseur custom, modales, terminal
│  ├─ SmoothScroll.tsx        # intégration Lenis + cibles de scroll par section
│  ├─ SectionSnap.tsx         # snap de section (desktop, hors reduced-motion)
│  └─ LazyMount.tsx           # montage des canvas à l'approche du scroll
├─ store/                     # zustand : portfolio, scene, settings, audio, lang, modal, discovery
├─ hooks/                     # useInView, useDragRotate, useTypewriter, useReducedMotion, ErrorBoundary…
├─ lib/
│  ├─ audioEngine.ts          # moteur Web Audio (singleton, synthèse pure)
│  └─ preloadAssets.ts        # préchargement des .glb avec progression réelle
├─ i18n/                      # dictionnaire FR/EN typé + hook useT
├─ utils/                     # constants (profil, stack), projectsData, types,
│                             # scrollMath + holoDamage (fonctions pures testées)
├─ transmission/              # mini-jeu déverrouillable (page + canvas dédié)
├─ mentions-legales/          # page légale (repli sans JS de la modale)
├─ sitemap.ts · robots.ts · manifest.ts · opengraph-image.tsx   # SEO / PWA générés
│                                                              # (image OG produite par next/og : rien à maintenir)
└─ globals.css                # design system cyberpunk (variables, animations, [data-motion])

public/
├─ 3d/                        # modèles GLB (humain holographique, cerveau)
├─ icons/tech/                # 17 SVG de la stack, servis en local (aucun CDN)
├─ projects/                  # visuels des projets (WebP)
└─ CV_Charly_Menthiller.pdf

tests/                        # Vitest — assets, i18n, logique pure
```

---

## 👤 Auteur

**Charly Menthiller** — Ingénieur informatique, développeur Full Stack.

- 🌐 [charlymenthiller.com](https://charlymenthiller.com)
- 💼 [linkedin.com/in/charly-menthiller](https://www.linkedin.com/in/charly-menthiller/)
- 💻 [github.com/Charkx](https://github.com/Charkx)
