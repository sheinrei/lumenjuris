import { ClauseRisk } from "./types";

/* global Word, Office */

/**
 * Intégration document Word : lecture du texte, surlignage des clauses à
 * risque (équivalent du surlignage du DocumentViewer de la plateforme),
 * navigation vers une clause, et application d'une recommandation en suivi
 * des modifications.
 *
 * Ancrage : chaque clause localisée est enveloppée dans un content control
 * tagué `lumen-risk-<id>` — on retrouve ainsi la clause de façon stable même
 * si le document bouge (équivalent Word du findBestClauseSpan du front).
 */

const RISK_TAG_PREFIX = "lumen-risk-";

/** Couleur de surlignage selon le score (aligné sur le code couleur plateforme). */
const highlightFor = (riskScore: number): string =>
  riskScore >= 4 ? "#FCA5A5" : riskScore >= 3 ? "#FDBA74" : "#FDE68A";

const supportsTracking = (): boolean =>
  Office.context.requirements.isSetSupported("WordApi", "1.4");

/** Texte complet du document (envoyé à l'analyseur, comme le PDF sur la plateforme). */
export async function getDocumentText(): Promise<string> {
  let text = "";
  await Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    text = body.text;
  });
  return text;
}

/**
 * Fragments de recherche pour localiser la clause dans le document.
 * Contraintes de l'API search de Word :
 *  - ~255 caractères max ;
 *  - ne matche PAS au-delà d'une marque de paragraphe → on reste sur la
 *    première ligne de la clause ;
 *  - le texte IA diffère souvent du document sur la ponctuation (apostrophes
 *    droites vs typographiques, « » vs "") → recherche avec ignorePunct + un
 *    fragment de repli sans ponctuation (équivalent Word du findBestClauseSpan
 *    de la plateforme).
 */
function searchSnippets(content: string): string[] {
  const firstLine =
    content
      .split(/[\r\n]+/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .find((l) => l.length >= 15) ?? content.replace(/\s+/g, " ").trim();

  const cap = (text: string, max: number): string => {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  };

  const snippets: string[] = [];
  const push = (s: string) => {
    const capped = cap(s, 150);
    if (capped.length >= 10 && !snippets.includes(capped)) snippets.push(capped);
  };

  // 1. Début de la clause.
  push(firstLine);

  // 2. Les deux plus longs segments sans AUCUNE ponctuation ambiguë
  // (apostrophes, guillemets, tirets…) — insensibles aux différences typographiques.
  const segments = firstLine
    .split(/[«»"“”'’‘`–—…()\[\]]/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 20)
    .sort((a, b) => b.length - a.length);
  segments.slice(0, 2).forEach(push);

  // 3. Fragment décalé (mots 4 à 18) : utile quand l'IA a reformulé le tout
  // début de la clause (« Le présent contrat… » vs le texte réel du document).
  const words = firstLine.split(" ");
  if (words.length >= 8) push(words.slice(3, 18).join(" "));

  return snippets.slice(0, 4);
}

export interface HighlightReport {
  located: string[]; // ids localisés et surlignés
  missing: string[]; // ids introuvables dans le document
}

/**
 * Surligne toutes les clauses à risque dans le document et les ancre dans des
 * content controls. Idempotent : réinitialise d'abord les anciens ancrages.
 */
export async function highlightClauses(clauses: ClauseRisk[]): Promise<HighlightReport> {
  const report: HighlightReport = { located: [], missing: [] };

  await clearHighlights();

  await Word.run(async (context) => {
    // Phase 1 — TOUTES les recherches (primaire + repli, pour toutes les
    // clauses) sont mises en file puis résolues en UNE seule passe réseau :
    // sur Word web, chaque context.sync() est un aller-retour serveur, c'est
    // le principal poste de latence du surlignage.
    const pending = clauses.map((clause) => ({
      clause,
      searches: searchSnippets(clause.content).map((snippet) => {
        const results = context.document.body.search(snippet, {
          ignoreSpace: true,
          ignorePunct: true,
          matchCase: false,
        });
        results.load("items");
        return results;
      }),
    }));
    await context.sync();

    // Phase 2 — ancrage + surlignage. Chaque clause reste isolée (un content
    // control qui échoue, ex. chevauchement, n'interrompt pas les autres).
    for (const { clause, searches } of pending) {
      try {
        const hit = searches.find((results) => results.items.length > 0);
        if (!hit) {
          report.missing.push(clause.id);
          continue;
        }

        // Une seule occurrence attendue ; sinon on prend la première.
        const range = hit.items[0];
        const control = range.insertContentControl();
        control.tag = `${RISK_TAG_PREFIX}${clause.id}`;
        control.title = `⚠ ${clause.type.slice(0, 60)} (${clause.riskScore}/5)`;
        control.appearance = Word.ContentControlAppearance.boundingBox;
        control.color = clause.riskScore >= 4 ? "#DC2626" : "#D97706";
        range.font.highlightColor = highlightFor(clause.riskScore);
        await context.sync();

        report.located.push(clause.id);
      } catch {
        report.missing.push(clause.id);
      }
    }
  });

  return report;
}

/** Supprime tous les surlignages/ancrages issus d'une analyse précédente. */
export async function clearHighlights(): Promise<void> {
  await Word.run(async (context) => {
    const controls = context.document.contentControls;
    controls.load("items/tag");
    await context.sync();

    for (const control of controls.items) {
      if (control.tag && control.tag.startsWith(RISK_TAG_PREFIX)) {
        control.getRange(Word.RangeLocation.whole).font.highlightColor = null as unknown as string;
        control.delete(true); // true = conserver le contenu
      }
    }
    await context.sync();
  });
}

/** Sélectionne la clause dans le document (scroll + focus). */
export async function selectClause(clauseId: string): Promise<boolean> {
  let found = false;
  await Word.run(async (context) => {
    const controls = context.document.contentControls.getByTag(`${RISK_TAG_PREFIX}${clauseId}`);
    controls.load("items");
    await context.sync();
    if (controls.items.length > 0) {
      controls.items[0].select();
      await context.sync();
      found = true;
    }
  });
  return found;
}

export interface ApplyResult {
  applied: boolean;
  tracked: boolean;
}

/**
 * Remplace le texte de la clause (ancrée par son content control) par la
 * clause recommandée, EN SUIVI DES MODIFICATIONS : le juriste accepte ou
 * rejette la révision dans Word. Le mode de suivi initial est restauré.
 */
export async function applyRecommendationTracked(clauseId: string, newText: string): Promise<ApplyResult> {
  const tracked = supportsTracking();
  let applied = false;

  await Word.run(async (context) => {
    const doc = context.document;
    let previousMode: string | undefined;

    if (tracked) {
      doc.load("changeTrackingMode");
      await context.sync();
      previousMode = doc.changeTrackingMode;
      doc.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
    }

    const controls = doc.contentControls.getByTag(`${RISK_TAG_PREFIX}${clauseId}`);
    controls.load("items");
    await context.sync();

    if (controls.items.length > 0) {
      const control = controls.items[0];
      const range = control.getRange(Word.RangeLocation.whole);
      range.font.highlightColor = null as unknown as string;
      control.insertText(newText, Word.InsertLocation.replace);
      control.select();
      applied = true;
      await context.sync();
    }

    if (tracked && previousMode && previousMode !== Word.ChangeTrackingMode.trackAll) {
      doc.changeTrackingMode = previousMode as Word.ChangeTrackingMode;
      await context.sync();
    }
  });

  return { applied, tracked };
}
