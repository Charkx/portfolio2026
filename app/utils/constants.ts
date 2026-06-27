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
    { name: "React",      icon: "react" },
    { name: "TypeScript", icon: "typescript" },
    { name: "NextJs",     icon: "nextjs" },
    { name: "JavaScript", icon: "javascript" },
    { name: "HTML5",      icon: "html5" },
    { name: "CSS3",       icon: "css3" },
    { name: "Tailwind",   icon: "tailwindcss" },
    { name: "ThreeJs",    icon: "threejs" },
  ],
  "Backend": [
    { name: "NodeJs",     icon: "nodejs" },
    { name: "Express",    icon: "express" },
    { name: "PostgreSQL", icon: "postgresql" },
    { name: "Java",       icon: "java" },
  ],
  "Outils": [
    { name: "Git",    icon: "git" },
    { name: "Github", icon: "github" },
    { name: "Docker", icon: "docker" },
    { name: "Jira",   icon: "jira" },
  ],
} as const

// --- Compétences sans logo devicon (rendues en texte) ---
export const SKILLS_EXTRA = [
  {
    title: "DevOps & CI/CD",
    items: ["CI/CD", "GitHub Actions", "Vercel", "Docker (notions)"],
  },
  {
    title: "IA & Productivité",
    items: ["Claude Code — usage quotidien", "Intégration de LLMs", "Développement augmenté"],
  },
  {
    title: "Méthodes",
    items: ["Agile", "Scrum", "Clean code", "Tests unitaires", "Architecture logicielle", "API REST"],
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
      "Je recherche une alternance en développement Full Stack à partir de septembre 2026, dans le cadre du Bachelor que je prépare chez CODA Avignon.",
    ],
  },
  {
    title: "PARCOURS",
    color: "text-purple-400",
    text: [
      "Après une pause professionnelle, j'ai consacré deux ans à monter en compétences de façon autonome :",
      "construction de projets réels déployés en production, exploration des technologies front modernes (React, TypeScript, Three.js) et intégration de l'IA (Claude Code) comme outil de dev quotidien.",
      "J'aime les interfaces soignées, les architectures propres et les projets à impact concret.",
    ],
  },
  {
    title: "CE QUE J'APPORTE",
    color: "text-cyan-400",
    text: [
      "▸ Profil hybride Développeur + Chef de Projet",
      "▸ Expérience Agile/Scrum réelle (ORTEC)",
      "▸ Pratique quotidienne de l'IA appliquée au code",
      "▸ Curiosité technique et autonomie",
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
