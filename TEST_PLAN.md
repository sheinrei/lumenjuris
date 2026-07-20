# Plan de test — LumenJuris

> Audit de couverture de test fonctionnelle et technique.
> Architecture : **front** (React/TS, 5173) → **proxy** (Express, 3000) → **backNode** (Express/Prisma/MySQL, 3020) + **back** (FastAPI Python, moteur IA/PDF).
>
> Légende priorités :
> - 🔴 **Critique** — bloque l'usage (auth, paiement, perte de données, sécurité).
> - 🟠 **Important** — fonctionnalité principale dégradée.
> - 🟡 **Mineur** — UX, affichage, cas rares.
>
> Chaque cas comporte un **chemin heureux** et au moins un **cas limite** (validation, erreur serveur, accès refusé, données vides).

---

## Table des matières

1. [Authentification](#1--authentification)
2. [Navigation & layout](#2--navigation--layout)
3. [Dashboard utilisateur](#3--dashboard-utilisateur)
4. [Analyse de contrat IA](#4--analyse-de-contrat-ia)
5. [Chat juridique](#5--chat-juridique)
6. [Contrathèque](#6--contrathèque)
7. [Bibliothèque de clauses](#7--bibliothèque-de-clauses)
8. [Génération de contrats](#8--génération-de-contrats)
9. [E-Signature](#9--e-signature)
10. [Négociation](#10--négociation)
11. [Veille juridique](#11--veille-juridique)
12. [Profil & Entreprise](#12--profil--entreprise)
13. [Facturation & Abonnements](#13--facturation--abonnements)
14. [Crédits](#14--crédits-!Suspendu!)
15. [Monitoring admin — Vue d'ensemble](#15--monitoring-admin--vue-densemble)
16. [Monitoring admin — LLM Usage](#16--monitoring-admin--llm-usage)
17. [Monitoring admin — Feedbacks](#17--monitoring-admin--feedbacks)
18. [Monitoring admin — Utilisateurs](#18--monitoring-admin--utilisateurs)
19. [Monitoring admin — Revenus](#19--monitoring-admin--revenus)
20. [Monitoring admin — Activité](#20--monitoring-admin--activité)
21. [Sécurité transversale](#21--sécurité-transversale)
22. [Modules additionnels découverts](#22--modules-additionnels-découverts)
23. [Routes sans interface frontend](#routes-sans-interface-frontend)

---

## 1 — Authentification

Pages : 
`page/Inscription.tsx`,
`components/auth/LoginForm.tsx`,
`components/auth/SignupForm.tsx`,
`page/VerifyAccount.tsx`,
`page/ResetPassword.tsx`,
`components/ui/TwoFactorCodeModal.tsx`
Endpoints : 
`POST /api/signup`,
`POST /api/user/auth/login`,
`POST /api/user/auth/logout`,
`POST /api/user/two-factor/verify`,
`POST /api/auth/forgotpassword`,
`POST /api/user/resetpassword`,
`GET /api/google`,
`GET /api/insee/:siren`.

- [ ] 🔴 **Inscription — création de compte** — Formulaire `SignupForm`, soumission vers `POST /api/signup`.
  - Chemin heureux : nom + email + mot de passe valides + CGU cochées → compte créé, email de vérification envoyé, message de succès affiché.
  - Cas limite : champ manquant (nom/email/mdp) → `submitError` ; CGU non cochée → `submitCguError` ; email déjà existant → message serveur ; mot de passe faible (regex `azertyuioP1.` attendue) → refus backend 400.





- [ ] 🟠 **Inscription — enrichissement SIREN (INSEE)** — Lookup best-effort `GET /api/insee/:siren` avant `signup`.
  - Chemin heureux : SIREN valide → `enterpriseData` récupéré et joint au payload d'inscription.
  - Cas limite : SIREN invalide/introuvable → inscription continue **sans** données entreprise (best-effort, aucune erreur bloquante) ; INSEE indisponible (502) → idem.





- [ ] 🔴 **Connexion email/mot de passe** — `LoginForm` → `POST /api/user/auth/login`.
  - Chemin heureux : identifiants valides, compte vérifié, sans 2FA → cookie JWT posé, redirection `/dashboard` (ou `/souscription` si `plan` en `location.state`).
  - Cas limite : mauvais mot de passe → `serverError` + message ; compte non vérifié (`isVerified=false`) → alerte « cliquez sur le lien reçu » ; champs vides → `submitError`.





- [ ] 🔴 **Connexion — 2FA requis** — `twoFactorRequired` → ouverture `TwoFactorCodeModal`, vérification via `POST /api/user/two-factor/verify`.
  - Chemin heureux : code correct → `fetchUser()` + navigation `/dashboard`.
  - Cas limite : code erroné → throw « Code invalide » affiché dans la modale ; annulation de la modale → `POST /api/user/auth/logout` (invalide la session partielle).




- [ ] 🔴 **Connexion Google OAuth** — Bouton Google → redirection `window.location = PROXY_URL/api/google` → `GET /auth/google` (backNode) → callback → cookie JWT.
  - Chemin heureux : compte Google autorisé → cookie posé, redirection `/analyzer`.
  - Cas limite : `state` CSRF invalide au callback → rejet ; refus de consentement Google → retour sans session.




- [ ] 🔴 **Vérification email** — Lien reçu par email `GET /user/verify/:token` (backNode direct, hors proxy).
  - Chemin heureux : token valide → `isVerified=true`, cookie auth posé, plan freemium activé, redirection `/dashboard?verified=true`.
  - Cas limite : token expiré/déjà utilisé → redirection `/verify-account?reason=...` ; token inexistant → `reason=server`.



- [ ] 🟠 **Renvoi de l'email de vérification** — Page `VerifyAccount`, bouton « Envoyer un nouvel e-mail ».
  - Chemin heureux : email saisi → appel réseau, message de confirmation.
  - Cas limite : ⚠️ **BUG** — l'appel `fetchProxy("user/resend-verify")` n'a pas de préfixe `/api` et **aucune route proxy/backNode ne correspond** → l'endpoint est mort (voir section Routes sans interface). Vérifier que l'utilisateur reçoit bien un message, mais qu'aucun email n'est réellement renvoyé.




- [ ] 🔴 **Mot de passe oublié** — Mode `forgotPassword` du `LoginForm` → `POST /api/auth/forgotpassword`.
  - Chemin heureux : email existant → email de réinitialisation envoyé, alerte de succès (best-effort, ne révèle pas l'existence du compte).
  - Cas limite : email vide → `submitForgotError` ; email inexistant → **même** réponse de succès (anti-énumération) ; rate-limit `forgotPasswordLimiter` (3/15 min en prod) → 429.




- [ ] 🔴 **Réinitialisation du mot de passe** — Page `ResetPassword` → `POST /api/user/resetpassword` (`/user/updatepassword` backNode).
  - Chemin heureux : token valide + nouveau mot de passe conforme → mot de passe mis à jour, redirection connexion.
  - Cas limite : token expiré/invalide → erreur ; mot de passe non conforme à la politique → 400 ; confirmation différente du mot de passe → validation front.





- [ ] 🔴 **Déconnexion** — `userStore.logoutUser()` → `POST /api/user/auth/logout`.
  - Chemin heureux : cookie `authLumenJuris` vidé (maxAge 0), store réinitialisé, redirection.
  - Cas limite : appel sans session active → réponse 401/200 idempotente, pas de crash front.




- [ ] 🟡 **Rate limiting connexion/inscription** — `loginLimiter` (7/15 min), `registerLimiter` (3/h) en prod.
  - Chemin heureux : sous le seuil → normal.
  - Cas limite : dépassement → message « Trop de tentatives… » (429). Vérifier que le seuil dev (`NODE_ENV=dev`, 10000) ne masque pas le test.

---






## 2 — Navigation & layout

Composants : 
`components/MainHeader/MainHeader.tsx`,
`HeaderNavigationBar.tsx`,
`DashboardComponents/MainLayout.tsx`,
`components/auth/RequireAuth.tsx`,
`router.tsx`.

- [ ] 🔴 **Garde de route `RequireAuth`** — Wrapper des routes protégées.
  - Chemin heureux : `authStatus=authenticated` → rend la page ; `idle`/`loading` → écran « Chargement… » (anti-flash).
  - Cas limite : `unauthenticated` → `<Navigate to="/inscription">` avec `location.state.from` mémorisé pour retour post-login.

- [ ] 🔴 **Redirection racine `/`** — `HomeRedirect`.
  - Chemin heureux : connecté → `/dashboard` ; non connecté → `/inscription`.
  - Cas limite : `authStatus` encore `idle` au premier rendu → loader plein écran, pas de redirection prématurée.

- [ ] 🟠 **Accès admin-only (`/monitoring`, `/sandbox`)** — Liens conditionnés au rôle `ADMIN`.
  - Chemin heureux : ADMIN → liens visibles dans le header + page `Monitoring` rendue.
  - Cas limite : USER/JURISTE naviguant manuellement vers `/monitoring` → `<Navigate to="/dashboard">` (garde dans `Monitoring.tsx`) ; `/utilisateurs` → `UserManagement` affiche « Accès réservé aux administrateurs ».

- [ ] 🟠 **Menu responsive mobile/desktop** — Breakpoint `768px` (`lg:hidden` / `hidden lg:flex` + `window.innerWidth`).
  - Chemin heureux : desktop → boutons texte+icône ; mobile → icônes seules, dropdown utilisateur en initiales.
  - Cas limite : redimensionnement dynamique de la fenêtre → recalcul du trigger ; menu mobile ouvert puis navigation → fermeture (`onNavClick`).

- [ ] 🟡 **Cloche de notifications** — `deriveOverallBadge`, source `missingEnterpriseData`.
  - Chemin heureux : données entreprise absentes → pastille `urgent` (animation `ping`) + item cliquable vers `/mon-compte`.
  - Cas limite : aucune notification → pastille `none` (masquée) ; entreprise complète → pas de notification.

- [ ] 🟡 **Menu utilisateur (avatar/dropdown)** — Logout, Mon compte, Formules.
  - Chemin heureux : clic sur chaque item → navigation correcte ; `onNavClick` retournant `false` annule la navigation.
  - Cas limite : avatar sans image → initiales de secours ; nom long → troncature.

- [ ] 🟡 **ScrollToTop sur changement de route** — `components/common/ScrollToTop.tsx`.
  - Chemin heureux : navigation → scroll remis en haut.
  - Cas limite : navigation avec ancre → comportement à vérifier.

---

## 3 — Dashboard utilisateur

Page : `page/Dashboard.tsx`.

- [ ] 🟡 **Affichage des 6 cartes outils** — Grille `TOOLS` (Contrathèque, Générateur, Négociation, Signature, Analyse des risques, Bibliothèque).
  - Chemin heureux : chaque carte est un `<Link>` menant à sa route (`/contratheque`, `/generateur`, `/signature`, `/conformite`, `/clauses`).
  - Cas limite : ⚠️ la carte **Négociation** pointe vers `/contratheque` (et non une route négociation dédiée) — vérifier que c'est intentionnel.

- [ ] 🟡 **Personnalisation du prénom** — `userData.profile.prenom`.
  - Chemin heureux : prénom présent → « Bienvenue {prénom} ».
  - Cas limite : prénom absent → « Bienvenue sur LumenJuris » sans nom.

---

## 4 — Analyse de contrat IA

Page : `page/ContractAnalysis.tsx` (route `/analyzer`), composants `ContractAnalysis/*` (UploadZone, TextInputZone, ClausesList, ClauseRiskCard, AIInsightsPanel, MarketComparison, EnhancedClauseDetail).
Endpoints : `POST /api/analyze-contract`, `POST /api/detect-contract`, `POST /api/market-analysis`, `POST /api/recommend-clause`, `POST /api/extract-document-text` (Python), `PUT /api/billing/remove-credits`, `GET /api/billing/subscription`, `GET /api/enterprise`.

- [ ] 🔴 **Upload d'un PDF/document** — `UploadZone` (drag & drop + file picker) → extraction texte `POST /api/extract-document-text` (Python).
  - Chemin heureux : PDF valide → texte extrait, passage à l'analyse.
  - Cas limite : fichier non PDF/DOCX → rejet ; fichier > 20 Mo (limite express `20mb`) → 413 ; PDF scanné sans OCR → texte vide → message ; backend Python indisponible → 502 `python_unreachable`.

- [ ] 🔴 **Saisie de texte libre** — `TextInputZone`.
  - Chemin heureux : collage de texte → détection type de contrat `POST /api/detect-contract` puis analyse.
  - Cas limite : texte vide → bouton désactivé / 400 « champ 'text' requis » ; texte très court non contractuel → détection incertaine.

- [ ] 🔴 **Analyse IA du contrat** — `POST /api/analyze-contract` (avec `context`).
  - Chemin heureux : contenu envoyé → clauses à risque retournées, affichées dans `ClausesList` avec scores.
  - Cas limite : contenu vide → 400 ; erreur IA (500) → message d'échec `Analyse échouée (status)` ; résultat mis en cache (`saveAnalysisToCache`) → réutilisé sans nouvel appel.

- [ ] 🔴 **Consommation de crédits post-analyse** — `PUT /api/billing/remove-credits` (`removeCredit: 100`) après analyse réussie.
  - Chemin heureux : analyse terminée → 100 crédits débités.
  - Cas limite : solde insuffisant → vérifier le comportement (analyse déjà rendue mais débit échoue → `console.error`, pas de rollback UI) ; appel best-effort ne doit pas bloquer l'affichage.

- [ ] 🟠 **Formulaire de contexte d'analyse** — `ContextualAnalysisForm`.
  - Chemin heureux : renseignement du contexte (partie, secteur…) → contexte transmis à l'analyse.
  - Cas limite : contexte vide → analyse sans contexte (dégradée mais fonctionnelle).

- [ ] 🟠 **Clauses à risque — détail enrichi** — `EnhancedClauseDetail`, onglets (overview, cases, chat), `POST /api/recommend-clause`.
  - Chemin heureux : ouverture d'une clause → recommandations IA + reformulations affichées.
  - Cas limite : recommandation IA en échec → onglet en erreur sans casser la vue ; clause sans risque → pas de recommandation.

- [ ] 🟠 **Comparaison au marché** — `MarketComparison` → `POST /api/market-analysis`.
  - Chemin heureux : `contractText` + `contractType` fournis → benchmark affiché.
  - Cas limite : `contractText` ou `contractType` manquant → 400 « champs requis » ; aucune donnée marché → message vide.

- [ ] 🟠 **Historique d'analyses (local)** — `DocumentHistorySidebar`, `utils/contractHistory.ts` + `GET/POST /api/contract-history`.
  - Chemin heureux : analyse sauvegardée → apparaît dans l'historique, rechargeable.
  - Cas limite : quota de stockage local dépassé → gestion d'erreur ; snapshot corrompu → skip sans crash.

- [ ] 🟡 **Ajout à la contrathèque depuis l'analyse** — `AddToContrathequeButton`.
  - Chemin heureux : contrat analysé → ajouté à la contrathèque.
  - Cas limite : ajout d'un doublon → comportement à vérifier.

- [ ] 🟡 **ErrorBoundary de l'analyseur** — `ContractAnalysis/ErrorBoundary.tsx`.
  - Chemin heureux : rendu normal.
  - Cas limite : exception dans un enfant → fallback affiché au lieu d'un écran blanc.

---

## 5 — Chat juridique

Composant : `components/DashboardComponents/ChatJuridique.tsx` (route `/chatjuridique`).
Endpoints : `POST /api/chat` (Python, avec tracking `chat`), `GET/PUT /api/chat-history`.

- [ ] 🔴 **Envoi d'un message au chat** — `POST /api/chat`.
  - Chemin heureux : question saisie → réponse IA affichée, tokens comptabilisés (`logOpenAiTokens`), feature `chat` trackée.
  - Cas limite : message vide → envoi bloqué ; backend Python 502 → message d'erreur ; réponse en streaming interrompue → gestion partielle.

- [ ] 🟠 **Persistance de l'historique de chat** — `GET /api/chat-history` (chargement), `PUT /api/chat-history` (sauvegarde).
  - Chemin heureux : rechargement de la page → conversation restaurée.
  - Cas limite : historique vide → conversation neuve ; échec de sauvegarde → message ou perte silencieuse à vérifier.

- [ ] 🟡 **Réinitialisation / nouvelle conversation** — Bouton de reset.
  - Chemin heureux : reset → zone de saisie vidée, nouvel historique.
  - Cas limite : reset en cours de réponse IA → annulation propre.

---

## 6 — Contrathèque

Composants : `DashboardComponents/Contratheque.tsx`, `contratheque/{ContrathequeList, ContractDetail, ImportWizard, DeadlinesView, ViewTabs, MetadataPanel, NegotiationPanel, ContractEditor, VersionCompare, KpiBar, Sidebar, ContractTable, CalendarMonth, ClauseReformulator}.tsx`.
API : `contratheque/api.ts`. Endpoints : `GET /api/contract`, `POST /api/contract`, `GET /api/contract/:id`, `PATCH /api/contract/:id`, `DELETE /api/contract/:id`, `GET /api/contract/stats`, `GET /api/contract/deadlines`, `GET /api/contract/export.csv`, `GET/POST /api/contract/tags`, `DELETE /api/contract/tags/:id`, `GET/POST /api/contract/folders`, `DELETE /api/contract/folders/:id`, `GET /api/contract/:id/document`, `GET /api/contract/:id/audit`, `POST /api/contract/:id/validate-field`, `POST /api/contract/:id/amendment`, `POST /api/contract/:id/version`, `POST /api/contract/:id/snapshot`, `POST /api/contract/:id/archive`, `POST /api/contract/:id/comments`, `POST /api/contract/:id/approval`, `POST /api/contract/extract` (Python).

- [ ] 🔴 **Liste des contrats + filtres** — `ContrathequeList` → `GET /api/contract?...`, `GET /api/contract/stats`.
  - Chemin heureux : contrats affichés en tableau + KPI (`KpiBar`), filtres (statut, recherche) appliqués.
  - Cas limite : liste vide → état vide ; erreur réseau → message ; pagination/tri sur grande liste.

- [ ] 🔴 **Import de contrat (wizard 4 étapes)** — `ImportWizard` : upload → extraction IA (`POST /api/contract/extract`) → **revue humaine obligatoire** → persistance (`POST /api/contract`).
  - Chemin heureux : PDF importé, métadonnées extraites, revue validée → contrat créé.
  - Cas limite : extraction en échec sur un item → item marqué `error`, exclu de la persistance ; **aucune écriture en base avant confirmation** (à vérifier strictement) ; fichier non PDF/DOCX filtré à l'ajout.

- [ ] 🔴 **Suppression d'un contrat** — `DELETE /api/contract/:id` (rôle éditeur requis).
  - Chemin heureux : ADMIN/JURISTE/USER supprime son contrat → retiré de la liste.
  - Cas limite : LECTEUR → 403 « Action réservée aux éditeurs » ; suppression d'un contrat inexistant → 404 ; confirmation demandée avant suppression.

- [ ] 🟠 **Fiche contrat détaillée** — `ContractDetail` (route `/contratheque/:externalId`) → `GET /api/contract/:id`, `GET /api/contract/:id/document`.
  - Chemin heureux : ouverture → métadonnées + document déchiffré (`relayToNodeRaw`, PDF binaire) affichés.
  - Cas limite : `:externalId` inexistant → 404 ; document chiffré illisible → erreur ; accès à un contrat d'un autre utilisateur → 403/404.

- [ ] 🟠 **Édition des métadonnées IA + validation de champ** — `MetadataPanel` → `PATCH /api/contract/:id`, `POST /api/contract/:id/validate-field`.
  - Chemin heureux : champ corrigé et validé (`FieldValidationStatus`) → statut mis à jour + trace d'audit.
  - Cas limite : valeur invalide → rejet ; validation d'un champ déjà validé → idempotence.

- [ ] 🟠 **Gestion des tags** — `GET/POST /api/contract/tags`, `DELETE /api/contract/tags/:id`.
  - Chemin heureux : création d'un tag, association à un contrat, filtrage par tag.
  - Cas limite : tag en doublon → rejet ou dédoublonnage ; suppression d'un tag utilisé → dissociation en cascade.

- [ ] 🟠 **Gestion des dossiers/folders** — `Sidebar` → `GET/POST /api/contract/folders`, `DELETE /api/contract/folders/:id`.
  - Chemin heureux : création d'un dossier, rangement de contrats.
  - Cas limite : suppression d'un dossier non vide → comportement (contrats orphelins ?) à vérifier.

- [ ] 🟠 **Avenants** — `POST /api/contract/:id/amendment`.
  - Chemin heureux : ajout d'un avenant → historisé et lié au contrat.
  - Cas limite : avenant sans contenu → 400 ; avenant sur contrat archivé → refus attendu.

- [ ] 🟠 **Versions & snapshots** — `POST /api/contract/:id/snapshot`, `VersionCompare`.
  - Chemin heureux : snapshot créé → comparaison de deux versions.
  - Cas limite : comparaison avec une seule version → message ; version corrompue.

- [ ] 🟠 **Archivage** — `POST /api/contract/:id/archive`.
  - Chemin heureux : contrat archivé → statut `ARCHIVED`, retiré des vues actives.
  - Cas limite : archivage d'un contrat déjà archivé → idempotent.

- [ ] 🟠 **Journal d'audit** — `GET /api/contract/:id/audit` (`AuditLog`, `AuditAction`).
  - Chemin heureux : historique des actions (création, édition, validation, archivage) affiché.
  - Cas limite : contrat sans historique → vide ; audit d'un contrat inaccessible → 403.

- [ ] 🟠 **Vue Échéances / renouvellements** — `DeadlinesView`, `CalendarMonth` → `GET /api/contract/deadlines?horizonDays=`.
  - Chemin heureux : contrats avec échéance dans l'horizon affichés (`RenewalType`).
  - Cas limite : horizon = 0 → aucune ; aucune échéance → état vide ; date de renouvellement passée → alerte.

- [ ] 🟡 **Export CSV** — `GET /api/contract/export.csv` (URL directe construite, `relayToNodeRaw`, rôle éditeur).
  - Chemin heureux : téléchargement du CSV avec `content-disposition`.
  - Cas limite : LECTEUR → 403 ; liste vide → CSV avec en-têtes seuls.

- [ ] 🟡 **Reformulation de clause** — `ClauseReformulator` → `POST /api/openai-chat-5`.
  - Chemin heureux : clause reformulée par l'IA.
  - Cas limite : IA indisponible → message d'erreur.

---

## 7 — Bibliothèque de clauses

Composants : `DashboardComponents/clauses/{ClausesLibrary, ClauseEditor}.tsx`, `clauses/api.ts` (route `/clauses`).
Endpoints : `GET /api/clause`, `GET /api/clause/stats`, `GET /api/clause/:id`, `POST /api/clause`, `PATCH /api/clause/:id`, `DELETE /api/clause/:id`, `POST /api/clause/:id/use`.

- [ ] 🟠 **Liste + regroupement par catégorie** — `GET /api/clause`, `GET /api/clause/stats`, `ClauseCategory`.
  - Chemin heureux : clauses groupées par catégorie + statistiques.
  - Cas limite : bibliothèque vide → état vide ; erreur réseau → message.

- [ ] 🟠 **Recherche & filtres** — Filtres `category`, `position` (`ClausePosition`), `onlyApproved`, `q`.
  - Chemin heureux : filtrage combiné → résultats corrects.
  - Cas limite : aucun résultat → état vide ; caractères spéciaux dans `q` → pas d'injection.

- [ ] 🔴 **Création de clause** — `ClauseEditor` → `POST /api/clause` (rôle éditeur).
  - Chemin heureux : ADMIN/JURISTE/USER crée une clause valide → ajoutée.
  - Cas limite : LECTEUR → 403 ; champ obligatoire manquant → 400 ; catégorie/position invalide (hors enum) → 400.

- [ ] 🔴 **Édition de clause** — `PATCH /api/clause/:id` (rôle éditeur).
  - Chemin heureux : modification → persistée + `loadData()`.
  - Cas limite : LECTEUR → 403 ; clause inexistante → 404 ; conflit de version.

- [ ] 🔴 **Suppression de clause** — `DELETE /api/clause/:id` (rôle éditeur), confirmation `confirm()`.
  - Chemin heureux : confirmation → clause retirée (optimistic UI) + `loadData()`.
  - Cas limite : annulation de la confirmation → aucune action ; échec serveur → rollback via `loadData()` + message ; LECTEUR → 403.

- [ ] 🟡 **Positions de négociation** — `POSITION_LABEL`, `POSITION_STYLE`.
  - Chemin heureux : chaque position affichée avec son style.
  - Cas limite : position inconnue → style de secours.

- [ ] 🟡 **Copie / réutilisation de clause** — Bouton `Copy`.
  - Chemin heureux : contenu copié dans le presse-papier + feedback `Check`.
  - Cas limite : API clipboard indisponible → fallback.

---

## 8 — Génération de contrats

Composant : `DashboardComponents/Generateur.tsx` (routes `/generateur`, `/contrat-*`), `generateur/ScratchFlow.tsx`, `cdd/smart/SmartCddEditor.tsx`, `contractEngine/models/*`.
Endpoints : `GET /api/template`, `POST /api/template/import`, `GET /api/template/:id`, `PUT /api/template/:id`, `DELETE /api/template/:id`, `GET/PUT /api/template/:id/playbook`, `POST /api/template/:id/generate`, `POST /api/openai-chat-5`.

- [ ] 🟠 **Bibliothèque de modèles** — `LibrarySection` → `GET /api/template` + modèles statiques (CDI, CDD, avenant, disciplinaire, rupture) + historique local.
  - Chemin heureux : liste des modèles perso + génériques, recherche tolérante (`norm`).
  - Cas limite : aucun modèle personnalisé → seuls les génériques ; recherche sans résultat → vide.

- [ ] 🔴 **Import d'un modèle (IA)** — `POST /api/template/import` : extraction Python → structuration GPT-5.2 → sauvegarde backNode.
  - Chemin heureux : document importé → variables `<<NOM|valeur>>` détectées, modèle sauvegardé (201).
  - Cas limite : `fileBase64`/`filename`/`name` manquant → 400 ; extraction Python 502 ; réponse IA non-JSON → 422 ; texte tronqué à 40 000 caractères.

- [ ] 🔴 **Génération de contrat depuis un modèle** — `POST /api/template/:id/generate` (substitution marqueurs + playbook + GPT-5.2).
  - Chemin heureux : variables renseignées → contrat final généré, tokens loggés, feature `generate_contract` trackée.
  - Cas limite : `externalId`/`variables` manquants → 400 ; modèle introuvable → 404 ; variable non fournie → conserve le texte original ; génération IA 502.

- [ ] 🟠 **Playbook (consignes de génération)** — `GET/PUT /api/template/:id/playbook` (`TemplatePlaybook`).
  - Chemin heureux : consignes enregistrées → prises en compte, **prioritaires** sur le modèle en cas de conflit.
  - Cas limite : consignes envoyées dans la requête priment sur celles enregistrées ; playbook vide → « aucune règle particulière ».

- [ ] 🟠 **Éditeur document-first (CDD/CDI/avenant…)** — `SmartCddEditor`, `CddForm`, `contractEngine`.
  - Chemin heureux : remplissage des variables → aperçu document + export.
  - Cas limite : variable obligatoire vide → validation ; type de contrat non supporté.

- [ ] 🟠 **Génération « from scratch »** — `ScratchFlow`/`ScratchWizard`.
  - Chemin heureux : wizard complété → contrat créé et ajouté à l'historique local (`addCreatedContract`).
  - Cas limite : abandon en cours → pas de persistance ; reprise d'un contrat créé (`onOpenCreated`).

- [ ] 🟠 **Mise à jour / suppression d'un modèle** — `PUT /api/template/:id`, `DELETE /api/template/:id`.
  - Chemin heureux : renommage/édition/suppression → reflété dans la liste.
  - Cas limite : suppression d'un modèle utilisé ailleurs ; modèle inexistant → 404.

- [ ] 🟡 **Notifications de template** — `store/templateNotificationStore`.
  - Chemin heureux : notification après import/génération.
  - Cas limite : notifications empilées.

---

## 9 — E-Signature

Composants : `DashboardComponents/Signature.tsx`, `signature/{SignatureDashboard, SignatureWizard, Stepper, PrepareStep, PlaceStep, PlaceToolbar, SignStep, SignatureModal, FieldOverlay, PdfViewer, SignProgress}.tsx`, `page/SignerPage.tsx`.
Endpoints : `GET /api/signature-envelope/stats`, `GET /api/signature-envelope?status=`, `POST /api/signature-envelope`, `DELETE /api/signature-envelope/:id`, `GET /api/signature-envelope/public/:token`, `POST /api/signature-envelope/public/:token`.

- [ ] 🟠 **Tableau de bord des enveloppes** — `SignatureDashboard` → `GET /api/signature-envelope/stats`, `GET /api/signature-envelope?status=`.
  - Chemin heureux : liste des enveloppes + stats, filtre par statut (`EnvelopeStatus`).
  - Cas limite : aucune enveloppe → état vide ; filtre sur statut sans résultat.

- [ ] 🔴 **Création d'une enveloppe (wizard 3 étapes)** — `SignatureWizard` : Prepare (upload PDF) → Place (champs) → Sign → `POST /api/signature-envelope`.
  - Chemin heureux : PDF chargé, champs placés, coordonnées cocontractant saisies → enveloppe créée, `onSent`.
  - Cas limite : PDF manquant → étape bloquée ; email cocontractant invalide → validation ; aucun champ signature placé → refus ; envoi 502 → `sendError` affiché.

- [ ] 🟠 **Placement des champs de signature** — `PlaceStep`, `PlaceToolbar`, `FieldOverlay` (drag & drop sur le PDF).
  - Chemin heureux : placement d'un champ `self` puis bascule auto sur `counterparty` ; réplication sur toutes les pages (`replicateAllPages`).
  - Cas limite : champ hors page ; déplacement d'un champ existant (`moveField`) ; suppression d'un champ.

- [ ] 🟠 **Capture de signature** — `SignatureModal` (dessin/saisie).
  - Chemin heureux : signature dessinée → capturée par rôle (`capturedSigs`).
  - Cas limite : annulation sans signer → champ non rempli ; signature vide.

- [ ] 🔴 **Suppression d'une enveloppe** — `DELETE /api/signature-envelope/:id`.
  - Chemin heureux : enveloppe supprimée → retirée du tableau.
  - Cas limite : enveloppe déjà signée → refus/confirmation ; enveloppe inexistante → 404.

- [ ] 🔴 **Page publique de signature (cocontractant)** — `page/SignerPage.tsx` (route `/signer/:token`, **sans auth**) → `GET/POST /api/signature-envelope/public/:token`.
  - Chemin heureux : token valide → document + champs affichés, signature soumise → statut mis à jour.
  - Cas limite : token invalide/expiré → 404/erreur ; enveloppe déjà signée → lecture seule ; accès sans token → refus.

- [ ] 🟡 **Suivi de progression de signature** — `SignProgress`, `Stepper`.
  - Chemin heureux : statuts (`SENT`, `SIGNED`…) reflétés visuellement.
  - Cas limite : signature partielle (un seul signataire).

---

## 10 — Négociation

Composants : `DashboardComponents/negotiation/{NegotiationWorkspace, NegotiationDoc, ClauseRedlines, CommentThread, ParticipantsPanel, ShareDialog, VersionDiff}.tsx`, `negotiation/api.ts`, `page/NegotiationGuest.tsx`, `contratheque/NegotiationPanel.tsx`.
Endpoints : `POST /api/negotiation/enter`, `GET /api/negotiation/contract/:id`, `GET /api/negotiation/:id`, `POST /api/negotiation/:id/{abort,exit,versions,proposals,comments,participants,guests}`, `POST /api/negotiation/:id/versions/:vid/validate`, `PATCH /api/negotiation/:id/proposals/:pid`, `PATCH /api/negotiation/:id/comments/:cid/resolve`, `DELETE /api/negotiation/:id/participants/:pid`, `POST /api/negotiation/:id/guests/:gid/revoke`, `POST /api/negotiation-diff` (Python), `GET /api/negotiation/public/:token`, `POST /api/negotiation/public/:token/comments`.

- [ ] 🔴 **Ouverture / reprise d'une session** — `POST /api/negotiation/enter` (rôle éditeur).
  - Chemin heureux : session créée ou réutilisée pour un contrat → `NegotiationWorkspace` chargé.
  - Cas limite : LECTEUR → 403 ; contrat inexistant → erreur ; session déjà `ABORTED` (`NegotiationStatus`).

- [ ] 🟠 **Création & validation de versions** — `POST /api/negotiation/:id/versions`, `.../versions/:vid/validate`.
  - Chemin heureux : nouvelle version (`contentText`, `label`) créée puis validée.
  - Cas limite : version vide → 400 ; validation d'une version déjà validée → idempotence.

- [ ] 🟠 **Propositions de clauses (redlines)** — `ClauseRedlines` → `POST /api/negotiation/:id/proposals`, `PATCH .../proposals/:pid` (statut).
  - Chemin heureux : proposition ajoutée (`clauseRef`, `proposedText`) → statut modifiable (`ProposalStatus` : accepté/rejeté).
  - Cas limite : proposition sans texte → 400 ; changement de statut par un non-participant → refus.

- [ ] 🟠 **Commentaires ancrés** — `CommentThread` → `POST /api/negotiation/:id/comments`, `PATCH .../comments/:cid/resolve`.
  - Chemin heureux : commentaire ancré sur une portion de texte (`anchorStart/End`, `quote`) → résolvable.
  - Cas limite : `CommentVisibility` (interne/partagé) respectée ; résolution d'un commentaire déjà résolu.

- [ ] 🟠 **Participants** — `ParticipantsPanel` → `POST /api/negotiation/:id/participants`, `DELETE .../participants/:pid`.
  - Chemin heureux : ajout d'un participant (`side`, `role` — `ParticipantSide`/`ParticipantRole`) puis retrait.
  - Cas limite : doublon de participant ; retrait du dernier participant/propriétaire.

- [ ] 🔴 **Invités externes (guest access)** — `ShareDialog` → `POST /api/negotiation/:id/guests` (génère token + `expiresAt`), `POST .../guests/:gid/revoke`.
  - Chemin heureux : génération d'un lien invité avec TTL → partageable.
  - Cas limite : `ttlHours` invalide ; révocation d'un invité → lien immédiatement inutilisable.

- [ ] 🔴 **Page publique invité** — `page/NegotiationGuest.tsx` (route `/negociation-invite/:token`, **sans auth**) → `GET /api/negotiation/public/:token`, `POST .../public/:token/comments`.
  - Chemin heureux : token valide → document en lecture + ajout de commentaires invité.
  - Cas limite : token expiré/révoqué → « Lien invalide ou expiré » (404) ; tentative d'action non autorisée pour un invité.

- [ ] 🟠 **Diff structuré de versions** — `VersionDiff` → `POST /api/negotiation-diff` (Python).
  - Chemin heureux : deux textes comparés clause par clause → diff affiché.
  - Cas limite : textes identiques → aucun diff ; backend Python 502 → « Échec du diff ».

- [ ] 🟡 **Abandon / sortie de session** — `POST /api/negotiation/:id/abort`, `.../exit`.
  - Chemin heureux : abandon → statut `ABORTED` ; sortie → session conservée.
  - Cas limite : abandon d'une session déjà terminée.

---

## 11 — Veille juridique

Composants : `DashboardComponents/Veille.tsx`, `veille/{LegalWatchAlerts, LegalWatchFeed, LegalWatchSettings}.tsx`, `store/legalWatchStore.ts` (route `/veille`).
Endpoints : `GET /api/legal-watch/alerts`, `PATCH /api/legal-watch/alerts/:id`, `GET /api/legal-watch/digest`, `GET /api/legal-watch/status`, `GET /api/legal-watch/config`, `GET /api/legal-watch/unread-count`, `POST /api/legal-watch/run`, `PATCH /api/legal-watch/sources/:name`, `PATCH /api/legal-watch/concepts/:concept`, `GET /api/veille`, `GET /api/veille/debug`.

- [ ] 🟠 **Onglet Alertes** — `LegalWatchAlerts` → `GET /api/legal-watch/alerts`, `GET /api/legal-watch/status`.
  - Chemin heureux : alertes de veille sur le portefeuille affichées (`LegalWatchAlertStatus`, `LegalWatchImpact`).
  - Cas limite : aucune alerte → état vide ; pipeline jamais exécuté → statut « aucune donnée ».

- [ ] 🟠 **Marquage d'une alerte (lu/traité)** — `PATCH /api/legal-watch/alerts/:id`.
  - Chemin heureux : changement de statut → compteur `unread-count` décrémenté.
  - Cas limite : alerte inexistante → 404 ; double marquage.

- [ ] 🟠 **Onglet Actualités juridiques** — `LegalWatchFeed` → `GET /api/legal-watch/digest?pageSize=40`, `GET /api/veille`.
  - Chemin heureux : fil jurisprudence + RSS, filtrable par thématique.
  - Cas limite : source RSS indisponible → dégradé ; filtre sans résultat.

- [ ] 🟠 **Déclenchement manuel du pipeline** — `POST /api/legal-watch/run` (jobGuard, rôle ADMIN/JURISTE).
  - Chemin heureux : ADMIN/JURISTE lance le run → ingestion+enrichissement+publication.
  - Cas limite : USER/LECTEUR → 403 ; run déjà en cours.

- [ ] 🟠 **Paramètres de veille (sources & concepts)** — `LegalWatchSettings` → `GET /api/legal-watch/config`, `PATCH /api/legal-watch/sources/:name`, `PATCH /api/legal-watch/concepts/:concept`.
  - Chemin heureux : activation/désactivation d'une source (`LegalWatchSource`) ou d'un concept (`LegalConceptMapping`).
  - Cas limite : source inconnue → 404 ; non-éditeur → 403 (jobGuard).

- [ ] 🟡 **Badge de compteur non lus** — `store/legalWatchStore` → `GET /api/legal-watch/unread-count`.
  - Chemin heureux : nombre affiché sur l'onglet Alertes.
  - Cas limite : 0 non lus → pas de badge.

---

## 12 — Profil & Entreprise

Page : `page/ParamCompte.tsx` (route `/mon-compte`), composants `ParamComponents/{AccountSettingsPanel, EnterpriseSettingsPanel, PreferenceSettingsPanel, SubscriptionSettingsPanel, ParamLayout}.tsx`, `hooks/useEnterpriseSettings.ts`, `common/CompanySearchField.tsx`, `DashboardComponents/MesFiligranes.tsx`.
Endpoints : `PUT /api/user`, `GET /api/user/get`, `GET/PUT /api/user/preferences`, `GET/PUT /api/user/preferences/ui`, `POST /api/user/two-factor`, `POST /api/user/two-factor/verify`, `POST /api/user/export-data`, `DELETE /api/user/account`, `GET/PUT /api/enterprise`, `GET /api/insee/:siren`, `GET /api/user-uploads`, `POST /api/user-uploads/upload`, `PUT/DELETE /api/user-uploads/:filename`.

- [ ] 🔴 **Modification du profil** — `AccountSettingsPanel` → `PUT /api/user`.
  - Chemin heureux : nom/prénom/email modifiés → `profileUpdateSuccess`, `fetchUser()`.
  - Cas limite : email déjà pris → `profileUpdateError` ; champ invalide → 400.

- [ ] 🔴 **Activation / désactivation 2FA** — `POST /api/user/two-factor` (init) + `POST /api/user/two-factor/verify` (confirmation via `TwoFactorCodeModal`).
  - Chemin heureux : activation → QR/secret, code vérifié → 2FA active.
  - Cas limite : code erroné → refus ; désactivation → 2FA off.

- [ ] 🟠 **Informations entreprise + SIREN** — `EnterpriseSettingsPanel`, `useEnterpriseSettings` → `GET/PUT /api/enterprise`, lookup `GET /api/insee/:siren`.
  - Chemin heureux : SIREN saisi → auto-remplissage (raison sociale, adresse, statut juridique) → sauvegarde.
  - Cas limite : SIREN invalide → pas d'auto-remplissage ; INSEE 502 → saisie manuelle ; `enterpriseUpdateError` sur échec.

- [ ] 🟠 **Préférences UI (dyslexie, notifications email)** — `PreferenceSettingsPanel`, `store/preferencesStore` → `GET/PUT /api/user/preferences`, `GET/PUT /api/user/preferences/ui`.
  - Chemin heureux : bascule mode dyslexie → classe `dyslexic-font` sur `body` + persistée ; toggle notifications email.
  - Cas limite : chargement des préférences avant auth → non chargées ; échec PUT → rollback visuel.

- [ ] 🟠 **Logo / filigrane (Mes Filigranes)** — `MesFiligranes` → `GET /api/user-uploads`, `POST /api/user-uploads/upload`, `PUT/DELETE /api/user-uploads/:filename`, affichage via `/api/user-uploads/assets/:filename`.
  - Chemin heureux : upload d'une image → apparaît dans la galerie ; renommage ; suppression.
  - Cas limite : format non image → rejet ; fichier trop volumineux ; suppression d'un fichier inexistant.

- [ ] 🔴 **Export des données personnelles (RGPD)** — `POST /api/user/export-data`.
  - Chemin heureux : demande → archive de données générée/envoyée.
  - Cas limite : export répété rapproché → rate/limite ; utilisateur sans données.

- [ ] 🔴 **Suppression de compte** — `ConfirmationModal` → `DELETE /api/user/account`.
  - Chemin heureux : confirmation explicite → compte supprimé, session invalidée, redirection.
  - Cas limite : annulation de la modale → aucune action ; suppression avec abonnement actif → gestion (résiliation ?) à vérifier ; **action irréversible** — vérifier le double niveau de confirmation.

- [ ] 🟡 **Persistance de l'onglet actif** — `location.state.tab` / `origin=header-alert`.
  - Chemin heureux : arrivée depuis la cloche → onglet « entreprise » pré-sélectionné.
  - Cas limite : state nettoyé après lecture (`navigate(replace, state:null)`).

---

## 13 — Facturation & Abonnements

Composants : `page/Subscription.tsx` (route `/souscription`), `SubscriptionComponents/{PlansPanel, BillingForm, BillingStripePanel, CreditsPanel}.tsx`, `ParamComponents/SubscriptionSettingsPanel.tsx`.
Endpoints : `POST /api/billing/customer`, `POST /api/billing/payment-intent`, `GET /api/billing/plans`, `GET/POST /api/billing/subscription`, `PUT /api/billing/add-credits`, `GET /api/billing/credits`.

- [ ] 🔴 **Affichage des formules** — `PlansPanel` (route `/souscription`).
  - Chemin heureux : plans (`Plan`, `SubscriptionStatus`) affichés avec tarifs et crédits inclus.
  - Cas limite : ⚠️ vérifier la source des plans — `GET /api/billing/plans` **n'est pas appelé** côté front (plans probablement en dur) ; incohérence tarif front/back possible.

- [ ] 🔴 **Souscription à un abonnement (Stripe)** — `BillingForm` : `POST /api/billing/customer` → `POST /api/billing/payment-intent` → `POST /api/billing/subscription`.
  - Chemin heureux : carte valide (Stripe Elements) → client créé, paiement confirmé, abonnement actif.
  - Cas limite : carte refusée → erreur Stripe affichée ; 3-D Secure requis → challenge ; `payment-intent` 502 ; **ne jamais saisir de vraies données bancaires en test** — utiliser les cartes de test Stripe.

- [ ] 🟠 **Consultation de l'abonnement courant** — `SubscriptionSettingsPanel` → `GET /api/billing/subscription`.
  - Chemin heureux : statut, plan, date d'expiration affichés.
  - Cas limite : aucun abonnement → offre freemium ; abonnement expiré (`EXPIRED`).

- [ ] 🟠 **Ajout de crédits (achat)** — `PUT /api/billing/add-credits` (depuis `BillingForm`).
  - Chemin heureux : achat de crédits → solde `UserCredit.creditAdded` incrémenté.
  - Cas limite : montant invalide → 400 ; paiement non confirmé → pas d'ajout.

- [ ] 🟡 **Factures** — `Facture` (modèle), affichées dans le panel abonnement / détails admin.
  - Chemin heureux : liste des factures avec montants.
  - Cas limite : aucune facture → vide.

---

## 14 — Crédits

### Note 
L'utilisation des crédits n'est pas forcement implémenté partout, ignorer cette liste qui sera a effectué après la
mise en place des credits sur l'ensemble de l'application

Composants : `common/CreditBar.tsx`, `SubscriptionComponents/CreditsPanel.tsx`, `common/AlertBanner.tsx`.
Endpoints : `GET /api/billing/credits`, `PUT /api/billing/add-credits`, `PUT /api/billing/remove-credits`. Modèle : `UserCredit` (`creditIncluded` + `creditAdded`).

- [ ] 🔴 **Consommation de crédits sur action IA** — `PUT /api/billing/remove-credits` (ex. analyse = 100).
  - Chemin heureux : action IA → débit du solde, `CreditBar` mise à jour.
  - Cas limite : solde insuffisant → l'action doit être **bloquée en amont** (à vérifier : actuellement le débit est post-analyse et best-effort → risque de solde négatif ou d'analyse gratuite).

- [ ] 🟠 **Affichage du solde (CreditBar)** — `used` / `total`, seuil bas ≤ 20 %.
  - Chemin heureux : solde normal → barre `lumenjuris` ; solde ≤ 20 % → barre rouge + texte rouge.
  - Cas limite : `total ≤ 0` → barre vide ; `used = 0` → affiche `total` seul.

- [ ] 🟠 **Épuisement des crédits** — Solde = 0.
  - Chemin heureux : actions IA désactivées + invitation à recharger.
  - Cas limite : crédits inclus épuisés mais crédits bonus (`creditAdded`) restants → cumul correct (`total`).

- [ ] 🟡 **Crédits bonus / ajoutés** — `creditAdded` vs `creditIncluded`.
  - Chemin heureux : total = inclus + ajoutés.
  - Cas limite : ordre de consommation (inclus d'abord ou bonus d'abord) à documenter/tester.

---

## 15 — Monitoring admin — Vue d'ensemble

Composant : `MonitoringComponents/OverviewSection.tsx` (onglet « Vue d'ensemble »).
Endpoints : `GET /api/admin/overview`, `GET /api/llm/usage/users`.

- [ ] 🟠 **KPIs utilisateurs** — `overview.users` (total, vérifiés, actifs J-1/J-7/J-30).
  - Chemin heureux : chiffres cohérents affichés.
  - Cas limite : base vide → 0 partout ; non-admin → 403 (`requireAdmin`).

- [ ] 🟠 **Taux de conversion** — `overview.conversion` (avec abonnement actif / total).
  - Chemin heureux : taux calculé et affiché.
  - Cas limite : 0 utilisateur → division par zéro gérée (taux 0).

- [ ] 🔴 **Alerte coût LLM du jour** — `overview.costAlert` (`todayUsd`, `threshold` = `COST_ALERT_USD`, `exceeded`).
  - Chemin heureux : coût < seuil → normal ; coût ≥ seuil → alerte visuelle.
  - Cas limite : seuil non configuré → valeur par défaut ; aucun usage → 0 USD.

- [ ] 🟠 **Top 10 consommateurs LLM** — Consolidation `topLlmUsers` (agrégation multi-modèles par user).
  - Chemin heureux : classement par coût décroissant, max 10.
  - Cas limite : aucun usage → liste vide ; un user avec plusieurs modèles → coûts sommés.

- [ ] 🟠 **Suivi des crédits par utilisateur** — `credits` : épuisés (`total===0`), faibles (`< 20 %`), OK.
  - Chemin heureux : répartition correcte des trois catégories.
  - Cas limite : `planCredit=0` → exclusion du calcul « faible » (évite division par zéro).

- [ ] 🟡 **États de chargement / erreur** — Spinner + bandeau d'erreur.
  - Chemin heureux : chargement puis données.
  - Cas limite : `overview.success=false` → message d'erreur ; annulation (`cancelled`) au démontage.

---

## 16 — Monitoring admin — LLM Usage

Composant : `MonitoringComponents/LlmUsageSection.tsx` (onglet « LLM Usage »).
Endpoints : `GET /api/llm/usage/history?days=`, (+ `GET /api/llm/usage`, `GET /api/llm/usage/me`).

- [ ] 🟠 **Historique de consommation** — `GET /api/llm/usage/history?days=N` (Recharts).
  - Chemin heureux : courbe/barres de consommation sur N jours par modèle (`LlmUsage`).
  - Cas limite : `days` invalide/négatif → défaut ; période sans données → graphe vide.

- [ ] 🟠 **Sélecteur de période** — Boutons de plage (jours).
  - Chemin heureux : changement de plage → rechargement du graphe.
  - Cas limite : changement rapide → pas de course de requêtes (annulation).

- [ ] 🟡 **Coûts par modèle** — Modèles autorisés : `gpt-4o`, `gpt-4o-mini`, `gpt-5.2`, `gpt-5.4-nano`.
  - Chemin heureux : coût par modèle correct.
  - Cas limite : modèle hors liste blanche (`PUT /llm/increment`) → 400 rejeté à l'incrément.

---

## 17 — Monitoring admin — Feedbacks

Composant : `MonitoringComponents/FeedbackSection.tsx` (onglet « Feedbacks »).
Endpoints : `GET /api/feedback`, `DELETE /api/feedback/bulk`, `DELETE /api/feedback/:id`, `GET /api/admin/users/:idUser/details`.

- [ ] 🟠 **Liste des feedbacks** — `GET /api/feedback` (fichier log JSON côté backNode).
  - Chemin heureux : feedbacks affichés (date, commentaire, contexte, page, userId).
  - Cas limite : aucun feedback → état vide ; log corrompu → 500 géré.

- [ ] 🟠 **Recherche & filtres** — Recherche texte, filtre par page, tri (newest/oldest).
  - Chemin heureux : filtrage/tri combinés cohérents.
  - Cas limite : recherche sans résultat → vide ; filtre `all` → tout.

- [ ] 🟠 **Pagination + taille de page** — 10/25/50/100, `paginationItems` (avec `…`).
  - Chemin heureux : navigation entre pages, changement de taille recalcule les pages.
  - Cas limite : page courante > nombre de pages après filtrage → clamp ; une seule page → pas d'ellipse.

- [ ] 🔴 **Suppression unitaire** — `DELETE /api/feedback/:id`.
  - Chemin heureux : suppression → retiré de la liste.
  - Cas limite : id inexistant → 404 ; confirmation inline avant suppression.

- [ ] 🔴 **Multi-sélection + suppression en masse** — `DELETE /api/feedback/bulk` (`{ ids: [] }`), barre d'action + confirmation.
  - Chemin heureux : sélection multiple → suppression groupée, compteur `deleted`.
  - Cas limite : `ids` vide/non tableau → 400 ; sélection puis désélection totale → barre masquée ; annulation de la confirmation.

- [ ] 🟠 **Panel détail utilisateur (slide-over)** — `GET /api/admin/users/:idUser/details`.
  - Chemin heureux : clic sur un feedback lié à un user → panel (plan, email, entreprise, crédits, stats `_count`).
  - Cas limite : feedback anonyme (sans `userId`) → pas de panel ; user supprimé → 404 ; `panelError` affiché.

---

## 18 — Monitoring admin — Utilisateurs

Composant : `DashboardComponents/admin/UserManagement.tsx` (route `/utilisateurs` + onglet « Utilisateurs »).
Endpoints : `GET /api/admin/users`, `PATCH /api/admin/users/:idUser/role`, `PATCH /api/admin/users/:idUser/ban`.

- [ ] 🟠 **Liste des utilisateurs** — `GET /api/admin/users`.
  - Chemin heureux : tous les comptes affichés (email, nom, rôle, statut ban).
  - Cas limite : non-admin → « Accès réservé aux administrateurs » (garde front) + 403 backend.

- [ ] 🟠 **Recherche par nom/email** — Filtre local `search`.
  - Chemin heureux : filtrage instantané.
  - Cas limite : recherche vide → tous ; casse ignorée.

- [ ] 🔴 **Changement de rôle** — `PATCH /api/admin/users/:idUser/role` (`Role` : ADMIN/JURISTE/USER/LECTEUR).
  - Chemin heureux : nouveau rôle → mise à jour optimiste + confirmation (`savedId`).
  - Cas limite : rôle identique → no-op ; rôle invalide → 400 ; échec serveur → rollback (`load()`) ; auto-rétrogradation d'un admin (se retirer ses droits) — comportement à vérifier.

- [ ] 🔴 **Ban / unban** — `PATCH /api/admin/users/:idUser/ban` (`{ banned }`).
  - Chemin heureux : ban → `isBanned=true`, effet **immédiat** (vérifié à chaque requête par `authMiddleware`) ; unban → réactivation.
  - Cas limite : échec serveur → rollback ; se bannir soi-même → à empêcher/vérifier ; utilisateur banni tentant une action → 403 `banned:true`.

- [ ] 🟡 **Indicateurs visuels des comptes suspendus** — `RoleBadge`, badge ban.
  - Chemin heureux : compte banni → style distinctif.
  - Cas limite : rôle inconnu → style de secours.

---

## 19 — Monitoring admin — Revenus

Composant : `MonitoringComponents/RevenueSection.tsx` (onglet « Revenus »).
Endpoint : `GET /api/admin/revenue`.

- [ ] 🟠 **Vue des abonnements & CA** — `GET /api/admin/revenue`.
  - Chemin heureux : total CA, breakdown par plan, dernières factures (`Facture`, `Subscription`).
  - Cas limite : aucun abonnement → CA = 0 ; non-admin → 403.

- [ ] 🟡 **Breakdown par plan** — Répartition du CA par formule.
  - Chemin heureux : montants par plan cohérents avec le total.
  - Cas limite : plan sans abonné → 0.

- [ ] 🟡 **Dernières factures** — Liste chronologique.
  - Chemin heureux : factures récentes affichées.
  - Cas limite : aucune facture → vide.

---

## 20 — Monitoring admin — Activité

Composant : `MonitoringComponents/ActivitySection.tsx` (onglet « Activité »).
Endpoint : `GET /api/admin/feature-usage?days=`.

- [ ] 🟠 **Graphique d'usage des features ** — `GET /api/admin/feature-usage?days=N` (Recharts, `FeatureUsage`).
  - Chemin heureux : timeline empilée par feature (analyze_contract, chat, generate_contract, import_template, market_analysis, recommend_clause, etc.).
  - Cas limite : période sans usage → graphe vide ; non-admin → 403.

- [ ] 🟠 **Granularité automatique** — `granularityFor(days)` (jour/semaine/mois selon la plage).
  - Chemin heureux : petite plage → jour ; grande plage → semaine/mois (`groupTimeline`).
  - Cas limite : plage aux frontières de bascule de granularité.

- [ ] 🟠 **Sélecteur de période (jours)** — `selectedDays` (défaut 30).
  - Chemin heureux : changement → rechargement + regroupement.
  - Cas limite : changements rapides → annulation de requête (`cancelled`).

- [ ] 🟡 **Répartition par feature + top 10 users** — `summary`, `topUsers`.
  - Chemin heureux : classement des features et des utilisateurs actifs.
  - Cas limite : égalités de comptage ; user supprimé encore présent dans l'agrégat.

---

## 21 — Sécurité transversale

Fichiers : `backNode/src/middleware/authMiddleware.ts`, `proxy/src/middleware/authMiddleware.ts`, `backNode/src/securite/limiter.ts`, `apiAdmin.requireAdmin`, `apiContract/apiClause/apiNegotiation.requireEditor`, `apiLegalWatch.jobGuard`, `apiFeatureEvent.internalApiKeyMiddleware`.

- [ ] 🔴 **authMiddleware — présence de l'identité** — Header `x-user-id` requis (posé par le proxy).
  - Chemin heureux : header présent → `req.idUser`/`req.role` renseignés.
  - Cas limite : header absent → 401 « Unauthorized » ; appel direct backNode sans passer par le proxy → 401.

- [ ] 🔴 **Vérification ban à chaque requête** — `authMiddleware` interroge `isBanned` en base.
  - Chemin heureux : user non banni → `next()`.
  - Cas limite : user banni → 403 `banned:true` sur **toutes** les routes authentifiées, même avec un cookie encore valide ; erreur DB pendant le check → log mais laisse passer (⚠️ à challenger : fail-open).

- [ ] 🔴 **proxyAuthMiddleware — JWT** — Cookie `authLumenJuris` ou `Authorization: Bearer` (complément Word).
  - Chemin heureux : JWT valide → `res.locals.userId/role` + cookie rafraîchi (7 j).
  - Cas limite : JWT expiré/invalide → 401 « Token invalide ou expiré » ; ⚠️ **en `NODE_ENV != production`, absence de token = laissé passer** (POC Word) — vérifier que ce bypass n'existe pas en prod.

- [ ] 🔴 **requireAdmin** — Rôle ADMIN vérifié **en base** (pas seulement via header).
  - Chemin heureux : ADMIN → accès aux routes `/admin/*`.
  - Cas limite : rôle usurpé via header `x-user-role` mais non-admin en base → 403 ; user inexistant → 403.

- [ ] 🔴 **requireEditor** — Rôles éditeurs (ADMIN/JURISTE/USER) pour contrats/clauses/négociation.
  - Chemin heureux : éditeur → écriture autorisée.
  - Cas limite : LECTEUR → 403 « Action réservée aux éditeurs » ; ⚠️ `requireEditor` se base sur `req.role` (header) et non sur la base → tester la cohérence header/DB.

- [ ] 🔴 **jobGuard (legal-watch)** — Clé interne `x-internal-api-key` OU rôle ADMIN/JURISTE.
  - Chemin heureux : clé interne valide → job exécuté sans user ; sinon ADMIN/JURISTE via auth.
  - Cas limite : ni clé ni rôle → 403 ; clé erronée → retombe sur l'auth utilisateur.

- [ ] 🔴 **internalApiKeyMiddleware (feature-event)** — `POST /feature-event` réservé au proxy.
  - Chemin heureux : clé interne correcte → événement enregistré.
  - Cas limite : appel externe sans clé → rejet ; ⚠️ vérifier que `POST /api/feature-event` **n'est pas exposé** publiquement par le proxy.

- [ ] 🟠 **CORS** — Proxy : origines localhost/`.odns.fr` ; backNode : `HOST_PROXY` (prod) / localhost (dev), `credentials:true`.
  - Chemin heureux : origine autorisée → requête acceptée avec cookies.
  - Cas limite : origine non listée → bloquée ; requête cross-site sans `credentials` → cookie non transmis.

- [ ] 🟠 **Rate limiting global** — `globalLimiter` (100/15 min en prod), + limiters spécifiques (login 7, register 3, forgot 3, feedback 20).
  - Chemin heureux : trafic normal.
  - Cas limite : dépassement → 429 avec message ; `trust-proxy` correctement configuré pour l'IP réelle derrière le proxy.

- [ ] 🟠 **Chiffrement des documents contrats** — `apiContract.storeEncryptedPdf` (`encryptBuffer`), lecture via `/document`.
  - Chemin heureux : PDF stocké chiffré (`.pdf.enc`), déchiffré à la lecture.
  - Cas limite : clé de chiffrement absente → échec ; fichier chiffré manquant sur disque → 404.

- [ ] 🟡 **Isolation des données par utilisateur** — Contrats/clauses/historique scoping par `idUser`.
  - Chemin heureux : un user ne voit que ses données.
  - Cas limite : accès à une ressource d'un autre user par `externalId` deviné → 403/404 (à tester sur contract, negotiation, template, signature).

---

## 22 — Modules additionnels 

Fonctionnalités présentes dans le code mais hors de la liste initiale des 21 modules.

- [ ] 🟠 **Calculateur d'indemnités** — `DashboardComponents/Calculateur.tsx` (route `/calculateur`), `utils/dashboard/calculerIndemnitees.ts`. 100 % front, aucun appel API.
  - Chemin heureux : type de contrat + ancienneté + salaires + motif → indemnité légale calculée + formule applicable ; export possible.
  - Cas limite : champs non numériques filtrés (`onIntegerChange`/`onDecimalChange`) ; faute grave/lourde → 0 indemnité ; valeurs à 0 → résultat 0 ; ratio temps partiel vide → 1.

- [ ] 🟠 **Analyse de conformité (historique)** — `DashboardComponents/Conformite.tsx` (route `/conformite`), `utils/contractHistory.ts`. Réutilise l'analyse IA.
  - Chemin heureux : historique local des analyses → score de conformité (inverse du risque), niveaux Élevé/Moyen/Faible.
  - Cas limite : aucun historique → score 0/vide ; snapshot illisible → skip.

- [ ] 🟡 **Sandbox (page de test admin)** — `page/Sandbox.tsx` (route `/sandbox`, admin). Teste `classify-veille`, `veille/debug`, `insee`, login/logout.
  - Chemin heureux : outils de debug fonctionnels pour l'admin.
  - Cas limite : ⚠️ page de test — s'assurer qu'elle n'est **pas accessible en production** aux non-admins.

- [ ] 🟡 **Complément Word (add-in)** — `proxy` `POST /api/addin/login` (JWT dans le body, pas de cookie), dossier `word-addin/`.
  - Chemin heureux : login add-in → token Bearer retourné, utilisé en `Authorization`.
  - Cas limite : identifiants invalides → 401 ; compte avec 2FA → 403 (« utilisez un compte sans 2FA pour le POC ») ; token expiré après 7 j.

- [ ] 🟡 **Jurisprudence inline** — `utils/getAutomaticDecisions.ts` → `POST /jurisprudence` (Python, sans `/api`).
  - Chemin heureux : décisions de jurisprudence récupérées et résumées.
  - Cas limite : backend Python indisponible → dégradé.

---

## Routes sans interface frontend

### A — Routes backNode NON relayées par le proxy

Ces routes existent dans `backNode/src/route/*` mais **aucune route `/api/*` du proxy ne les expose**. Elles sont soit appelées directement (liens email / OAuth), soit mortes, soit internes.

| Méthode | Path backNode | Explication |
|---|---|---|
| `POST` | `/enterprise/create` | Création d'entreprise ; probablement invoquée en interne lors de l'inscription (payload `enterprise`), non exposée en direct. |
| `DELETE` | `/enterprise` | Suppression d'entreprise — **non relayée** par le proxy (seuls `GET`/`PUT /api/enterprise` le sont). Fonctionnalité inaccessible depuis le front. |
| `POST` | `/enterprise/idcc/custom` | Ajout d'une convention collective (IDCC) personnalisée — **non relayée**. |
| `DELETE` | `/enterprise/idcc/custom/:selectedIdccKey` | Suppression d'un IDCC custom — **non relayée** (et le path contient un échappement douteux `\idcc\custom` dans le source). |
| `GET` | `/user/verify/:token` | Vérification d'email — appelée **directement** par le lien reçu par email (redirections `HOST_FRONT`), pas via le proxy. |
| `GET` | `/user/resetpassword/:token` | ⚠️ Route au path **cassé** dans le source (`"\resetpassword:token"`) — probablement inaccessible. À corriger. |
| `GET` | `/auth/google` · `/auth/google/callback` | OAuth Google — `/api/google` (proxy) fait un `res.redirect` vers `/auth/google` ; le callback est appelé directement par Google (redirect_uri backNode). |
| `POST` | `/user/resend-verify` | ⚠️ **N'existe pas** côté backNode, mais le front (`VerifyAccount`) l'appelle via `fetchProxy("user/resend-verify")` (sans `/api`). **Endpoint mort** : aucun renvoi d'email réel. Bug à corriger (créer la route + le relais proxy, ou retirer l'appel front). |

### B — Routes appelées par le proxy lui-même (internes)

Déclenchées par la logique du proxy, jamais par le front directement.

| Méthode | Path backNode | Déclencheur |
|---|---|---|
| `POST` | `/feature-event` | `trackFeature()` — appelé après chaque feature IA (analyze_contract, chat, generate_contract, import_template, market_analysis, recommend_clause, detect_contract, detect_legal_refs, summarize_case, analyze_clause…). Protégé par `internalApiKeyMiddleware`. |
| `PUT` | `/llm/increment/:model/:tokenInput/:tokenOutput` | `logOpenAiTokens()` — appelé après chaque réponse Python contenant `openai_tokens`, pour comptabiliser la consommation. |
| `POST` | `/template` | `handleTemplateImport()` — sauvegarde du modèle après extraction + structuration IA. |
| `GET` | `/template/:externalId` · `/template/:externalId/playbook` | `handleTemplateGenerate()` — récupère la structure et le playbook avant génération. |
| `GET` | `/userassets/:filename` | `handleUserUploadsAsset()` — proxy binaire des assets (logos/filigranes). |

**Backend Python (FastAPI)** relayé par le proxy (endpoints internes, pas des routes backNode) : `/extract-document-text`, `/extract-contract-metadata`, `/legifrance-search`, `/classify-veille`, `/jurisprudence`, `/analyze-clause`, `/chat`, `/openai-chat`, `/openai-chat-5`, `/huggingface-generate`, `/negotiation-diff`.

### C — Recommandations de tests backend directs (Postman / curl)

Routes **relayées par le proxy mais JAMAIS appelées depuis le front** → à tester indépendamment (avec un cookie JWT valide, ou clé interne selon le cas). Priorité : vérifier auth, validation et contrat de réponse.

| Méthode | Route proxy | Test recommandé |
|---|---|---|
| `POST` | `/api/analyze-clause` | Analyse d'une clause isolée (Python). Vérifier tracking `analyze_clause` + comptage tokens. Payload `{ clause, context, model }`. |
| `POST` | `/api/detect-legal-references` | Détection de références légales dans une clause. `{ clause }` requis → 400 si absent. |
| `POST` | `/api/fetch-legal-texts` | Récupération des textes légaux. `{ refs }` requis → 400 si absent. |
| `POST` | `/api/summarize-case` | Résumé d'une décision. `{ item }` requis → 400 si absent. Tracking `summarize_case`. |
| `GET` | `/api/billing/plans` | Liste des plans depuis la base — **non consommée par le front** (plans en dur). Vérifier la cohérence tarifaire avec l'affichage `PlansPanel`. |
| `GET` | `/api/billing/credits` | Solde de crédits — non appelé par le front. Vérifier le calcul `creditIncluded + creditAdded`. |
| `POST` | `/api/clause/:externalId/use` | Incrément du compteur d'utilisation d'une clause — jamais déclenché depuis le front. Vérifier l'existence de la clause + rôle. |
| `POST` | `/api/contract/:externalId/version` | Création de version de contrat — non appelée directement (les versions passent par le module négociation). Tester rôle éditeur + validation. |
| `POST` | `/api/legal-watch/ingest` · `/enrich` · `/publish` | Étapes unitaires du pipeline de veille — le front n'appelle que `/run`. Tester chaque étape via `jobGuard` (clé interne ou ADMIN/JURISTE). |
| `PATCH` | `/api/contract/comments/:commentId/resolve` · `DELETE /api/contract/comments/:commentId` | Résolution/suppression de commentaires de contrat — vérifier si consommés par l'UI ; sinon tester rôle éditeur. |
| `GET` | `/api/llm/usage` · `/api/llm/usage/me` | Usage LLM global / personnel — `usage/users` est consommé (Overview) mais ces deux-là ne le sont pas ; tester les agrégats. |
| `GET` | `/api/veille/debug` | Endpoint de debug (utilisé seulement dans `Sandbox`) — vérifier qu'il ne fuit pas d'infos sensibles en prod. |

**Recommandations générales de tests directs :**
1. **Contrôle d'accès horizontal** — pour chaque route `/:externalId` (contract, clause, template, signature-envelope, negotiation), tester l'accès avec l'`externalId` d'un **autre utilisateur** → attendre 403/404.
2. **Élévation de privilèges** — forger les headers `x-user-id`/`x-user-role` en attaquant **directement le backNode** (port 3020, sans passer par le proxy) → vérifier que `requireAdmin` (contrôle en base) bloque, et challenger `requireEditor` (contrôle sur header uniquement).
3. **Validation des payloads** — envoyer des corps vides / malformés / hors-enum sur toutes les routes `POST`/`PATCH`/`PUT` → attendre des 400 explicites, jamais de 500.
4. **Idempotence & états** — rejouer les actions de transition (validate, resolve, archive, ban, revoke) → vérifier l'absence d'effets de bord en double.
5. **Bypass d'auth dev** — confirmer que `proxyAuthMiddleware` **ne laisse PAS passer sans token en production** (le bypass n'existe que si `NODE_ENV != production`).

---

_Fin du plan de test. Généré par audit statique du code (front / proxy / backNode / prisma). Les cas ⚠️ signalent des anomalies ou points de vigilance détectés pendant la cartographie._
