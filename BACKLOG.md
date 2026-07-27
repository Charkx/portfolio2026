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

- **B5 — Cibles tactiles du HUD.** Les barres de volume font 4 px de large ([ARInterface.tsx:132-148](app/components/ui/ARInterface.tsx#L132-L148)), très en dessous des 24 px recommandés (WCAG 2.2). Le cluster mobile empile SIG, CV, son, 5 barres, FR/EN et alimentation sur une seule rangée. *Touche tous les visiteurs mobiles — le public qui arrive depuis LinkedIn.*
- **B8 — 22 warnings ESLint dans `/transmission`.** Mutation de valeurs passées à des hooks, ref lue pendant le rendu, une dépendance `useCallback` manquante. Le fichier le plus exposé à des bugs de rendu du projet.

---

## ⚡ Performance & mobile

- **Téléchargements distants au moment de l'affichage.** Deux causes identifiées pour les lenteurs constatées sur téléphone :
  - `<Environment preset="night" />` ([BiometricCard.tsx:243](app/components/3d/BiometricCard.tsx#L243)) télécharge un HDR de plusieurs Mo sur un CDN externe, à chaque affichage de la carte. Piste : environnement procédural via `<Lightformer>`, sans téléchargement. ⚠️ Le corps de la carte est en `metalness: 0.9` — un métal sans reflet rend quasi noir, à vérifier à l'œil.
  - 17 SVG devicon chargés un par un depuis `cdn.jsdelivr.net` ([Logo3D.tsx:88-91](app/components/3d/Logo3D.tsx#L88-L91)). Piste : les héberger dans `public/` (1 à 3 Ko pièce) — ça servirait aussi les listes HTML de Skills, qui tapent le même CDN, et supprimerait une dépendance à un tiers.
  - À noter : l'écran de chargement précharge déjà les `.glb` avec une progression réelle. Ces deux-là ont simplement été oubliés du lot.
- **DPR en mode éco.** Reste plafonné à `1` ([AugmentedHumanLayer.tsx](app/components/3d/AugmentedHumanLayer.tsx)) : sur un écran à densité 3, l'hologramme est crénelé. Passer à 1,5 multiplie par 2,25 le nombre de pixels — à tester sur appareil réel maintenant qu'on sait que le bloom passe.

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

---

## 📦 Livré

| Commit | Contenu |
|---|---|
| `37be8df` | Tunnel d'entrée : identité sur l'écran verrouillé, « Passer l'intro » lisible, séquences ÷2, calibrage clarifié, snap non confiscatoire |
| `65b873e` | Séquence d'intro fantôme (reverrouiller déverrouillait le site tout seul) ; Échap fiable dans les modales, y compris avec iframe |
| `4286eab` | Contrastes (consignes, navigation, mentions légales), déconnexion avec confirmation, CV nommé « CV », section contact remaniée |
| `28c8f96` | Mouvement réduit : caméra en coupe, hologramme vivant, lucioles récoltables (le mini-jeu était inatteignable dans ce mode), fondus découplés de la caméra, section contact réparée. Plus B6 (section active mesurée) et B7 (section qui plante). |
| `f99bd42` | Mouvement réduit, suite : rotations sans fin coupées, texte immédiatement lisible, carte qui ne parle plus toute seule |
