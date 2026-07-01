import { PROFILE } from "../utils/constants"

// Bloc de rubrique
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-l-2 border-cyan-400/30 pl-4">
      <h3 className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2">{title}</h3>
      <div className="text-cyan-100/70 text-sm leading-relaxed space-y-1">{children}</div>
    </section>
  )
}

/** Contenu des mentions légales — réutilisé par la modale ET la page /mentions-legales. */
export default function LegalContent() {
  return (
    <div className="space-y-8">
      <Section title="Éditeur du site">
        <p>{PROFILE.name}</p>
        <p>Particulier — développeur web</p>
        <p>Roquemaure (30), France</p>
        <p>
          Contact :{" "}
          <a href={`mailto:${PROFILE.email}`} className="text-cyan-300 underline hover:text-cyan-100">
            {PROFILE.email}
          </a>
        </p>
      </Section>

      <Section title="Directeur de la publication">
        <p>{PROFILE.name}</p>
      </Section>

      <Section title="Hébergeur">
        <p>Vercel Inc.</p>
        <p>340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
        <p>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 underline hover:text-cyan-100"
          >
            vercel.com
          </a>
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L&apos;ensemble du contenu de ce site (textes, code, visuels, animations) est la propriété
          exclusive de {PROFILE.name}, sauf mentions contraires. Toute reproduction ou réutilisation
          sans autorisation est interdite.
        </p>
      </Section>

      <Section title="Données personnelles & cookies">
        <p>
          Ce site est un portfolio personnel qui ne collecte aucune donnée personnelle. Il n&apos;utilise
          ni cookie, ni outil de mesure d&apos;audience, ni traceur.
        </p>
        <p>
          Le formulaire de contact ouvre simplement votre messagerie pré-remplie : aucune donnée n&apos;est
          enregistrée ni transmise à un serveur tiers.
        </p>
      </Section>
    </div>
  )
}
