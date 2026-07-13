import { ClauseRisk, KeywordSearchLink } from "../types";
import { buildJurisprudenceQueries } from "./getAutomaticDecisions";

/**
 * Génère une liste de liens de recherche Légifrance pour une clause.
 * Réutilise les requêtes composées de la recherche hybride (type de clause +
 * mots-clés + termes du problème identifié) : les liens ciblent le problème
 * juridique, pas un mot-clé isolé souvent hors sujet.
 */
export function getKeywordSearchLinks(
  clause: ClauseRisk | null,
): KeywordSearchLink[] {
  if (!clause) return [];

  const queries = buildJurisprudenceQueries(clause);
  if (queries.length === 0) {
    console.log(
      "🟡 [Liens] Aucune requête construite pour la clause. La liste de recherche sera vide.",
    );
    return [];
  }

  return queries.map((query) => ({
    query,
    url: `https://www.legifrance.gouv.fr/search/juri?tab_selection=juri&searchField=ALL&query=${encodeURIComponent(query)}&page=1&init=true`,
  }));
}
