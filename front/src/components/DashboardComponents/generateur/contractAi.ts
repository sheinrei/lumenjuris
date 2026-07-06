/**
 * Création assistée d'un contrat « de zéro », façon juriste :
 *  1. questions de CADRAGE fermées (choix) qui déterminent la structure/options,
 *  2. rédaction du contrat avec des VARIABLES {{…}} pour les données factuelles.
 * Réutilise le client IA existant (proxy → /openai-chat-5).
 */
import { callOpenAi52 } from "../../../utils/aiClient";

export interface WizardQuestion {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
}

export interface DraftVariable {
  id: string;
  label: string;
}
export interface DraftSection {
  heading?: string;
  content: string;
}
export interface ContractDraft {
  title: string;
  variables: DraftVariable[];
  sections: DraftSection[];
}

/** Isole le premier bloc JSON ([...] ou {...}) d'une réponse potentiellement bavarde. */
function extractJson(s: string): string {
  const openArr = s.indexOf("[");
  const closeArr = s.lastIndexOf("]");
  const openObj = s.indexOf("{");
  const closeObj = s.lastIndexOf("}");
  // Choisit le conteneur qui commence le plus tôt.
  if (openArr !== -1 && (openObj === -1 || openArr < openObj) && closeArr > openArr) {
    return s.slice(openArr, closeArr + 1);
  }
  if (openObj !== -1 && closeObj > openObj) return s.slice(openObj, closeObj + 1);
  return s;
}

let qCounter = 0;

/** Questions de cadrage fermées qu'un juriste poserait pour ce contrat. */
export async function generateContractQuestions(title: string): Promise<WizardQuestion[]> {
  const prompt =
    `Tu es un juriste français spécialisé, expérimenté sur le contrat de type « ${title.trim()} ». ` +
    `Avant de rédiger, identifie d'abord silencieusement : (a) le domaine juridique précis de ce contrat, ` +
    `(b) les 4 à 7 points qui font le plus souvent l'objet d'un désaccord ou d'un arbitrage dans CE type de ` +
    `contrat spécifique en pratique française. ` +
    `Transforme UNIQUEMENT ces points en questions de CADRAGE fermées — celles qui changent la structure, ` +
    `les clauses ou le régime juridique du contrat. ` +
    `INTERDIT : questions génériques qui s'appliqueraient à n'importe quel contrat (ex. « Quelle est la durée ? », ` +
    `« Y a-t-il une clause de confidentialité ? ») sauf si ce point est spécifiquement structurant pour CE type ` +
    `de contrat précis. Chaque question doit être formulée avec le vocabulaire propre à ce domaine juridique. ` +
    `Ignore les informations factuelles (noms, adresses, dates, montants) : ce seront des variables à remplir. ` +
    `Réponds UNIQUEMENT en JSON : un tableau de 4 à 7 objets ` +
    `{"question": string, "type": "choice", "options": [string, …]} avec 2 à 4 options courtes, concrètes et ` +
    `mutuellement exclusives (pas de simples « Oui »/« Non » sauf si le choix est réellement binaire). ` +
    `N'emploie "type":"text" que si un choix fermé est vraiment impossible. Aucun texte hors JSON. ` +
    `Exemple de forme attendue (le contenu doit être adapté au contrat demandé, pas recopié) : ` +
    `{"question":"Quel régime de responsabilité en cas de manquement ?","type":"choice","options":["Responsabilité de plein droit","Responsabilité pour faute prouvée","Plafonnée au montant du contrat"]}.`;
  const out = await callOpenAi52(prompt, "high", "low", "gpt-5.4-nano");
  let arr: unknown;
  try { arr = JSON.parse(extractJson(out)); } catch { arr = null; }
  if (!Array.isArray(arr)) throw new Error("Questions illisibles");
  const questions = (arr as unknown[])
    .map((raw): WizardQuestion | null => {
      const o = raw as { question?: unknown; type?: unknown; options?: unknown };
      const question = typeof o.question === "string" ? o.question.trim() : "";
      if (!question) return null;
      const options = Array.isArray(o.options)
        ? o.options.map((x) => String(x).trim()).filter(Boolean)
        : [];
      const type: "choice" | "text" = o.type === "text" || options.length === 0 ? "text" : "choice";
      qCounter += 1;
      return { id: `q${qCounter}`, question, type, options: type === "choice" ? options.slice(0, 4) : undefined };
    })
    .filter((q): q is WizardQuestion => q !== null)
    .slice(0, 8);
  if (questions.length === 0) throw new Error("Aucune question générée");
  return questions;
}

function parseDraft(out: string, title: string): ContractDraft {
  try {
    const j = JSON.parse(extractJson(out)) as {
      title?: unknown; variables?: unknown; sections?: unknown;
    };
    if (j && Array.isArray(j.sections)) {
      const variables = Array.isArray(j.variables)
        ? (j.variables as unknown[])
            .map((v) => {
              const o = v as { id?: unknown; label?: unknown };
              const id = typeof o.id === "string" ? o.id.trim() : "";
              return id ? { id, label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : id } : null;
            })
            .filter((v): v is DraftVariable => v !== null)
        : [];
      const sections = (j.sections as unknown[])
        .map((s) => {
          const o = s as { heading?: unknown; content?: unknown };
          return {
            heading: typeof o.heading === "string" && o.heading.trim() ? o.heading.trim() : undefined,
            content: String(o.content ?? "").trim(),
          };
        })
        .filter((s) => s.content);
      if (sections.length > 0) {
        return {
          title: typeof j.title === "string" && j.title.trim() ? j.title.trim() : title.toUpperCase(),
          variables,
          sections,
        };
      }
    }
  } catch { /* repli ci-dessous */ }
  return { title: title.toUpperCase(), variables: [], sections: [{ content: out.trim() }] };
}

/** Rédige le contrat structuré, avec variables {{…}}, à partir des choix de cadrage. */
export async function generateContractDraft(
  title: string,
  answers: { question: string; answer: string }[],
): Promise<ContractDraft> {
  const choices = answers.map((a) => `- ${a.question} → ${a.answer || "(indifférent)"}`).join("\n");
  const prompt =
    `Tu es un juriste français. Rédige un contrat de type « ${title.trim()} » conforme et structuré, ` +
    `en tenant compte des choix de cadrage suivants :\n${choices}\n\n` +
    `Emploie des VARIABLES au format {{snake_case}} pour TOUTES les données factuelles à remplir ` +
    `(parties, adresses, dates, montants…). ` +
    `Réponds UNIQUEMENT en JSON : ` +
    `{"title": string en MAJUSCULES, "variables": [{"id": "snake_case", "label": "Libellé lisible"}], ` +
    `"sections": [{"heading": "Article 1 – …", "content": "… {{variable}} …"}]}. ` +
    `Inclure un préambule (heading « Préambule ») et une dernière section « Signatures ». ` +
    `Chaque variable utilisée dans un content DOIT figurer dans "variables". Aucun texte hors JSON.`;
  const out = await callOpenAi52(prompt, "medium", "medium", "gpt-5.2");
  return parseDraft(out, title);
}
