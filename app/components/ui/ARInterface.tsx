import React, { useEffect, useRef, useState } from 'react';
import { PROFILE } from '../../utils/constants';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useModalStore } from '../../store/modalStore';
import { PdfViewer, CalendlyViewer } from './ModalViewers';
import { useAudioStore } from '../../store/audioStore';
import { audioEngine } from '../../lib/audioEngine';
import { scrollToId } from '../SmoothScroll';
import { SignalMeter, SignalToast } from './SignalMeter';
import { Power, PowerOff, FileDown, Volume2, VolumeX, CalendarClock } from 'lucide-react';
import { useLangStore } from '../../store/langStore';
import { GlitchText } from './SectionTitle';
import { useT } from '../../i18n';

// Infobulle custom : instantanée et stylée (contrairement au `title` natif).
// `pointer-events-auto` sur le wrapper pour que le :hover se déclenche même
// dans le HUD qui est en pointer-events-none.
function HudTooltip({
  label,
  side = "bottom",
  children,
}: {
  label: string
  side?: "top" | "bottom"
  children: React.ReactNode
}) {
  const pos = side === "top" ? "bottom-full mb-2" : "top-full mt-2"
  return (
    <span className="group relative inline-flex items-center pointer-events-auto">
      {children}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute ${pos} left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-cyan-400/40 bg-black/90 px-2 py-1 text-[10px] font-mono text-cyan-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-50`}
      >
        {label}
      </span>
    </span>
  )
}

// Confirmation de déconnexion. L'action destructrice est en rouge et à droite,
// l'échappatoire à gauche — et la croix de la modale, premier élément focalisable,
// équivaut à « annuler » : aucun chemin rapide ne mène à la fermeture du site.
function DisconnectPrompt({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const t = useT();
  return (
    <div className="font-mono">
      <p className="text-cyan-100/90 text-sm leading-relaxed">{t.hud.disconnectBody}</p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded border border-cyan-400/40 text-cyan-200 text-sm tracking-wider
                     cursor-pointer transition-colors hover:bg-cyan-400/10
                     focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {t.hud.disconnectCancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2.5 rounded border border-red-400/60 bg-red-500/10 text-red-300 text-sm tracking-wider
                     cursor-pointer transition-colors hover:bg-red-500/20 hover:text-red-200
                     focus-visible:outline-2 focus-visible:outline-red-400"
        >
          {t.hud.disconnectConfirm}
        </button>
      </div>
    </div>
  );
}

// Zone cliquable des commandes du HUD. Les icônes font 14 à 18 px : c'est la taille
// du DESSIN, pas celle de la cible. WCAG 2.5.8 (AA) demande 24 px minimum, les
// recommandations tactiles d'Apple et Google montent à 44/48. On garde donc le dessin
// tel quel et on élargit la zone autour : 44 px de haut (la barre en fait 64, c'est
// gratuit) et 8 px de marge de chaque côté. Rien ne change à l'œil, tout change au doigt.
const HIT = "inline-flex items-center justify-center min-h-11 px-2";

// Teinte de la jauge de progression : rampe de batterie, rouge → orange → jaune → vert.
// La « charge » monte ici de 1 à 100 % au fil du scroll, donc le rouge marque le DÉBUT
// du parcours et non un danger — la métaphore tient parce qu'on comprend qu'on remplit.
// Teinte HSL calculée plutôt que 4 paliers en dur : la transition reste continue.
const batteryHue = (pct: number) => `hsl(${Math.round(pct * 1.35)} 85% 55%)`;

// commande textuelle : crochets (le signe « actionnable » du site) + fond au survol
const TEXT_BTN = "group/btn rounded transition-colors hover:bg-cyan-400/10";
const BRACKET = "opacity-60 transition-opacity group-hover/btn:opacity-100";

/** Libellé entre crochets — sans espaces sous 640 px, où chaque pixel compte. */
function Bracketed({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className={BRACKET}>[</span>
      <span className="mx-0 sm:mx-1">{children}</span>
      <span aria-hidden="true" className={BRACKET}>]</span>
    </>
  );
}

export default function ARInterface() {
  const [time, setTime] = useState(new Date());
  const introPhase = usePortfolioStore((s) => s.introPhase);
  const currentSection = usePortfolioStore((s) => s.currentSection);
  // arrondi DANS le sélecteur : le HUD n'affiche qu'un entier, il n'a donc besoin de
  // se re-rendre que lorsque cet entier change — pas à chaque image de scroll.
  const batteryLevel = usePortfolioStore((s) => Math.max(1, Math.round((s.scrollProgress ?? 0) * 100)));
  const setIntroPhase = usePortfolioStore((s) => s.setIntroPhase);
  const openModal = useModalStore((s) => s.open);
  const closeModal = useModalStore((s) => s.close);
  const soundEnabled = useAudioStore((s) => s.enabled);
  const toggleSound = useAudioStore((s) => s.toggle);
  const volume = useAudioStore((s) => s.volume);
  const setVolume = useAudioStore((s) => s.setVolume);
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const t = useT();

  // Ouvre le CV dans la modale (sans quitter la page) — le href reste le repli sans JS.
  const openCv = (e: React.MouseEvent) => {
    e.preventDefault();
    openModal({
      title: t.hud.cvModalTitle,
      size: "xl",
      content: <PdfViewer src={PROFILE.cv} downloadName="CV_Charly_Menthiller.pdf" />,
    });
  };
  const openRdv = () => {
    openModal({ title: t.contact.calendlyModal, size: "lg", content: <CalendlyViewer src={PROFILE.calendly} /> });
  };
  // Reverrouiller DÉMONTE tout le site et renvoie à la séquence d'entrée : on demande
  // confirmation dans une modale plutôt que de laisser un clic isolé tout fermer.
  const confirmDisconnect = () => {
    openModal({
      title: t.hud.disconnectTitle,
      size: "md",
      content: (
        <DisconnectPrompt
          onConfirm={() => { closeModal(); setIntroPhase("LOCKED"); }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const booted = introPhase === "BOOTING" || introPhase === "UNLOCKED";

  const NAV: { prefix: string; label: string; section: string }[] = [
  // Préfixes courts : ils sont DÉCORATIFS, et leur longueur poussait la barre jusqu'au
  // texte centré du pied de page. Chacun nomme le module que sa section pilote.
  { prefix: "CORTEX", label: t.hud.nav.about,    section: "about" },
  { prefix: "ADN",    label: t.hud.nav.skills,   section: "skills" },
  { prefix: "MEM",    label: t.hud.nav.projects, section: "projects" },
  { prefix: "UPLINK", label: t.hud.nav.contact,  section: "contact" },
];

  // Chapitres narratifs : le voyage se lit dans le HUD (change avec la section active)
  const CHAPTERS = t.hud.chapters;

  // Son du déverrouillage (system power-on) / re-verrouillage (power-down) — no-op si son coupé
  const prevPhase = useRef(introPhase);
  useEffect(() => {
    if (introPhase === prevPhase.current) return;
    if (introPhase === "UNLOCKED") audioEngine.play("boot");
    else if (introPhase === "LOCKED") audioEngine.play("powerdown");
    prevPhase.current = introPhase;
  }, [introPhase]);

  // Scène sonore : musique d'entrée tant que verrouillé, nappe d'ambiance ensuite
  useEffect(() => {
    audioEngine.setScene(introPhase === "LOCKED" ? "entry" : "site");
  }, [introPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Cluster haut-droit TOUJOURS visible : MEMORY_DUMP (CV) + Power */}
      {/* `right-4` (et non 6) : les commandes gagnent 8 px de marge interne à droite,
          donc l'icône reste visuellement à la même distance du bord qu'avant.
          `gap-1` : c'est désormais la marge interne des boutons qui les espace. */}
      <div className="pointer-events-auto absolute top-0 right-4 h-16 z-20 flex items-center gap-1 sm:gap-2">
        {/* mobile : la barre d'état étant masquée, la jauge SIG (easter egg) vit ici */}
        {booted && (
          <div className="sm:hidden flex items-center min-h-11 font-mono text-xs text-cyan-400">
            <SignalMeter booted={booted} />
          </div>
        )}
        <HudTooltip label={t.hud.tipCv}>
          <a
            href={PROFILE.cv}
            onClick={openCv}
            onMouseEnter={() => audioEngine.play('hover')}
            aria-label={t.hud.tipCv}
            className={`${HIT} gap-1.5 font-mono text-xs text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer`}
          >
            {/* « CV » en clair : c'est LE lien qu'un recruteur cherche, et il était
                étiqueté MEMORY_DUMP… puis masqué sous 640 px (donc icône muette sur
                mobile). Le nom de code survit dans l'infobulle, où il ne coûte rien. */}
            <FileDown size={14}/>
            <span>CV</span>
          </a>
        </HudTooltip>
        <HudTooltip label={t.hud.tipRdv}>
          <button
            type="button"
            aria-label={t.hud.tipRdv}
            onClick={openRdv}
            onMouseEnter={() => audioEngine.play('hover')}
            className={`${HIT} text-cyan-300 hover:text-cyan-100 transition-colors cursor-pointer`}
          >
            <CalendarClock size={15} />
          </button>
        </HudTooltip>
        <div className="flex items-center">
          <HudTooltip label={soundEnabled ? t.hud.tipSoundOff : t.hud.tipSoundOn}>
            <button
              aria-label={soundEnabled ? t.hud.tipSoundOff : t.hud.tipSoundOn}
              aria-pressed={soundEnabled}
              className={`${HIT} transition-colors cursor-pointer ${soundEnabled ? "text-cyan-300 hover:text-cyan-100" : "text-cyan-400/50 hover:text-cyan-200"}`}
              onClick={toggleSound}
              onMouseEnter={() => audioEngine.play('hover')}
            >
              {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
            </button>
          </HudTooltip>
          {/* Volume en barres de signal (langage HUD) : cliquer une barre = niveau n/5,
              cliquer alors que le son est coupé = le réactiver à ce niveau.
              MASQUÉ SUR MOBILE, et c'est un choix, pas un oubli : cinq cibles distinctes
              ne peuvent pas faire 24 px chacune dans cette barre (120 px à elles seules,
              sur un écran de 360 qui porte déjà six commandes). Un téléphone a des
              boutons de volume matériels ; la coupure du son, elle, reste accessible
              juste à côté. On retire donc la commande redondante plutôt que de laisser
              cinq cibles intouchables. */}
          <div role="group" aria-label={t.hud.volume} className="hidden sm:flex items-center h-6 ml-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const lit = soundEnabled && volume >= n / 5 - 0.001;
              return (
                <button
                  key={n}
                  aria-label={t.misc.volumeOf(n)}
                  aria-pressed={lit}
                  onClick={() => setVolume(n / 5)}
                  onMouseEnter={() => audioEngine.play('hover')}
                  // la CIBLE fait 12 × 24 px, la BARRE dessinée en fait toujours 4 :
                  // le glyphe est intact, la zone cliquable est triplée.
                  className="group/vol flex h-6 w-3 items-end justify-center cursor-pointer"
                >
                  <span
                    aria-hidden="true"
                    className={`w-[4px] rounded-[1px] transition-colors
                                ${lit ? "bg-cyan-300 group-hover/vol:bg-cyan-100" : "bg-cyan-400/25 group-hover/vol:bg-cyan-400/60"}`}
                    style={{ height: `${5 + n * 2.2}px` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
        {/* langue : bascule FR/EN à chaud (choix persisté) */}
        {/* px-1.5 au lieu de px-2 : deux libellés côte à côte, on économise la largeur
            là où on peut — la cible reste à 44 px de haut, très au-delà des 24 exigés. */}
        <div className="flex items-center font-mono text-xs" role="group" aria-label={t.hud.language}>
          <button
            aria-pressed={lang === 'fr'}
            onClick={() => { setLang('fr'); audioEngine.play('nav'); }}
            onMouseEnter={() => audioEngine.play('hover')}
            className={`inline-flex items-center justify-center min-h-11 px-1.5 cursor-pointer transition-colors ${lang === 'fr' ? 'text-cyan-300' : 'text-gray-600 hover:text-cyan-400/80'}`}
          >
            FR
          </button>
          <span className="text-cyan-400/30" aria-hidden="true">·</span>
          <button
            aria-pressed={lang === 'en'}
            onClick={() => { setLang('en'); audioEngine.play('nav'); }}
            onMouseEnter={() => audioEngine.play('hover')}
            className={`inline-flex items-center justify-center min-h-11 px-1.5 cursor-pointer transition-colors ${lang === 'en' ? 'text-cyan-300' : 'text-gray-600 hover:text-cyan-400/80'}`}
          >
            EN
          </button>
        </div>
        {/* Le survol vire au ROUGE quand le clic est destructeur (session ouverte) :
            l'icône annonce sa nature avant qu'on la touche, et la modale confirme.
            Déverrouiller ne détruit rien → reste en cyan, sans confirmation. */}
        <HudTooltip label={introPhase === "LOCKED" ? t.hud.tipUnlock : t.hud.tipLock}>
          <button
            aria-label={introPhase === "LOCKED" ? t.hud.tipUnlock : t.hud.tipLock}
            className={`${HIT} transition-colors cursor-pointer ${
              introPhase === "LOCKED" ? "text-cyan-400 hover:text-cyan-200" : "text-cyan-400 hover:text-red-400"
            }`}
            onClick={() => {
              if (introPhase === "LOCKED") { setIntroPhase("UNLOCKED"); return }
              confirmDisconnect()
            }}
            onMouseEnter={() => audioEngine.play('hover')}
          >
            {introPhase === "LOCKED" ? <Power size={18}/> : <PowerOff size={18}/>}
          </button>
        </HudTooltip>
      </div>
    
      {/* Top HUD */}

   {introPhase !== "LOCKED" && (
      <div className="hud-boot relative w-full h-full">
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent">
        {/* pr large (desktop) : réserve la place du cluster droit (CV + volume + langue + power).
            MOBILE : le cluster droit occupe seul la barre → tout le reste est masqué (sm:). */}
        <div className="flex justify-between items-center h-full pl-6 pr-6 sm:pr-[22rem] text-cyan-400 font-mono text-sm">

            <div className="hidden sm:flex items-center space-x-6">
              {/* L'IDENTITÉ EST LE RETOUR À L'ACCUEIL — la convention du logo cliquable.
                  Aucun élément ajouté, aucun pixel pris : le HUD garde son calibrage.
                  `pointer-events-auto` car le conteneur du HUD est en events-none. */}
              <div className="flex items-center gap-1.5">
                {/* « ID: » reste un relevé, comme PROFILE: ou BAT: — seul le nom se clique */}
                <span aria-hidden="true">ID:</span>
                <HudTooltip label={`${t.hud.navGoTo} ${t.hud.nav.hero}`}>
                  <button
                    type="button"
                    aria-label={`${t.hud.navGoTo} ${t.hud.nav.hero}`}
                    onClick={() => { audioEngine.play('nav'); scrollToId('hero'); }}
                    onMouseEnter={() => audioEngine.play('hover')}
                    className={`pointer-events-auto inline-flex items-center min-h-11 px-1.5 cursor-pointer ${TEXT_BTN}`}
                  >
                    <span
                      className={booted ? "hud-reveal text-green-400" : "opacity-0"}
                      style={{ '--i': 0 } as React.CSSProperties}
                    >
                      <Bracketed>
                        <span className="animate-pulse" aria-hidden="true">●</span> {PROFILE.name.toUpperCase()}
                      </Bracketed>
                    </span>
                  </button>
                </HudTooltip>
              </div>
              <div aria-hidden="true" className="text-cyan-300/80 hidden sm:block ">
                 PROFILE: <span className={booted ? "hud-reveal text-cyan-300/80" : "opacity-0"} style={{ '--i': 1 } as React.CSSProperties}>{PROFILE.title}</span>
              </div>
            </div>

          {/* Chapitre courant — centré, re-révélé à chaque changement de section */}
          <div aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-0 h-16 hidden md:flex items-center">
            <span key={currentSection} className="hud-reveal font-mono text-xs tracking-[0.35em] text-cyan-300/90">
              <GlitchText text={CHAPTERS[currentSection] ?? CHAPTERS.hero} duration={700} />
            </span>
          </div>

          <div className="flex hidden sm:flex items-center space-x-6">
            <div aria-hidden="true">
              BAT: <span
                     className={booted ? "hud-reveal transition-colors" : "opacity-0"}
                     style={{ '--i': 2, color: booted ? batteryHue(batteryLevel) : undefined } as React.CSSProperties}
                   >{batteryLevel}%</span>
            </div>
            <SignalMeter booted={booted} />
            <div aria-hidden="true">
              {time.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-center sm:justify-between items-center h-full px-3 sm:px-6 text-cyan-400 font-mono text-xs sm:text-sm">
          <div className="flex items-center space-x-6">
            {/* gap-1 sur mobile : les quatre libellés (27 caractères en tout) plus leur
                marge interne doivent tenir dans 360 px. C'est la marge des boutons qui
                les espace maintenant, pas le gap. */}
            <div className="flex items-center gap-1 sm:gap-4">
              {NAV.map((item, idx) => (        // ← idx = la position
                <div key={item.section} className="flex items-center">
                  <div aria-hidden="true" className="hidden min-[1700px]:flex text-cyan-400/40">{item.prefix}:</div>
                  <HudTooltip label={`${t.hud.navGoTo} ${item.label}`} side="top">
                    <button
                      aria-label={`${t.hud.navGoTo} ${item.label}`}
                      onClick={() => { audioEngine.play('nav'); scrollToId(item.section); }}
                      onMouseEnter={() => audioEngine.play('hover')}
                      // /40 = 2,5:1 sur fond noir : c'est la navigation PRINCIPALE du
                      // site, elle ne peut pas être à la limite du lisible. La section
                      // active reste distinguée par la couleur (vert), plus par le seul
                      // écart de luminosité.
                      // 44 px de haut : c'est la navigation principale, et sur mobile
                      // c'est la SEULE chose qui reste dans la barre du bas. Un libellé
                      // de 20 px de haut se rate au doigt.
                      className={`inline-flex items-center min-h-11 px-1 sm:px-1.5 pointer-events-auto cursor-pointer hover:text-cyan-200 ${TEXT_BTN} ${
                        booted
                        ? `hud-reveal ${currentSection === item.section ? "text-green-400" : "text-cyan-400/70"}`
                        : "opacity-0"
                      }`}
                      style={{ '--i': idx + 4 } as React.CSSProperties}
                    >
                      <Bracketed>{item.label}</Bracketed>
                    </button>
                  </HudTooltip>
                </div>
              ))}
            </div>
          </div>

          <div aria-hidden="true" className="flex hidden sm:flex items-center space-x-6">
            <div>
              MODE: <span className={booted ? "hud-reveal text-cyan-400" : "opacity-0"} style={{ '--i': 8 } as React.CSSProperties}>{t.hud.mode}</span>
            </div>
              <div className="text-cyan-300">
                DISPO: <span className={booted ? "hud-reveal text-green-400" : "opacity-0"} style={{ '--i': 9 } as React.CSSProperties}>09/2026</span>
              </div>
          </div>
        </div>
      </div>

      {/* PASTILLE MOBILE — progression du récit + retour à l'accueil.
          La jauge BAT du HUD est en `hidden sm:flex` : sous 640 px, le visiteur n'avait
          aucun repère de son avancement, et aucun moyen de remonter (le bloc ID, qui
          porte ce rôle sur desktop, y est masqué lui aussi).
          Placée en flottant plutôt que dans une barre : les deux sont saturées sur
          mobile (le cluster du haut occupe ~330 px sur 360, la nav du bas ~337).
          N'apparaît qu'une fois le voyage entamé — proposer « remonter » quand on est
          déjà en haut n'apprend rien et encombre. */}
      {booted && batteryLevel > 3 && (
        <button
          type="button"
          onClick={() => { audioEngine.play('nav'); scrollToId('hero'); }}
          aria-label={`${t.hud.navGoTo} ${t.hud.nav.hero} — ${batteryLevel}%`}
          className="sm:hidden pointer-events-auto absolute bottom-20 right-4 z-20
                     grid place-items-center w-12 h-12 rounded-full cursor-pointer
                     transition-transform active:scale-95
                     focus-visible:outline-2 focus-visible:outline-cyan-400"
          // l'anneau EST la jauge : un dégradé conique, sans SVG ni dépendance
          style={{ background: `conic-gradient(${batteryHue(batteryLevel)} ${batteryLevel * 3.6}deg, rgba(255,255,255,0.14) 0deg)` }}
        >
          <span
            aria-hidden="true"
            className="grid place-items-center w-[42px] h-[42px] rounded-full
                       bg-black/85 backdrop-blur-sm font-mono text-[10px] leading-none transition-colors"
            style={{ color: batteryHue(batteryLevel) }}
          >
            {batteryLevel}%
          </span>
        </button>
      )}

      {/* Corner Elements (décoratif) */}
      <div aria-hidden="true">
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400" />
      </div>
      </div>
    )}
    <SignalToast />
    </div>
  );
};
