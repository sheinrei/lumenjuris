/* eslint-disable no-console */
import type { ClauseRisk } from "../services/aiAnalyser/types.js";
import { callOpenAI } from "../utils/openaiClient.js";

export interface MissingClause {
  nom: string;
  importance: "obligatoire" | "recommandé" | "utile";
  explicationAbsence: string;
  standardMarche: string;
  titreSuggestion: string;
  corpsSuggestion: string;
  priorite: "critique" | "important" | "mineur";
  detectedFormat: "ArticleX" | "ARTICLE X" | "NumericOnly" | "Roman" | "None";
  prefixTemplate: string;
  suffixTemplate: string;
  lastNumberType: "arabic" | "roman" | "letters" | "words" | "none";
  lastNumberValue: number;
  nextArticleHeader: string;
  clauseSize: number;
  anchorText: string;
}

export interface MarketDeviation {
  clause: string;
  votreContrat: string;
  standard: string;
  ecart: "favorable" | "défavorable" | "neutre";
  recommandation: string;
  impact: "faible" | "moyen" | "élevé";
}

export interface ContextualQuestion {
  question: string;
  contexte: string;
  urgence: "haute" | "moyenne" | "basse";
  categorie: "risque" | "manque" | "clarification" | "negociation";
}

export interface MarketAnalysisResult {
  clausesManquantes: MissingClause[];
  ecartAuxStandards: MarketDeviation[];
  questionsProposees: ContextualQuestion[];
  scoreConformite: number;
}

export async function detectMissingClauses(
  contractText: string,
  contractType: string,
  existingClauses: string[],
): Promise<{ clausesManquantes: MissingClause[] }> {
  const contractExcerpt = contractText
    ? `${contractText.substring(0, 3000)}\n\n[...]\n\n${contractText.slice(-4000)}`
    : "";

  const prompt = `Tu es un expert juridique senior spécialisé dans l'analyse de ${contractType}.
Ta mission est d'identifier UNIQUEMENT les clauses ABSENTES mais ESSENTIELLES.

CONTEXTE:
- Type de contrat: ${contractType}
- Clauses déjà présentes dans le contrat: ${existingClauses.join(", ")}

INSTRUCTIONS CRITIQUES:
1. Compare ce contrat aux STANDARDS DU MARCHÉ pour ce type précis
2. Identifie les clauses qui MANQUENT mais qui devraient être présentes
3. Base-toi sur:
   - La législation français applicable en vigueur
   - Les usages du secteur
   - La jurisprudence récente
   - Les bonnes pratiques contractuelles

CRITÈRES DE SÉLECTION:
- Clauses OBLIGATOIRES par la loi
- Clauses RECOMMANDÉES par les standards du marché
- Clauses UTILES pour protéger les intérêts


 INSTRUCTIONS POUR L'ANALYSE DE STRUCTURE (CRITIQUE) :
 
 Le but est de trouver le point d'insertion exact pour ajouter de nouveaux éléments APRÈS le dernier paragraphe ou article de fond, et AVANT toute formule de clôture ou bloc de signature. Tu dois t'adapter à TOUT type d'acte (formel, informel, anglo-saxon, acte sous seing privé, CGV, avenant, etc.).
 
 1. Repère la ZONE DE CLÔTURE : Identifie l'emplacement exact des mentions comme "Fait à", "Fait en autant d'exemplaires", "Signé le", "En foi de quoi", "Lu et approuvé", "Fait pour valoir ce que de droit", ou le bloc de signatures. Tout ce qui est dans cette zone ou en dessous ne doit pas être modifié.
 2. Identifie le DERNIER ÉLÉMENT SUBSTANTIEL : Trouve le tout dernier paragraphe, article ou clause de fond situé juste AVANT cette zone de clôture.
 Pour chaque clause dans "clausesManquantes", remplis également ces règles agnostiques et structurelles directement dans l'objet de la clause :
 "detectedFormat" : Le style ou modèle textuel du titre. Choisis STRICTEMENT parmi : "ArticleX", "ARTICLE X", "NumericOnly" (si juste un chiffre comme 1. ou 12-), "Roman", ou "None" (si pas de numérotation).
 "prefixTemplate" : Le texte exact qui précède le numéro dans le titre. Ex: "Article " (avec l'espace), "Art. " ou "" (chaîne vide si le format est NumericOnly).
 "suffixTemplate" : La ponctuation ou les caractères qui suivent immédiatement le numéro dans le titre. Ex: "." (pour 1.), " -" (pour ARTICLE 1 -), ou "" (chaîne vide s'il n'y a rien).
 "lastNumberType" : "arabic" (1, 2...), "roman" (I, II...), "letters" (A, B...), "words" (Un, Deux...) ou "none".
 "lastNumberValue" : Valeur numérique entière (Int) du tout dernier élément détecté RÉELLEMENT PRÉSENT dans le "Contrat à analyser" (ex: 13). Cette valeur DOIT être STRICTEMENT la même pour TOUTES les clauses du tableau "clausesManquantes", car elles se basent toutes sur le même état initial du contrat. Convertis en entier si c'est du romain ou du texte (ex: XIV ou Quatorze devient 14). Mets 0 si "none".
 "nextArticleHeader" : Le titre exact et complet que devra porter ce nouvel élément s'il était inséré immédiatement. Tu dois le construire en combinant prefixTemplate + (lastNumberValue + 1) + suffixTemplate. Exemple : si le dernier présent dans le contrat est "13.", le prochain DOIT être "14.". Attention : toutes les clauses générées dans cette réponse doivent proposer le MÊME numéro d'article suivant (ex: elles réclament TOUTES le numéro 14), car elles partagent le même point d'insertion initial.
 "clauseSize" : Le nombre de caractères de la clause à ajouter (longueur de "suggestionAjout").
 "anchorText" : Le texte exact (sensible à la casse et à la ponctuation) des 3 à 5 premiers mots de la formule de clôture ou du bloc de signatures (ex: "Fait à", "En foi de quoi", "Fait en autant d'exemplaires") présent TOUT À LA FIN du contrat permettant d'injecter la clause manquante juste avant ce bloc. ATTENTION : Ce texte doit exister mot pour mot dans le "Contrat à analyser". Si tu ne trouves aucun bloc de clôture ou si le texte s'arrête brusquement, renvoie STRICTEMENT une chaîne vide "".

FORMAT DE RÉPONSE JSON:
 {
   "clausesManquantes": [
     {
       "nom": "Nom de la clause manquante",
       "importance": "obligatoire|recommandé|utile",
       "priorite": "critique|important|mineur",
       "explicationAbsence": "Pourquoi cette clause est nécessaire",
       "standardMarche": "Ce que prévoit habituellement le marché pour cette clause",
       "titreSuggestion": "Le titre seul de la clause (ex: PROTECTION DES DONNEES, Confidentialité, etc.). ATTENTION : Respecte scrupuleusement le style du contrat à analyser : n'écris PAS en majuscules si les titres du contrat original utilisent des minuscules et au contraire utilise des MAJUSCULES si les titres du contrat le sont.",
       "corpsSuggestion": "Le texte complet de la clause, sans répéter le titre, prêt à l'emploi",
       "detectedFormat": "ArticleX",
       "prefixTemplate": "Article ",
       "suffixTemplate": "",
       "lastNumberType": "arabic",
       "lastNumberValue": 13,
       "nextArticleHeader": "Article 14",
       "clauseSize": 200,
       "anchorText": "..."
     }
   ],
 }

Contrat à analyser:
"""
${contractExcerpt}
"""

Réponds UNIQUEMENT avec le JSON complet et valide.`;

  try {
    const txt = await callOpenAI([{ role: "user", content: prompt }], {
      model: "gpt-4o",
      temperature: 0.15,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(txt);
    console.log(result)
    return {
      clausesManquantes: result.clausesManquantes || [],
    };
  } catch (error) {
    console.error(
      "❌ Erreur lors de la détection des clauses manquantes:",
      error,
    );
    return {
      clausesManquantes: [],
    };
  }
}




export async function compareToMarketStandards(
  contractText: string,
  contractType: string,
  detectedClauses: ClauseRisk[],
): Promise<MarketDeviation[]> {
  const excerpt = contractText ? contractText.substring(0, 800) : "";
  const clausesSummary = detectedClauses
    .map((clause) => `${clause.type}: ${clause.content.substring(0, 200)}...`)
    .join("\n");

  const prompt = `Tu es un expert juridique spécialisé dans la comparaison de contrats aux standards du marché.

MISSION: Compare les clauses de ce contrat aux pratiques standard du marché.

EXTRAIT CONTRAT (contexte limité):
${excerpt}

CONTEXTE:
- Type de contrat: ${contractType}
- Clauses détectées dans le contrat analysé:

${clausesSummary}

INSTRUCTIONS:
1. Pour CHAQUE clause détectée, compare-la aux standards du marché
2. Identifie les ÉCARTS significatifs (favorables ou défavorables)
3. Évalue l'impact de chaque écart
4. Propose des recommandations concrètes

FORMAT DE RÉPONSE JSON:
{
  "ecartAuxStandards": [
    {
      "clause": "Nom de la clause analysée",
      "votreContrat": "Ce qui est écrit dans le contrat",
      "standard": "Ce qui est standard dans le marché",
      "ecart": "favorable|défavorable|neutre",
      "recommandation": "Action concrète recommandée",
      "impact": "faible|moyen|élevé"
    }
  ]
}
Réponds UNIQUEMENT avec le JSON.`;

  try {
    const txt = await callOpenAI([{ role: "user", content: prompt }], {
      model: "gpt-4o",
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(txt);
    return result.ecartAuxStandards || [];
  } catch (error) {
    console.error("❌ Erreur lors de la comparaison aux standards:", error);
    return [];
  }
}

export async function generateContextualQuestions(
  contractText: string,
  clausesManquantes: MissingClause[],
  clausesRisque: ClauseRisk[],
  contractType: string,
): Promise<ContextualQuestion[]> {
  const manquesSummary = clausesManquantes.map((c) => c.nom).join(", ");
  const risquesSummary = clausesRisque.map((c) => c.type).join(", ");
  const excerpt = contractText ? contractText.substring(0, 1200) : "";

  const prompt = `Tu es un expert juridique. Génère 5 questions PERTINENTES que l'utilisateur devrait se poser sur ce contrat.

CONTEXTE:
- Type de contrat: ${contractType}
- Clauses manquantes détectées: ${manquesSummary}
- Clauses à risque identifiées: ${risquesSummary}

INSTRUCTIONS:
1. Les questions doivent être basées sur les LACUNES et RISQUES détectés
2. Elles doivent être ACTIONNABLES (commencer par "Que se passe-t-il si...", "Comment...", "Puis-je...")
3. Priorise les questions liées aux clauses manquantes et aux risques
4. Adapte les questions au type de contrat spécifique

FORMAT DE RÉPONSE JSON:
{
  "questionsProposees": [
    {
      "question": "Question complète et précise",
      "contexte": "Pourquoi cette question est pertinente",
      "urgence": "haute|moyenne|basse",
      "categorie": "risque|manque|clarification|negociation"
    }
  ]
}

Extrait du contrat pour contexte:
"""
${excerpt}
"""

Réponds UNIQUEMENT avec le JSON.`;

  try {
    const txt = await callOpenAI([{ role: "user", content: prompt }], {
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(txt);
    return result.questionsProposees || [];
  } catch (error) {
    console.error("❌ Erreur lors de la génération des questions:", error);
    return [];
  }
}



export async function performCompleteMarketAnalysis(
  contractText: string,
  contractType: string,
  detectedClauses: ClauseRisk[],
): Promise<MarketAnalysisResult> {
  const missingClausesData = await detectMissingClauses(
    contractText,
    contractType,
    detectedClauses.map((c) => c.type),
  );

  const clausesManquantes = missingClausesData.clausesManquantes;

  const [ecartAuxStandards, questionsProposees] = await Promise.all([
    compareToMarketStandards(contractText, contractType, detectedClauses),
    generateContextualQuestions(
      contractText,
      clausesManquantes,
      detectedClauses,
      contractType,
    ),
  ]);

  const scoreConformite = calculateConformityScore(
    clausesManquantes,
    ecartAuxStandards,
  );

  return {
    clausesManquantes,
    ecartAuxStandards,
    questionsProposees,
    scoreConformite,
  };
}





function calculateConformityScore(
  clausesManquantes: MissingClause[],
  ecartAuxStandards: MarketDeviation[],
): number {
  let score = 100;

  for (const clause of clausesManquantes) {
    if (clause.importance === "obligatoire") score -= 15;
    else if (clause.importance === "recommandé") score -= 8;
    else score -= 3;
  }

  for (const ecart of ecartAuxStandards) {
    if (ecart.ecart === "défavorable") {
      if (ecart.impact === "élevé") score -= 12;
      else if (ecart.impact === "moyen") score -= 6;
      else score -= 2;
    }
  }

  return Math.max(0, Math.min(100, score));
}
