export function parseAIResponse(response) {
    let cleanedText = response.trim();
    if (cleanedText.startsWith("```json"))
        cleanedText = cleanedText.substring(7).trim();
    if (cleanedText.endsWith("```"))
        cleanedText = cleanedText.slice(0, -3).trim();
    try {
        const parsedResponse = JSON.parse(cleanedText);
        if (!parsedResponse.clauses || !Array.isArray(parsedResponse.clauses)) {
            return [];
        }
        const clauses = [];
        parsedResponse.clauses.forEach((parsed, index) => {
            // Tolérant : le prompt annonce "texte" mais l'exemple montre "text" —
            // selon la réponse du modèle, l'un ou l'autre arrive. Les index et les
            // keywords sont facultatifs (le front sait relocaliser sans eux via
            // findBestClauseSpan) : les exiger faisait rejeter TOUTES les clauses
            // de certaines réponses → « aucune clause à risque détectée » à tort.
            const content = (parsed.text ?? parsed.texte);
            const riskScore = Number(parsed.riskScore);
            if (parsed.type && content && Number.isFinite(riskScore)) {
                clauses.push({
                    id: `ai-clause-${Date.now()}-${index}`,
                    type: parsed.type,
                    content,
                    riskScore: Math.min(5, Math.max(1, riskScore)),
                    category: mapTypeToCategory(parsed.type),
                    justification: parsed.justification || "Clause identifiée par IA",
                    suggestion: parsed.suggestion || "Révision recommandée",
                    page: 1,
                    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
                    startIndex: typeof parsed.startIndex === "number" ? parsed.startIndex : undefined,
                    endIndex: typeof parsed.endIndex === "number" ? parsed.endIndex : undefined,
                });
            }
        });
        return clauses;
    }
    catch {
        return [];
    }
}
function mapTypeToCategory(type) {
    const typeMap = {
        résiliation: "termination",
        pénalité: "penalty",
        responsabilité: "responsibility",
        confidentialité: "confidentiality",
        "non-concurrence": "nonCompete",
        garantie: "warranty",
    };
    const normalized = type.toLowerCase();
    for (const [key, category] of Object.entries(typeMap)) {
        if (normalized.includes(key))
            return category;
    }
    return "other";
}
