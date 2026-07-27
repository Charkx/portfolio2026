# Backlog

Suivi du chantier ouvert après les retours « très sympa, mais l'UI/UX peut être
améliorée pour quelqu'un qui ne connaît rien au site, et il reste des bugs ».

Les identifiants (A4, B5…) viennent de l'audit initial et sont conservés pour ne pas
perdre le fil entre les échanges.

---

## ⏳ En attente d'une décision

| Sujet | Question |
|---|---|
| Responsivité en hauteur (mobile) | Hero et Projects utilisent `min-h-screen` (= `100vh`) alors qu'About et Skills utilisent `min-h-[100svh]`. Sur mobile, `100vh` correspond à l'écran **barre d'URL masquée** : ces sections dépassent de 60 à 100 px tant qu'elle est visible. À confirmer : est-ce bien sur l'accueil et Projets ? Contenu coupé en bas, ou saut au scroll ? |
| Fond du contact **mobile** | [ContactSection.tsx:135](app/sections/ContactSection.tsx#L135) garde un `bg-[#05070a]` opaque, choix d'origine assumé (« au contact, seule la carte subsiste »). La variante mouvement réduit vient d'être alignée sur la DA — faut-il aligner le mobile aussi ? |
| Libellé d'annulation | Modale de déconnexion : « Rester connecté » (dans la fiction) ou « Annuler » (plus immédiat) ? |
| `t.contact.hint` | Les autres sections décrivent **et** disent quoi faire (« clique un module pour le décoder »). Contact se contente de décrire. À aligner ? |

---

## 🐛 Bugs

- **Infobulles du HUD au survol uniquement.** `HudTooltip` ([ARInterface.tsx:17](app/components/ui/ARInterface.tsx#L17)) n'existe pas au doigt. Contrairement au panneau SIG (corrigé), ces infobulles sont *supplémentaires* : l'`aria-label` porte déjà le sens, et l'icône reste identifiable. Priorité basse, mais c'est le même angle mort.

---

## ⚡ Performance & mobile

- **DPR en mode éco.** Reste plafonné à `1` ([AugmentedHumanLayer.tsx](app/components/3d/AugmentedHumanLayer.tsx)) : sur un écran à densité 3, l'hologramme est crénelé. Passer à 1,5 multiplie par 2,25 le nombre de pixels — à tester sur appareil réel maintenant qu'on sait que le bloom passe.
- **Préchargement des icônes : écarté volontairement.** La barre de progression de l'écran de démarrage fait une moyenne **par fichier**, pas par octet ([preloadAssets.ts](app/lib/preloadAssets.ts)). Y ajouter 16 fichiers de quelques Ko la ferait bondir à ~90 % puis ramper sur les deux `.glb` : gain nul, honnêteté de la barre perdue.

---

## 🎨 UX

- **A8 — Découvrabilité.** Ni la barre de navigation ni la sortie de voyage (pousser franchement pendant les 5 s rend la main) ne sont devinables. Une première tentative de bandeau a été abandonnée : il se superposait au « ACCESS GRANTED » et à la ligne de fin de session. Si l'idée revient, le bon emplacement est un slot **déjà existant** — le libellé de chapitre centré en haut du HUD, qui afficherait « LIAISON EN COURS » pendant un voyage.
- **CV en iframe.** Échap ne fonctionne que parce qu'on reprend le focus dès que l'iframe s'en empare. La garantie stricte demanderait d'arrêter de confier le rendu au lecteur PDF du navigateur : CV en images (à regénérer à chaque mise à jour) ou pdf.js (dépendance lourde). Calendly restera l'exception dans tous les cas — on ne peut pas lui voler le focus sans escamoter la saisie.

---

## ✅ Décisions actées (ne pas y revenir sans raison)

- **Snap de section : 5 s, verrouillé, avec porte de sortie.** Sans `lock`, Lenis rappelle `scrollTo()` à chaque cran de molette et écrase l'animation : le geste qui déclenche le voyage le tue, et la durée n'a plus aucun effet visible. La sortie se mesure en **quantité** de scroll (240 px après 500 ms), pas en délai entre deux crans — une molette classique espace ses crans de plusieurs centaines de ms et couperait le voyage en permanence.
- **Saut de nav du HUD : 2,8 s.** Apparié à `NAV_CAM_DUR = 2.6` dans [AugmentedHumanScene.tsx:40](app/components/3d/AugmentedHumanScene.tsx#L40) — **les deux doivent bouger ensemble**.
- **Mouvement réduit = on coupe ce qui DÉPLACE le point de vue, on garde ce qui vit sur place.** Un fondu ou une texture qui ondule ne déclenchent pas de trouble vestibulaire ; un travelling, si.
- **`animate-pulse` du HUD conservés** en mouvement réduit : une respiration lente en opacité reste acceptable et signale les éléments vivants de l'interface.
- **Pas de troisième palier de dégradation FPS.** Tenté, il a cassé le rendu deux fois ; et c'est de l'optimisation pour un cas que personne n'a mesuré. Le test sur téléphone a confirmé que l'éco avec bloom est fluide.
- **Environnement de la carte : une NUIT, pas un studio.** Le corps est en `metalness: 0.9` — un métal ne montre que ce qu'il réfléchit. Un environnement clair le délave et, mélangé au `pointLight` magenta, le fait virer au violet. D'où la règle : presque tout sombre, **un seul** éclat vif, et un remplissage frontal sous `0.4` (au-delà, le blanc réfléchi couvre le bleu). Symptôme à reconnaître : la carte est violette de face et redevient bleue quand on la pivote — c'est toujours la nappe frontale.
- **Aucun asset servi par un tiers.** Ni CDN d'icônes, ni HDR distant. Un portfolio que consulte un recruteur ne doit pas dépendre de la disponibilité de `jsdelivr` ou de `raw.githack.com`.
- **Cibles du HUD : l'icône garde sa taille, la zone cliquable grandit autour.** 44 px de haut (la barre en fait 64, c'est gratuit) + marge latérale, et les `gap` réduits d'autant pour compenser. Le dessin ne bouge pas, la cible triple.
- **Le mini-jeu ne suit PAS le mouvement réduit, et c'est délibéré.** Inventaire fait : la caméra y est fixe, donc la doctrine (« couper ce qui déplace le point de vue ») ne retirerait presque rien. Le seul écart est la rotation sans fin des éclats — mais **ce sont les cibles du jeu** : les figer changerait la difficulté, pas l'apparence. Et on ne tombe pas sur `/transmission` par accident, il faut avoir capté cinq signaux cachés : c'est un opt-in. La **qualité éco**, elle, s'y applique bien (DPR), parce que c'est un réglage explicite et non un parti pris de mise en scène.
- **Le lint est à zéro : toute suppression doit être JUSTIFIÉE sur place.** Chaque `eslint-disable` du projet porte sa raison après `--`. Une suppression sans raison est un bug qu'on a décidé de ne pas voir. Trois familles seulement sont désactivées, et toujours au plus près : `immutability` (muter des objets three.js dans `useFrame` **est** l'idiome R3F — passer par un état React à 60 images/s est exactement ce qu'il faut éviter), `purity` (`Math.random()` figé au montage dans un `useMemo` : le hasard est le rendu voulu, et ces canvas sont client-only donc sans divergence d'hydratation), `set-state-in-effect` (détection d'environnement au montage : `matchMedia`, `localStorage`, taille d'écran — rien de tout ça n'existe au rendu serveur).
- **Porte de sortie du snap : c'est le SENS du geste qui compte, pas sa quantité.** Pousser dans le sens du voyage n'est pas une demande de sortie — on emmène déjà l'utilisateur là où il va. Le laisser couper l'animation faisait sauter le dézoom/zoom de l'hologramme, qui est le cœur du site. Seul un geste à contre-sens rend la main. *Ne pas « corriger » ça en durcissant le seuil : un spam nerveux finit par franchir n'importe quelle valeur.* Pour aller vite, le moyen prévu est la barre de navigation (2,8 s).
- **Après une sortie forcée, le site ne reprend pas la main tant que l'utilisateur pousse** (`adrift`), et le réarmement se compte sur les **gestes** — pas sur l'événement `scroll`, que le lissage de Lenis continue d'émettre longtemps après. Au réarmement on rejoint l'ancre **la plus proche elle-même**, jamais une voisine : la logique de voisinage n'a pas de sens appliquée à une section où l'on n'est jamais arrivé (c'était la cause du va-et-vient sur place).
- **Retours de dégâts : décroissance géométrique, pas linéaire.** L'œil juge la luminosité en relatif (Weber-Fechner). Retirer 0,10 à 0,75 est imperceptible, le même 0,10 à 0,20 est violent — un pas linéaire ment donc à l'œil. Chaque brèche retire le même **pourcentage**. Et un **sursaut non lissé** à l'impact, parce qu'on perçoit un changement, pas un niveau.
- **`useReducedMotion` reste en useState + useEffect.** La réécriture en `useSyncExternalStore` (plus propre, valeur juste dès le premier rendu) a coïncidé avec une régression sur la récolte des lucioles en mouvement réduit. **Mécanisme jamais démontré.** Seule piste : ce hook est appelé *dans* le canvas, donc dans le réconciliateur R3F et non celui du DOM. Si la réécriture est retentée, vérifier la récolte des lucioles **à l'œil** avant de conclure.
- **Volume masqué sur mobile, assumé.** Cinq cibles à 24 px font 120 px : impossible dans une barre de 360 px qui porte déjà six commandes. Un téléphone a des boutons de volume matériels — la commande y est redondante. La coupure du son reste, elle, à portée. *Écart connu et accepté : sur desktop les barres font 12 × 24 px, pas 24 × 24. Les 24 px imposeraient un rang de 120 px qui changerait le glyphe « signal » en égaliseur.*

---

## 📦 Livré

| Commit | Contenu |
|---|---|
| `37be8df` | Tunnel d'entrée : identité sur l'écran verrouillé, « Passer l'intro » lisible, séquences ÷2, calibrage clarifié, snap non confiscatoire |
| `65b873e` | Séquence d'intro fantôme (reverrouiller déverrouillait le site tout seul) ; Échap fiable dans les modales, y compris avec iframe |
| `4286eab` | Contrastes (consignes, navigation, mentions légales), déconnexion avec confirmation, CV nommé « CV », section contact remaniée |
| `28c8f96` | Mouvement réduit : caméra en coupe, hologramme vivant, lucioles récoltables (le mini-jeu était inatteignable dans ce mode), fondus découplés de la caméra, section contact réparée. Plus B6 (section active mesurée) et B7 (section qui plante). |
| `f99bd42` | Mouvement réduit, suite : rotations sans fin coupées, texte immédiatement lisible, carte qui ne parle plus toute seule |
| `1827430` | Éco : bloom conservé mais rendu bon marché. Ouverture de ce backlog. |
| `9001ca0` | Plus aucun téléchargement distant : 16 icônes devicon servies en local (76 Ko), HDR de 1,7 Mo remplacé par un environnement procédural |
| `6eda9e4` | B5 — cibles tactiles du HUD portées à 44 px de haut, volume retiré du mobile, navigation du bas visable au doigt |
| `1164108` | Panneau SIG ouvrable au clic (la règle du mini-jeu existait pas au doigt), jauge renommée `SIG: [PLAY]` + manette, qualité éco enfin appliquée au mini-jeu |
| `7e11e90` | Scroll qui ne se bloque plus au spam et qui ne saute plus l'animation ; mini-jeu avec bloom et hôte qui pâlit à chaque brèche ; texte de Skills retiré |
| `cb89b15` | B8 — lint à zéro. Trois vrais défauts corrigés (code-barres retiré au sort à chaque rendu, `k` manquant en dépendance, ref lue pendant le rendu), `useReducedMotion` réécrit en `useSyncExternalStore`, le reste supprimé avec sa raison. |
