import ClientApp from "./ClientApp"
import { PROFILE } from "./utils/constants"
import { PROJECTS_DATA } from "./utils/projectsData"

// Page serveur : rend un résumé indexable (SEO + lecteurs d'écran) dans le HTML
// initial — l'expérience 3D interactive (ClientApp) se superpose côté client.
export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    jobTitle: "Développeur Full Stack",
    description: `${PROFILE.title} — ${PROFILE.availability}`,
    email: `mailto:${PROFILE.email}`,
    url: "https://charlymenthiller.vercel.app",
    sameAs: [PROFILE.github, PROFILE.linkedin],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Résumé accessible et indexable (sr-only : lu par les crawlers et lecteurs
          d'écran, invisible à l'écran). Liens en tabIndex -1 : pas de tab fantôme. */}
      <section className="sr-only" aria-label="Résumé du portfolio">
        <h1>{PROFILE.name} — Développeur Full Stack</h1>
        <p>{PROFILE.title} · {PROFILE.availability}</p>
        <p>{PROFILE.subtitle} · {PROFILE.location}</p>
        <p>
          Portfolio interactif 3D construit avec React, Next.js, TypeScript,
          Three.js (React Three Fiber), Node.js et Tailwind CSS.
        </p>

        <h2>Projets</h2>
        <ul>
          {PROJECTS_DATA.map((p) => (
            <li key={p.memId}>
              {p.title} ({p.tech.join(", ")}) — {p.description}{" "}
              {p.github && <a href={p.github} tabIndex={-1}>code source</a>}
              {p.demo && <> · <a href={p.demo} tabIndex={-1}>démo en ligne</a></>}
            </li>
          ))}
        </ul>

        <h2>Contact</h2>
        <p>
          <a href={`mailto:${PROFILE.email}`} tabIndex={-1}>{PROFILE.email}</a>
          {" · "}
          <a href={PROFILE.github} tabIndex={-1}>{PROFILE.githubLabel}</a>
          {" · "}
          <a href={PROFILE.linkedin} tabIndex={-1}>{PROFILE.linkedinLabel}</a>
        </p>
      </section>

      <ClientApp />
    </>
  )
}
