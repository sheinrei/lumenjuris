# Lumen Juris — Complément Word (Assistant Contrats)

Complément Office (task pane) pour Word permettant aux juristes de générer et adapter des contrats directement dans leur document. POC généré à partir du template officiel **Office Add-in Task Pane React (TypeScript)** via `yo office`.

> ⚠️ **Port 3001** : le port 3000 est déjà utilisé par le proxy LumenJuris (`lumenjuris/proxy`). Le complément tourne donc sur **https://localhost:3001** (manifest, webpack et docs alignés) pour cohabiter avec la plateforme.

## Fonctionnalités

Réplique de l'outil **« Analyse des risques »** du dashboard LumenJuris, connectée au document Word (le document ouvert remplace le glisser-déposer de PDF) et branchée sur le **vrai backend** de la plateforme :

1. **Connexion** avec les identifiants LumenJuris (JWT renvoyé par la nouvelle route proxy `POST /api/addin/login`, passé ensuite en `Authorization: Bearer`).
2. **Analyser le document** : le texte du document Word est envoyé à `POST /api/analyze-contract` (même analyse IA que la plateforme) → liste de clauses à risque (`ClauseRisk[]`).
3. **Surlignage dans Word** : chaque clause localisée est surlignée (jaune/orange/rouge selon le score) et ancrée dans un content control `lumen-risk-<id>` ; « 📍 Voir dans le document » sélectionne la clause.
4. **Fiche détail** (reprise de la fenêtre modale `EnhancedClauseDetail`) : onglets **Aperçu** (texte, ⚠️ problèmes via `/api/openai-chat-5`, 💡 recommandations via `/api/recommend-clause`), **Jurisprudence** (`/api/jurisprudence`, recherche hybride Judilibre) et **Question** (question libre sur la clause).
5. **Suivi des modifications** : « Appliquer dans le document (révision) » remplace la clause d'origine par la clause recommandée en *tracked change* — le juriste accepte ou rejette dans l'onglet Révision de Word. Le mode de suivi initial de l'utilisateur est restauré.

### Modifications apportées au proxy LumenJuris (rétrocompatibles)

- CORS : ajout de `https://localhost:*` (le complément est servi en HTTPS).
- `proxyAuthMiddleware` : accepte `Authorization: Bearer <jwt>` en plus du cookie (l'iframe Word ne transmet pas le cookie httpOnly cross-site).
- Nouvelle route publique `POST /api/addin/login` : relaye le login backNode et renvoie le JWT dans le corps.

> **Le proxy doit être redémarré** après ces modifications (relancer `DEMARRER.bat` ou la fenêtre proxy) et la plateforme complète doit tourner (proxy 3000, backNode 3020, Python 5678).

## Structure du projet

```
word-addin/
├── manifest.xml                  # Manifest Word, prêt à sideloader (localhost:3001)
├── package.json
├── webpack.config.js             # Dev server HTTPS (certificats office-addin-dev-certs)
├── assets/                       # Icônes 16/32/64/80 (placeholders à rebrander)
└── src/
    ├── commands/                 # FunctionFile (commandes de ruban)
    └── taskpane/
        ├── taskpane.html         # Volet + styles identité Lumen Juris
        ├── index.tsx
        ├── components/
        │   ├── App.tsx           # Login → analyse → liste des clauses
        │   ├── ClauseList.tsx    # Liste des clauses à risque (≈ ClausesSidebar)
        │   ├── ClauseDetail.tsx  # Fiche détail (≈ modale EnhancedClauseDetail)
        │   ├── Header.tsx        # Logo Lumen Juris
        │   └── StatusMessage.tsx
        └── core/
            ├── types.ts          # Types plateforme (ClauseRisk, ClauseAI…)
            ├── lumenService.ts   # Client des endpoints proxy LumenJuris
            └── wordDocument.ts   # Office.js : texte, surlignage, tracked changes
```

## Prérequis

- Node.js ≥ 18 et npm
- Un compte Microsoft 365 avec accès à Word pour le web (ou Word desktop Microsoft 365)

## Commandes

```bash
cd word-addin
npm install          # installer les dépendances
npm run dev-server   # serveur de dev HTTPS sur https://localhost:3001
```

Au **premier lancement**, `office-addin-dev-certs` installe un certificat de développement local (boîte de dialogue Windows possible) : **acceptez**, sinon Word refusera de charger le volet (HTTPS non approuvé).

Autres commandes utiles :

```bash
npm run validate     # valider manifest.xml
npm start            # lancer le serveur ET sideloader dans Word desktop (debug auto)
npm run stop         # arrêter le debug desktop
npm run build        # build de production dans dist/
```

## Tester dans Word pour le web (sideloading), étape par étape

1. **Lancer le serveur** :
   ```bash
   npm run dev-server
   ```
   Attendre `compiled successfully`, puis vérifier dans un navigateur que `https://localhost:3001/taskpane.html` s'affiche (accepter le certificat si demandé).

2. **Ouvrir un document** sur [https://word.cloud.microsoft](https://word.cloud.microsoft) (ou Word via microsoft365.com) — créer un document vierge.

3. **Uploader le manifest** : dans le ruban, onglet **Accueil → Compléments** (ou **Insertion → Compléments** selon l'interface) → **Compléments avancés / More add-ins** → onglet **Mes compléments / My Add-ins** → **Charger mon complément / Upload My Add-in** → **Parcourir** → sélectionner `word-addin/manifest.xml` → **Charger**.

4. **Ouvrir le volet** : un bouton **« Assistant Contrats »** (groupe *Lumen Juris*) apparaît dans l'onglet Accueil du ruban → cliquer pour afficher le volet.

5. **Tester** (la plateforme LumenJuris doit tourner : proxy 3000 redémarré, backNode 3020, Python 5678) :
   - Se connecter avec ses identifiants LumenJuris.
   - Coller/ouvrir un contrat dans le document Word → choisir type de contrat et rôle → « 🔍 Analyser le document ».
   - Les clauses à risque sont surlignées dans le document ; cliquer sur une carte → fiche détail (problèmes, recommandations, jurisprudence, question).
   - « Appliquer dans le document (révision) » → la clause est remplacée en **suivi des modifications** ; accepter/rejeter via l'onglet **Révision** de Word.

> Le sideload est **par document/session** : si le bouton disparaît après fermeture, re-uploader le manifest (étape 3).

## Limites connues du POC

- **Suivi des modifications** : l'activation programmatique (`document.changeTrackingMode`) requiert **WordApi 1.4** (Word web ✅, Word Windows/Mac Microsoft 365 récents ✅). Sur un hôte plus ancien, le remplacement se fait sans révision et un avertissement invite à activer manuellement *Révision > Suivi des modifications*. Le mode initial est restauré après insertion.
- **Localisation des clauses** : l'API `search` de Word est limitée à ~255 caractères → on recherche un préfixe distinctif de chaque clause (espaces normalisés). Si l'IA a reformulé le texte de la clause, elle peut être « non localisée » : elle reste analysable dans le volet mais sans surlignage.
- **Plateforme requise** : le complément consomme le proxy local (`http://localhost:3000`) ; toute la stack LumenJuris doit tourner. Comptes avec **2FA non supportés** par `POST /api/addin/login` (POC).
- Icônes = placeholders du template officiel, à remplacer par les icônes Lumen Juris.
