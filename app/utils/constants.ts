// --- Profil / identité ---

export const PROFILE = {
  name:         "Charly Menthiller",
  title:        "Ingénieur Informatique - Développeur Full Stack",
  availability: "Alternance · Septembre 2026",
  subtitle:     "Ingénieur Bac+5 Polytech Marseille · Bachelor CODA Avignon",
  email:        "charly.menthiller@gmail.com",
  phone:        "0651726048",
  phoneDisplay: "06 51 72 60 48",
  github:       "https://github.com/Charkx",
  githubLabel:  "github.com/Charkx",
  linkedin:     "https://www.linkedin.com/in/charly-menthiller/",
  linkedinLabel:"linkedin.com/in/charly-menthiller",
  location:     "Roquemaure (30) — Mobile selon l'offre",
  cv:           "/CV_Charly_Menthiller.pdf",
} as const

// --- Stack technique (icônes devicon + DNA 3D) ---
// Important : les "name" servent d'ID CSS (#tech-trigger-{name}). Pas d'espace
// ni de point. Le "icon" doit correspondre à un slug devicon existant.
export const TECH_STACK = {
  "Frontend": [
    { name: "React",      icon: "react",       level: 3, desc: "Le cœur de mon front : composants, hooks, gestion d'état. Sur tous mes projets." },
    { name: "TypeScript", icon: "typescript",  level: 3, desc: "Mon réflexe : typer pour fiabiliser. Strict sur tout ce portfolio." },
    { name: "NextJs",     icon: "nextjs",      level: 2, desc: "App Router, SSR, déploiement Vercel — ce portfolio tourne dessus." },
    { name: "JavaScript", icon: "javascript",  level: 3, desc: "La base de tout mon code, front comme back." },
    { name: "HTML5",      icon: "html5",       level: 3, desc: "Structure sémantique et accessible." },
    { name: "CSS3",       icon: "css3",        level: 2, desc: "Layouts, animations, responsive — même sans framework." },
    { name: "Tailwind",   icon: "tailwindcss", level: 2, desc: "Mon outil de stylage au quotidien : rapide et cohérent." },
    { name: "ThreeJs",    icon: "threejs",     level: 2, desc: "3D temps réel avec React-Three-Fiber — ce cerveau et cette hélice, c'est moi." },
  ],
  "Backend": [
    { name: "NodeJs",     icon: "nodejs",      level: 2, desc: "Serveurs et API REST côté back." },
    { name: "Supabase",    icon: "supabase",     level: 2, desc: "Routing et API REST sur mes projets." },
    { name: "PostgreSQL", icon: "postgresql",  level: 2, desc: "Modélisation relationnelle et requêtes SQL." },
    { name: "Java",       icon: "java",        level: 2, desc: "Découvert en école, approfondi en stage R&D chez Dassault Systèmes." },
  ],
  // Affiché dans la LISTE (logos + niveaux), mais exclu de l'hélice (ADN = langages).
  "DevOps & CI/CD": [
    { name: "Git",    icon: "git",    level: 3, desc: "Versioning quotidien : branches, commits propres, historique clair." },
    { name: "Github", icon: "github", level: 3, desc: "Repos, pull requests, déploiement continu." },
    { name: "Docker", icon: "docker", level: 1, desc: "Conteneurisation : notions solides, en montée en compétence." },
    { name: "Vercel", icon: "vercel", level: 2, desc: "Déploiement continu de mes apps Next.js." },
  ],
} as const

// --- Les 2 brins de l'hélice : ce qui RELIE les langages (méthodes + IA) ---
// `color` teinte le brin 3D ET la légende (cohérence couleur ↔ brin).
export const HELIX_STRANDS = [
  {
    label: "MÉTHODES",
    color: "#34d399", // vert émeraude
    items: ["Agile/Scrum", "Jira", "Figma", "Notion", "Clean code", "Tests unitaires", "Architecture logicielle", "API REST"],
  },
  {
    label: "IA & PRODUCTIVITÉ",
    color: "#c084fc", // violet
    items: ["Claude Code", "Intégration de LLMs", "Développement augmenté"],
  },
] as const

export const SCAN_COLORS = ["#ff00ff", "#9b5de5", "#00ffff"] as const

// --- À propos / parcours (rendu en blocs dans AboutSection) ---
export const ABOUT_TEXT = [
  {
    title: "PROFIL",
    color: "text-pink-400",
    text: [
      "Ingénieur informatique Bac+5 diplômé de Polytech Marseille (spécialisation Réalité Virtuelle & Augmentée).",
      "Après une pause pro, j'ai consacré deux ans à monter en compétences en autonomie : projets réels déployés en production, front moderne (React, TypeScript, Three.js) et IA (Claude Code) au quotidien.",
      "Je recherche une alternance en développement Full Stack à partir de septembre 2026, dans le cadre du Bachelor que je prépare chez CODA Avignon.",
      "▸ Ce que j'apporte :",
      "- Profil hybride Développeur + Chef de Projet",
      "- Expérience Agile/Scrum réelle (ORTEC)",
      "- Pratique quotidienne de l'IA appliquée au code",
      "- Curiosité technique et autonomie",
    ],
  },
  {
    title: "EXPÉRIENCE",
    color: "text-green-400",
    text: [
      "▸ Chef de Projet IT / Dev Full Stack — ORTEC Services",
      "Déc. 2021 – Janv. 2023 · Aix-en-Provence",
      "Pilotage end-to-end d'un projet intranet/extranet SharePoint, animation des rituels Agile/Scrum (Jira, reporting COPIL), encadrement d'une équipe de développeurs.",
      "▸ Ingénieur Logiciel — Stage R&D — Dassault Systèmes",
      "Mars – Sept. 2020 · Grenoble",
      "Développement Java sur la plateforme 3DEXPERIENCE (SaaS), au sein d'une équipe R&D internationale, sous standards qualité industriels exigeants.",
    ],
  },
  {
    title: "FORMATION",
    color: "text-yellow-400",
    text: [
      "▸ Bachelor Développeur Full Stack — CODA Avignon (en cours, diplômant sept. 2026)",
      "▸ Diplôme d'Ingénieur Informatique — Polytech Marseille (AMU)",
      "Spécialisation Réalité Virtuelle & Augmentée · Bac+5 · 2018–2021",
      "▸ CPGE intégrée · 2016–2018",
    ],
  },
] as const
