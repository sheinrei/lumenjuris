import { ClauseRisk, JurisprudenceCase } from "../types";
import { fetchProxy } from "./fetchProxy";

/**
 * Appelle la route /jurisprudence du backend Python (recherche hybride) :
 * plusieurs requêtes lexicales complémentaires + un contexte sémantique
 * (clause + problème juridique) utilisé pour re-classer les décisions.
 */
async function fetchDecisionsFromBackend(
  queries: string[],
  context: string,
): Promise<JurisprudenceCase[] | null> {
  try {
    console.log(`🚀 [API Auto] Recherche hybride avec ${queries.length} requêtes:`, queries);
    const response = await fetchProxy(`/jurisprudence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries, context }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Le backend a répondu avec le statut ${response.status}: ${errorText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("❌ [API Auto] Échec de l'appel au backend:", error);
    return null;
  }
}

/** Petits mots vides à écarter des requêtes construites depuis la justification. */
const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "d'un", "d'une", "et", "ou",
  "en", "au", "aux", "ce", "cette", "ces", "qui", "que", "dont", "pour", "par",
  "sur", "dans", "avec", "sans", "est", "sont", "être", "peut", "il", "elle",
  "ne", "pas", "plus", "très", "son", "sa", "ses", "leur", "leurs", "cela",
  "clause", "contrat", "risque", "juridique",
]);

/** Extrait les termes significatifs d'un texte (pour requête lexicale). */
function significantTerms(text: string, max: number): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, max);
}

/**
 * Construit jusqu'à 3 requêtes complémentaires pour maximiser le rappel :
 *  1. type de clause + premiers mots-clés (l'angle « qualification »)
 *  2. mots-clés restants (l'angle « vocabulaire de la clause »)
 *  3. termes significatifs du problème identifié (l'angle « litige »)
 */
export function buildJurisprudenceQueries(clause: ClauseRisk): string[] {
  const kw = (clause.keywords ?? []).filter(Boolean);
  const queries: string[] = [];

  const q1 = [clause.type, ...kw.slice(0, 2)].filter(Boolean).join(" ").trim();
  if (q1) queries.push(q1);

  const q2 = kw.slice(1, 5).join(" ").trim();
  if (q2 && q2 !== q1) queries.push(q2);

  const q3 = [clause.type, ...significantTerms(clause.justification, 4)].join(" ").trim();
  if (q3 && !queries.includes(q3)) queries.push(q3);

  return queries.slice(0, 3);
}

/** Contexte sémantique transmis au backend pour le re-classement. */
export function buildJurisprudenceContext(clause: ClauseRisk): string {
  const ref = Array.isArray(clause.legalReference)
    ? clause.legalReference.join(", ")
    : clause.legalReference;
  return [
    `Type de clause : ${clause.type}.`,
    `Problème juridique identifié : ${clause.justification}`,
    ref ? `Références légales : ${ref}.` : "",
    `Clause : ${clause.content.slice(0, 800)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Transforme la réponse de l'API en notre format interne (JurisprudenceCase).
 * NOTE: Cette fonction n'est plus strictement nécessaire si le backend retourne déjà le bon format,
 * mais nous la gardons pour valider et nettoyer les données.
 */
function mapApiResponseToJurisprudence(
  apiResponse: any[],
): JurisprudenceCase[] {
  if (!Array.isArray(apiResponse)) {
    return [];
  }
  return apiResponse.map((item: any) => ({
    id: item.url || `case-${Math.random()}`,
    title: item.title || "", // Laisser vide, le composant gérera le fallback
    url: item.url,
    summary: item.summary || "",
    court: item.court || "", // Laisser vide, le composant gérera l'affichage
    year: item.year,
    relevanceScore: item.relevanceScore || 0.8,
    citation: item.citation,
    date: item.date,
    keyPrinciples: item.keyPrinciples,
    litige: item.litige,
    resultat: item.resultat,
  }));
}

/**
 * Fonction principale qui récupère les décisions de jurisprudence pertinentes
 * de manière automatique pour une clause donnée (recherche hybride : rappel
 * lexical multi-requêtes + re-classement sémantique côté backend).
 */
export async function getAutomaticDecisions(
  clause: ClauseRisk | null,
): Promise<JurisprudenceCase[]> {
  if (!clause) return [];

  const queries = buildJurisprudenceQueries(clause);
  if (queries.length === 0) return [];

  const apiResponse = await fetchDecisionsFromBackend(
    queries,
    buildJurisprudenceContext(clause),
  );

  if (apiResponse) {
    const cases = mapApiResponseToJurisprudence(apiResponse);
    if (cases.length > 0) {
      console.log(
        `✅ [API Auto] ${cases.length} décisions pertinentes reçues du backend.`,
      );
    }
    return cases;
  }

  return [];
}
