import { ABOUT_TEXT, TECH_STACK, HELIX_STRANDS } from "../utils/constants"
import { PROJECTS_DATA } from "../utils/projectsData"

// ---------------------------------------------------------------------------
// Dictionnaire i18n — FR = source canonique (réutilise les constantes existantes,
// aussi consommées par le bloc SEO serveur). EN est contraint par `typeof fr` :
// une clé manquante ou en trop = erreur TypeScript.
// Les éléments diégétiques DÉJÀ en anglais (ACCESS GRANTED, HELLO!, MEMORY_DUMP,
// titres de sections type ABOUT:COGNITIVE_PROFILE) sont communs aux deux langues.
// ---------------------------------------------------------------------------

const projFr = Object.fromEntries(
  PROJECTS_DATA.map((p) => [p.memId, {
    description: p.description,
    probleme: p.probleme ?? p.description,
    solution: p.solution ?? p.contribution,
    resultat: p.resultat ?? "",
    highlights: [...(p.highlights ?? [])] as string[],
  }]),
)

export const fr = {
  // --- ATH / HUD ---
  hud: {
    nav: { about: "PROFIL", skills: "SKILLS", projects: "PROJECTS", contact: "CONTACT" },
    navGoTo: "Aller à la section",
    chapters: {
      hero: "01 · IDENTIFICATION",
      about: "02 · MÉMOIRE.PROFIL",
      skills: "03 · STRUCTURE.ADN",
      projects: "04 · MANIPULATION.RÉALITÉ",
      contact: "05 · DÉCONNEXION",
    } as Record<string, string>,
    mode: "ALTERNANCE",
    tipCv: "Télécharger le CV (memory dump)",
    tipSoundOn: "Activer le son (effets de section)",
    tipSoundOff: "Couper le son",
    tipUnlock: "Déverrouiller l'accès au site",
    tipLock: "Reverrouiller (rejouer l'intro)",
    cvModalTitle: "CV — Charly Menthiller",
    volume: "Volume du son",
    language: "Langue",
  },

  // --- Loader ---
  loader: {
    steps: [
      "INITIALISATION...",
      "CHARGEMENT DES MODULES HOLOGRAPHIQUES...",
      "DÉCOMPRESSION DU MODÈLE NEURAL...",
      "CALIBRAGE DE L'INTERFACE...",
      "SYSTÈME PRÊT",
    ],
    loading: "Chargement...",
  },

  // --- Hero / entrée ---
  hero: {
    availability: "⏳ Alternance · Septembre 2026",
    // identité affichée EN CLAIR sur l'écran verrouillé : un visiteur doit savoir
    // qui il regarde avant d'avoir à jouer la séquence d'entrée
    role: "Développeur Full Stack · Ingénieur informatique",
    scan: "INITIER LE SCAN",
    skip: "Passer l'intro",
    scroll: "SCROLL",
    grantedHint: "Scroll pour initialiser l'interface neurale…",
    loading3d: "// initialisation du scan biométrique...",
    module3dKo: "// module 3D indisponible",
  },

  // --- Console de calibrage ---
  calibration: {
    intro: "> Sujet reconnu — calibrage de session requis :",
    help: "Clique une option sur la ligne clignotante — rien n'est validé d'avance.",
    audio: "> FLUX AUDIO :", audioOn: "[ACTIVÉ]", audioOff: "[COUPÉ]",
    volume: "> VOLUME :",
    motion: "> ANIMATIONS :", motionFull: "[COMPLÈTES]", motionReduced: "[RÉDUITES]",
    quality: "> QUALITÉ :", qHigh: "[HAUTE]", qEco: "[ÉCO]", qEcoTip: "Bloom coupé, rendu allégé",
    lang: "> LANGUE :",
    locked: "> Paramètres verrouillés — établissement du lien neural…",
  },

  // --- About ---
  about: {
    kicker: "ACCÈS MÉMOIRE.PROFIL — SCAN CORTICAL",
    title: "ABOUT:COGNITIVE_PROFILE",
    hint: "Trois couches à scanner : profil, expérience, formation.",
    tapHint: "▸ Tape une couche — le cerveau se scanne, puis le dossier s'ouvre",
    blocks: ABOUT_TEXT.map((b) => ({ title: b.title as string, text: [...b.text] as string[] })),
  },

  // --- Skills ---
  skills: {
    kicker: "ACCÈS MÉMOIRE.COMPÉTENCES — SÉQUENÇAGE ADN",
    title: "SKILLS:DNA_MODULE_ANALYSIS",
    hint: "Chaque technologie apprise devient un fragment de mon ADN de développeur — clique un module pour le décoder.",
    filters: { all: "Tout", l3: "●●● Maîtrise", l2: "●●○ Avancé", l1: "●○○ Familier" },
    filterGroup: "Filtrer par niveau",
    tapHint: "▸ Choisis un niveau — l'hélice se réorganise, puis les modules s'ouvrent",
    clickHint: "▸ Clique un module pour le décoder",
    browserTitle: ">> SÉQUENÇAGE ADN — MODULES",
    decodeTitle: ">> DÉCODAGE :",
    decoded: "▸ décodé",
    close: "[ fermer ]",
    levelOf: (n: number) => `Niveau ${n} sur 3`,
    strands: HELIX_STRANDS.map((s) => ({ label: s.label as string, items: [...s.items] as string[] })),
    techDesc: Object.fromEntries(Object.values(TECH_STACK).flat().map((t) => [t.name, t.desc])) as Record<string, string>,
  },

  // --- Projects ---
  projects: {
    kicker: "> ACCÈS MÉMOIRE.PROJETS — MANIPULATION DE RÉALITÉ",
    title: "PROJECTS:MANIPULATION_REALITE",
    hintDesktop: "Quatre fragments de réalité gravitent au-dessus de ma paume — clique sur un cube pour le déployer",
    tapHint: "▸ Tape un fragment pour déployer son étude de cas",
    powering: "Mise sous tension...",
    loadingLabel: "Chargement en cours",
    group: "Projets",
    caseFolder: "> DOSSIER PROJET —",
    caseContext: "Contexte",
    caseContribution: "Ma contribution",
    caseResult: "Résultat",
    caseStack: "Stack technique",
    caseCode: "VOIR LE CODE",
    caseDemo: "LANCER LA DÉMO",
    demoModal: "démo live",
    previewAlt: "Aperçu —",
    contexts: { PRO: "Pro", ASSO: "Asso", ECOLE: "École", PERSO: "Perso" } as Record<string, string>,
    data: projFr,
  },

  // --- Contact ---
  contact: {
    kicker: "FIN DE SESSION — ARTEFACT DÉTECTÉ",
    title: "CONTACT:TRANSMISSION",
    hint: "La carte est le seul artefact qui subsiste — établis le lien.",
    howto: "▸ Touche un intitulé pour interroger la carte · la valeur ouvre le canal",
    channelsHeader: "CANAUX DE CONTACT",
    cvValue: "◆ Consulter le CV",
    calendlyBtn: "▸ PRENDRE RENDEZ-VOUS",
    calendlySub: "via Calendly · créneau de 30 min",
    calendlyModal: "Prendre rendez-vous",
    cardAlt: "Carte d'identité — Charly Menthiller",
    endLine1: "> FIN DE SESSION... DÉCONNEXION DU LIEN NEURAL",
    endLine2: "> ARTEFACT DÉTECTÉ : CARTE.MENTHILLER_009",
    endLine3: "> CANAL DE TRANSMISSION OUVERT",
    availability: "⏳ Alternance · Septembre 2026",
  },

  // --- Easter egg SIG ---
  signals: {
    labels: {
      firefly: "LUCIOLE CAPTÉE", brain: "CORTEX SCANNÉ", adn: "ADN RÉAGENCÉ",
      cube: "CUBE DÉCRYPTÉ", card: "CANAL OUVERT",
    } as Record<string, string>,
    access: "[ACCÈS] ▸",
    accessAria: "Signal complet — ouvrir la transmission secrète",
    panelHeader: "> SIGNAUX CAPTÉS ·",
    unlocked: "▸ TRANSMISSION DÉVERROUILLÉE",
    hint: "Capte tous les signaux pour déverrouiller",
    toastComplete: "SIGNAL COMPLET — TRANSMISSION DÉVERROUILLÉE",
    toastStep: (pct: number) => `SIGNAL +20% · SIG ${pct}%`,
  },

  // --- Mini-jeu /transmission ---
  transmission: {
    lockedTitle: "> SIGNAL INCOMPLET",
    lockedBody: "Cette transmission se déverrouille en captant les 5 signaux disséminés dans le site (jauge SIG).",
    back: "◂ RETOUR",
    quit: "◂ QUITTER",
    integrity: "INTÉGRITÉ DE L'HÔTE",
    combo: "COMBO ×",
    score: "SCORE",
    record: "RECORD",
    win: "HÔTE PRÉSERVÉ",
    lose: "HÔTE COMPROMIS",
    neutralized: (best: number) => `menaces neutralisées · record ${best}`,
    idleTitle: "SIGNAL CAPTÉ ✦",
    brief: (s: number) => `Des data-cubes convergent vers l'hôte holographique. Clique-les avant l'impact — enchaîne pour le combo. Une brèche entame l'intégrité. Tiens ${s}s.`,
    replay: "REJOUER",
    launch: "▸ LANCER",
  },

  // --- Divers ---
  misc: {
    footerLegal: "Mentions légales",
    legalModal: "Mentions légales",
    closeAria: "Fermer",
    loadingModule: "// chargement du module...",
    pdfDownload: "↓ Télécharger le PDF",
    calendlyOpen: "Ouvrir Calendly ↗",
    demoOpen: "Ouvrir en plein écran ↗",
    demoTitle: "Démo du projet",
    dragTitle: "Glisse pour faire pivoter",
    volumeOf: (n: number) => `Volume ${n} sur 5`,
  },
}

export type Dict = typeof fr

export const en: Dict = {
  hud: {
    nav: { about: "PROFILE", skills: "SKILLS", projects: "PROJECTS", contact: "CONTACT" },
    navGoTo: "Go to section",
    chapters: {
      hero: "01 · IDENTIFICATION",
      about: "02 · MEMORY.PROFILE",
      skills: "03 · DNA.STRUCTURE",
      projects: "04 · REALITY.MANIPULATION",
      contact: "05 · DISCONNECT",
    },
    mode: "APPRENTICESHIP",
    tipCv: "Download resume (memory dump)",
    tipSoundOn: "Enable sound (section effects)",
    tipSoundOff: "Mute sound",
    tipUnlock: "Unlock site access",
    tipLock: "Lock again (replay the intro)",
    cvModalTitle: "Resume — Charly Menthiller",
    volume: "Sound volume",
    language: "Language",
  },

  loader: {
    steps: [
      "INITIALIZING...",
      "LOADING HOLOGRAPHIC MODULES...",
      "DECOMPRESSING NEURAL MODEL...",
      "CALIBRATING INTERFACE...",
      "SYSTEM READY",
    ],
    loading: "Loading...",
  },

  hero: {
    availability: "⏳ Apprenticeship · September 2026",
    role: "Full Stack Developer · Software Engineer",
    scan: "INITIATE SCAN",
    skip: "Skip intro",
    scroll: "SCROLL",
    grantedHint: "Scroll to initialize the neural interface…",
    loading3d: "// initializing biometric scan...",
    module3dKo: "// 3D module unavailable",
  },

  calibration: {
    intro: "> Subject identified — session calibration required:",
    help: "Click an option on the blinking line — nothing is preset.",
    audio: "> AUDIO FEED:", audioOn: "[ON]", audioOff: "[OFF]",
    volume: "> VOLUME:",
    motion: "> ANIMATIONS:", motionFull: "[FULL]", motionReduced: "[REDUCED]",
    quality: "> QUALITY:", qHigh: "[HIGH]", qEco: "[ECO]", qEcoTip: "Bloom off, lighter rendering",
    lang: "> LANGUAGE:",
    locked: "> Settings locked — establishing neural link…",
  },

  about: {
    kicker: "MEMORY ACCESS.PROFILE — CORTICAL SCAN",
    title: "ABOUT:COGNITIVE_PROFILE",
    hint: "Three layers to scan: profile, experience, education.",
    tapHint: "▸ Tap a layer — the brain scans, then the file opens",
    blocks: [
      {
        title: "PROFILE",
        text: [
          "Computer science engineer (5-year MEng) graduated from Polytech Marseille (Virtual & Augmented Reality specialization).",
          "After a career break, I spent two years leveling up on my own: real projects shipped to production, modern front-end (React, TypeScript, Three.js) and AI (Claude Code) daily.",
          "I'm looking for a Full Stack apprenticeship starting September 2026, as part of the Bachelor's degree I'm pursuing at CODA Avignon.",
          "▸ What I bring:",
          "- Hybrid Developer + Project Manager profile",
          "- Real Agile/Scrum experience (ORTEC)",
          "- Daily practice of AI applied to code",
          "- Technical curiosity and autonomy",
        ],
      },
      {
        title: "EXPERIENCE",
        text: [
          "▸ IT Project Manager / Full Stack Dev — ORTEC Services",
          "Dec. 2021 – Jan. 2023 · Aix-en-Provence",
          "End-to-end management of a SharePoint intranet/extranet project, running Agile/Scrum rituals (Jira, steering-committee reporting), leading a team of developers.",
          "▸ Software Engineer — R&D Internship — Dassault Systèmes",
          "Mar. – Sept. 2020 · Grenoble",
          "Java development on the 3DEXPERIENCE platform (SaaS), within an international R&D team, under demanding industrial quality standards.",
        ],
      },
      {
        title: "EDUCATION",
        text: [
          "▸ Bachelor Full Stack Developer — CODA Avignon (ongoing, graduating Sept. 2026)",
          "▸ Master's in Computer Engineering — Polytech Marseille (AMU)",
          "Virtual & Augmented Reality specialization · 5-year degree · 2018–2021",
          "▸ Integrated preparatory classes · 2016–2018",
        ],
      },
    ],
  },

  skills: {
    kicker: "MEMORY ACCESS.SKILLS — DNA SEQUENCING",
    title: "SKILLS:DNA_MODULE_ANALYSIS",
    hint: "Every technology I learn becomes a fragment of my developer DNA — click a module to decode it.",
    filters: { all: "All", l3: "●●● Mastery", l2: "●●○ Advanced", l1: "●○○ Familiar" },
    filterGroup: "Filter by level",
    tapHint: "▸ Pick a level — the helix rearranges, then the modules open",
    clickHint: "▸ Click a module to decode it",
    browserTitle: ">> DNA SEQUENCING — MODULES",
    decodeTitle: ">> DECODING:",
    decoded: "▸ decoded",
    close: "[ close ]",
    levelOf: (n: number) => `Level ${n} of 3`,
    strands: [
      { label: "METHODS", items: ["Agile/Scrum", "Jira", "Figma", "Notion", "Clean code", "Unit testing", "Software architecture", "REST APIs"] },
      { label: "AI & PRODUCTIVITY", items: ["Claude Code", "LLM integration", "AI-augmented development"] },
    ],
    techDesc: {
      React: "The core of my front-end: components, hooks, state management. On all my projects.",
      TypeScript: "My reflex: type everything for reliability. Strict across this whole portfolio.",
      NextJs: "App Router, SSR, Vercel deployment — this portfolio runs on it.",
      JavaScript: "The foundation of all my code, front and back.",
      HTML5: "Semantic, accessible structure.",
      CSS3: "Layouts, animations, responsive — even without a framework.",
      Tailwind: "My day-to-day styling tool: fast and consistent.",
      ThreeJs: "Real-time 3D with React Three Fiber — this brain and this helix are mine.",
      NodeJs: "Servers and REST APIs on the back-end.",
      Supabase: "Routing and REST APIs on my projects.",
      PostgreSQL: "Relational modeling and SQL queries.",
      Java: "Discovered in school, deepened during an R&D internship at Dassault Systèmes.",
      Git: "Daily versioning: branches, clean commits, clear history.",
      Github: "Repos, pull requests, continuous deployment.",
      Docker: "Containerization: solid basics, actively improving.",
      Vercel: "Continuous deployment of my Next.js apps.",
    },
  },

  projects: {
    kicker: "> MEMORY ACCESS.PROJECTS — REALITY MANIPULATION",
    title: "PROJECTS:MANIPULATION_REALITE",
    hintDesktop: "Four fragments of reality orbit above my palm — click a cube to deploy it",
    tapHint: "▸ Tap a fragment to deploy its case study",
    powering: "Powering up...",
    loadingLabel: "Loading",
    group: "Projects",
    caseFolder: "> PROJECT FILE —",
    caseContext: "Context",
    caseContribution: "My contribution",
    caseResult: "Result",
    caseStack: "Tech stack",
    caseCode: "VIEW CODE",
    caseDemo: "LAUNCH DEMO",
    demoModal: "live demo",
    previewAlt: "Preview —",
    contexts: { PRO: "Work", ASSO: "Nonprofit", ECOLE: "School", PERSO: "Personal" },
    data: {
      "PRJ.001": {
        description: "Community platform for a 2,000-member gaming association. FIFA-style player cards, fed by real competitive performance data.",
        probleme: "A 2,000-member gaming association tracked its players' competitive performance in Excel files: no overview, no way for a player to see where they stood or track their progress.",
        solution: "I designed and shipped the platform alone, end to end: custom Excel parser to ingest the existing data, scoring algorithm calibrated on real performance, FIFA-style player cards animated with Framer Motion, PostgreSQL database and continuous deployment on Vercel.",
        resultat: "In production and used by the community: every player has a card fed by their real competition stats. My first project carried solo under real-world conditions, from raw data to deployed product.",
        highlights: ["Delivered solo end-to-end", "Real data", "Deployed to production"],
      },
      "PRJ.002": {
        description: "Modern showcase website with advanced animations, designed and deployed end to end.",
        probleme: "A professional project: build an online showcase worthy of an artistic visual identity — a fast, modern site with real animations, designed from scratch.",
        solution: "I carried the project from design to deployment: mockups, Next.js + Tailwind CSS development, GSAP animations orchestrated on scroll, media optimization and launch on Vercel.",
        resultat: "Site live, fast and animated, delivered in full autonomy — from brief to production.",
        highlights: ["Advanced animations", "Performance", "Deployed to production"],
      },
      "PRJ.003": {
        description: "Interactive 3D experience running right in the browser (this very portfolio).",
        probleme: "How do you stand out among hundreds of developer portfolios? Rather than listing my front-end skills, I wanted the site itself to be the proof: a real-time 3D experience driven by scroll, right in the browser.",
        solution: "Scroll-driven WebGL scene (React Three Fiber): a human hologram traversed station by station, interactive 3D modules per section, custom shaders, WebAudio-synthesized sound design — integrated into Next.js with real accessibility fallbacks (reduced motion, keyboard navigation, server-rendered content).",
        resultat: "The site you are visiting right now: compressed 3D assets (Draco), server-side SEO, and a permanent playground for real-time rendering.",
        highlights: ["WebGL", "Real-time 3D animations"],
      },
      "PRJ.004": {
        description: "Polytech Marseille student union: showcase website for the campaign.",
        probleme: "Student union campaign at Polytech Marseille: the team needed a striking showcase site to carry its campaign, within the short timeframe imposed by the event.",
        solution: "React + Tailwind CSS development, GSAP animations to convey the campaign's energy, integration of the team's content (program, members, events).",
        resultat: "Site live throughout the campaign, showcasing the team to the students.",
        highlights: ["React", "UI/UX"],
      },
    },
  },

  contact: {
    kicker: "END OF SESSION — ARTIFACT DETECTED",
    title: "CONTACT:TRANSMISSION",
    hint: "The card is the only artifact left — establish the link.",
    howto: "▸ Tap a label to query the card · the value opens the channel",
    channelsHeader: "CONTACT CHANNELS",
    cvValue: "◆ View resume",
    calendlyBtn: "▸ BOOK A MEETING",
    calendlySub: "via Calendly · 30-min slot",
    calendlyModal: "Book a meeting",
    cardAlt: "ID card — Charly Menthiller",
    endLine1: "> END OF SESSION... DISCONNECTING NEURAL LINK",
    endLine2: "> ARTIFACT DETECTED: CARD.MENTHILLER_009",
    endLine3: "> TRANSMISSION CHANNEL OPEN",
    availability: "⏳ Apprenticeship · September 2026",
  },

  signals: {
    labels: {
      firefly: "FIREFLY CAUGHT", brain: "CORTEX SCANNED", adn: "DNA REARRANGED",
      cube: "CUBE DECRYPTED", card: "CHANNEL OPENED",
    },
    access: "[ACCESS] ▸",
    accessAria: "Signal complete — open the secret transmission",
    panelHeader: "> SIGNALS CAUGHT ·",
    unlocked: "▸ TRANSMISSION UNLOCKED",
    hint: "Catch every signal to unlock",
    toastComplete: "SIGNAL COMPLETE — TRANSMISSION UNLOCKED",
    toastStep: (pct: number) => `SIGNAL +20% · SIG ${pct}%`,
  },

  transmission: {
    lockedTitle: "> INCOMPLETE SIGNAL",
    lockedBody: "This transmission unlocks by catching the 5 signals hidden across the site (SIG gauge).",
    back: "◂ BACK",
    quit: "◂ QUIT",
    integrity: "HOST INTEGRITY",
    combo: "COMBO ×",
    score: "SCORE",
    record: "BEST",
    win: "HOST PRESERVED",
    lose: "HOST COMPROMISED",
    neutralized: (best: number) => `threats neutralized · best ${best}`,
    idleTitle: "SIGNAL CAUGHT ✦",
    brief: (s: number) => `Data cubes are converging on the holographic host. Click them before impact — chain hits for combos. Each breach damages integrity. Survive ${s}s.`,
    replay: "PLAY AGAIN",
    launch: "▸ START",
  },

  misc: {
    footerLegal: "Legal notice",
    legalModal: "Legal notice (French)",
    closeAria: "Close",
    loadingModule: "// loading module...",
    pdfDownload: "↓ Download PDF",
    calendlyOpen: "Open Calendly ↗",
    demoOpen: "Open fullscreen ↗",
    demoTitle: "Project demo",
    dragTitle: "Drag to rotate",
    volumeOf: (n: number) => `Volume ${n} of 5`,
  },
}
