# Module Veille Juridique (`legal_watch`)

Veille juridique en deux registres :

1. **Alertes ciblées** — quand une décision de la Cour de cassation touche un
   concept juridique présent dans les contrats d'un utilisateur, une alerte
   liste SES contrats concernés avec lien direct.
2. **Digest éditorial** — condensé des évolutions marquantes, consultable par
   tous dans l'onglet Veille.

**Positionnement non négociable** : la veille détecte et priorise, elle ne
constitue jamais un avis juridique. Chaque carte porte la mention
« Détection automatisée — à valider par un professionnel du droit ».

## Architecture

```
┌─ front (React) ── /veille, onglet « Alertes & jurisprudence »
│     │ /api/legal-watch/*  (proxy :3000, JWT cookie → x-user-id)
┌─ backNode (:3020) ────────────────────────────────────────────────┐
│  route/apiLegalWatch.ts     — REST + jobs (ingest/enrich/publish) │
│  services/legalWatch/       — pipeline, persistance, matching     │
│  prisma : LegalWatchSource, LegalWatchItem, LegalConceptMapping,  │
│           LegalWatchAlert                                         │
└──────┬────────────────────────────────────────────────────────────┘
       │ POST /legal-watch/fetch | /legal-watch/enrich  (PYTHON_URL)
┌─ back Python (:5678) — STATELESS (aucun accès base) ──────────────┐
│  legal_watch/judilibre_client.py — PISTE/Judilibre (OAuth2/KeyId) │
│  legal_watch/enrichment.py       — LLM, liste fermée, Pydantic    │
│  legal_watch/evals/              — evals Promptfoo (brique LLM)   │
└───────────────────────────────────────────────────────────────────┘
```

Cycle de vie d'un item : `INGESTED → ENRICHED → PUBLISHED` (ou `DISCARDED`
si hors périmètre, `ERROR` si l'enrichissement échoue après retry).

Toute la chaîne est **idempotente** : dédup par SHA-256 du texte intégral
(`contentHash` unique) + `(sourceId, providerId)` unique ; alertes protégées
par la contrainte unique `(itemId, userId)`.

## Accès PISTE / Judilibre

1. Créer un compte sur <https://piste.gouv.fr> et souscrire à l'API
   **Judilibre** (catalogue DILA / Cour de cassation).
2. Deux modes d'authentification supportés :
   - **OAuth2 client_credentials** (déjà utilisé par le projet) :
     `JUDI_CLIENT_ID` + `JUDI_CLIENT_SECRET` dans `back/.env` ;
   - **Clé API** (header `KeyId`) : `JUDILIBRE_API_KEY` dans `back/.env`
     (prioritaire si présente).
3. Endpoint par défaut : `https://api.piste.gouv.fr/cassation/judilibre/v1.0`
   (surchargeable via `JUDILIBRE_SEARCH_ENDPOINT` — utile pour la sandbox
   `https://sandbox-api.piste.gouv.fr/cassation/judilibre/v1.0`).

Variables optionnelles : `LEGAL_WATCH_ENRICH_MODEL` (défaut `gpt-4o-mini`),
`INTERNAL_API_KEY` (si définie côté Python, les endpoints exigent le header
`x-internal-api-key` — backNode l'envoie automatiquement).

Côté backNode : `PYTHON_URL` (défaut `http://localhost:5678`),
`LEGAL_WATCH_MAX_DECISIONS` (défaut 50), `LEGAL_WATCH_ENRICH_BATCH`
(défaut 10), `LEGAL_WATCH_ENRICH_MAX` (défaut 100 par run).

## Lancer manuellement

```powershell
# 0. Une fois : tables + taxonomie (depuis backNode/)
npx prisma db push ; npx prisma generate
npm run seed:legalwatch

# 1. Pipeline complet (Node appelle Python — les deux serveurs démarrés)
#    Via l'API (rôle ADMIN/JURISTE, ou header x-internal-api-key pour un cron) :
curl -X POST http://localhost:3000/api/legal-watch/run --cookie "authToken=..."
#    ou étape par étape : /api/legal-watch/ingest, /enrich, /publish

# 2. Ou en script (utile en dev, plafonné à 5 décisions) :
$env:LEGAL_WATCH_MAX_DECISIONS = "5" ; npx tsx tests/legalWatch.e2e.ts 1
```

Chaque run journalise `récupérées / insérées / skippées / erreurs`.
Un cron quotidien peut appeler `POST /legal-watch/run` sur backNode avec le
header `x-internal-api-key: $INTERNAL_API_KEY`.

## Tests

```powershell
# Node : dédup par hash + matching (backNode/)
npm run test:legalwatch

# Python : parsing/validation stricte de la sortie LLM (lumenjuris/)
.\back\venv\Scripts\python.exe -m back.legal_watch.tests.test_validation

# Evals Promptfoo de l'enrichissement (lumenjuris/, OPENAI_API_KEY requis)
npx promptfoo@latest eval -c back/legal_watch/evals/promptfooconfig.yaml
npx promptfoo@latest view
```

Les evals testent LE prompt de production (`enrichment.build_prompt`) :
détection des concepts, respect de la liste fermée, format JSON, calibrage
de l'`impactLevel`, formulation prudente du résumé.

## Ajouter un concept à la taxonomie

1. Ajouter l'entrée dans `backNode/prisma/seedLegalWatch.ts` :
   `concept` (snake_case stable), `label`, `legalDomain`, `keywords`
   (expressions servant aux requêtes Judilibre ET d'indices pour le LLM),
   `contractTypes` (clés de modèles, ex. `cdd_accroissement`).
2. Si le concept vise un NOUVEAU type de modèle : ajouter la clé et ses
   motifs de reconnaissance dans `CONTRACT_TYPE_PATTERNS`
   (`backNode/src/services/legalWatch/matching.ts`) — c'est le pont entre
   la clé de modèle et le texte libre `Contract.contractType`.
3. `npm run seed:legalwatch` (upsert, relançable).
4. Refléter le libellé côté front (`CONCEPT_LABELS` dans
   `front/src/components/DashboardComponents/veille/LegalWatchSection.tsx`)
   et dans la fixture des evals (`back/legal_watch/evals/prompt.py`).
5. Ajouter un cas d'eval Promptfoo couvrant le nouveau concept.

## Sources

- **Judilibre** (Cour de cassation, chambre sociale) — active par défaut.
- **Légifrance** (LODA : lois, décrets, arrêtés) — présente, **désactivée par
  défaut**. L'utilisateur l'active depuis l'onglet Paramètres (ou
  `PATCH /legal-watch/sources/legifrance {isActive:true}`). Client
  `legal_watch/legifrance_client.py` : recherche LODA_DATE filtrée par date +
  `/consult/jorf` pour le corps du texte ; passe par le même pipeline
  INGESTED→ENRICHED→PUBLISHED que Judilibre. Le prompt d'enrichissement couvre
  décisions ET textes officiels.

`runIngest` (Node) itère sur **toutes les sources actives** ; une source en
échec (API indisponible) ne bloque pas les autres.

## Phases suivantes (architecture prête, non implémenté)

- **Matching par clause** : remplacer `matchContractsForItem()`
  (fonction isolée, seule interface avec le pipeline) par une analyse des
  clauses (ocrText / bibliothèque de clauses). Rien d'autre à toucher.
- **Notifications email** : brancher un envoi (nodemailer, déjà en
  dépendance) à la création d'une `LegalWatchAlert` dans `runPublish()` ;
  préférence d'opt-in à ajouter dans `UserPreference`.
