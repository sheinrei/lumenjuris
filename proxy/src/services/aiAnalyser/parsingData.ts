import type { ClauseRisk } from "./types.js";

export function parseAIResponse(response: string): ClauseRisk[] {
  let cleanedText = response.trim();
  if (cleanedText.startsWith("```json")) cleanedText = cleanedText.substring(7).trim();
  if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3).trim();

  try {
    const parsedResponse = JSON.parse(cleanedText);
    if (!parsedResponse.clauses || !Array.isArray(parsedResponse.clauses)) {
      return [];
    }

    const clauses: ClauseRisk[] = [];
    parsedResponse.clauses.forEach((parsed: Record<string, unknown>, index: number) => {
      // Tolérant : le prompt annonce "texte" mais l'exemple montre "text" —
      // selon la réponse du modèle, l'un ou l'autre arrive. Les index et les
      // keywords sont facultatifs (le front sait relocaliser sans eux via
      // findBestClauseSpan) : les exiger faisait rejeter TOUTES les clauses
      // de certaines réponses → « aucune clause à risque détectée » à tort.
      const content = (parsed.text ?? parsed.texte) as string | undefined;
      const riskScore = Number(parsed.riskScore);
      if (parsed.type && content && Number.isFinite(riskScore)) {
        clauses.push({
          id: `ai-clause-${Date.now()}-${index}`,
          type: parsed.type as string,
          content,
          riskScore: Math.min(5, Math.max(1, riskScore)),
          category: mapTypeToCategory(parsed.type as string),
          justification: (parsed.justification as string) || "Clause identifiée par IA",
          suggestion: (parsed.suggestion as string) || "Révision recommandée",
          page: 1,
          keywords: Array.isArray(parsed.keywords) ? (parsed.keywords as string[]) : [],
          startIndex: typeof parsed.startIndex === "number" ? parsed.startIndex : undefined,
          endIndex: typeof parsed.endIndex === "number" ? parsed.endIndex : undefined,
        });
      }
    });

    return clauses;
  } catch {
    return [];
  }
}

function mapTypeToCategory(
  type: string,
): ClauseRisk["category"] {
  const typeMap: Record<string, ClauseRisk["category"]> = {
    résiliation: "termination",
    pénalité: "penalty",
    responsabilité: "responsibility",
    confidentialité: "confidentiality",
    "non-concurrence": "nonCompete",
    garantie: "warranty",
  };
  const normalized = type.toLowerCase();
  for (const [key, category] of Object.entries(typeMap)) {
    if (normalized.includes(key)) return category;
  }
  return "other";
}
