import { AnalysisContext, ClauseAI, ClauseRisk, JurisprudenceCase, Recommendation } from "./types";

/* global localStorage, fetch */

/**
 * Client des endpoints LumenJuris — les MÊMES routes que la page « Analyse
 * des risques » de la plateforme :
 *  - POST /api/addin/login       → JWT (Bearer) pour le complément
 *  - POST /api/analyze-contract  → ClauseRisk[] (analyse IA du proxy)
 *  - POST /api/recommend-clause  → recommandations alternatives
 *  - POST /api/jurisprudence     → recherche hybride (backend Python)
 *  - POST /api/openai-chat-5     → détail clause (issues/advice) et questions
 *
 * Auth : l'iframe Word ne reçoit pas le cookie httpOnly `authLumenJuris`,
 * le proxy accepte donc aussi `Authorization: Bearer <jwt>` (voir
 * proxy/src/middleware/authMiddleware.ts).
 */

export const PROXY_BASE = "http://localhost:3000";

const TOKEN_KEY = "lumen-addin-token";

export class AuthError extends Error {}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

async function post<T>(endpoint: string, body: unknown, withAuth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) {
    // POC : le token est optionnel — en local, le proxy accepte les requêtes
    // sans authentification (voir authMiddleware, mode dev).
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${PROXY_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    clearToken();
    throw new AuthError("Session expirée — reconnectez-vous.");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${endpoint} → ${response.status} ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

/** Connexion avec les identifiants de la plateforme LumenJuris. */
export async function login(email: string, password: string): Promise<void> {
  const data = await post<{ success: boolean; token?: string; message?: string }>("/api/addin/login", {
    email,
    password,
  });
  if (!data.success || !data.token) throw new Error(data.message || "Connexion refusée");
  localStorage.setItem(TOKEN_KEY, data.token);
}

/** Contexte par défaut (mêmes valeurs que le formulaire plateforme). */
export const DEFAULT_CONTEXT: AnalysisContext = {
  contractType: "",
  userRole: "",
  specificQuestions: "",
  analysisDepth: "detailed",
  interestOrientation: "balanced",
  mission: "",
  legalRegime: "",
  contractObjective: "",
};

/**
 * Détection IA du contrat pour pré-remplir le formulaire d'analyse —
 * même route que la plateforme (`detectContractWithAI`).
 */
export async function detectContract(text: string): Promise<Partial<AnalysisContext>> {
  return post<Partial<AnalysisContext>>("/api/detect-contract", { text }, true);
}

/** Analyse du document — même payload que ContractAnalysis.tsx. */
export async function analyzeContract(content: string, context: AnalysisContext): Promise<ClauseRisk[]> {
  const data = await post<{ success: boolean; clauses: ClauseRisk[] }>(
    "/api/analyze-contract",
    { content, context },
    true
  );
  return (data.clauses ?? []).map((clause, i) => ({
    ...clause,
    id: clause.id || `clause-${i}`,
  }));
}

/** Recommandations alternatives — même route que la modale plateforme. */
export async function fetchRecommendations(
  clause: ClauseRisk,
  context?: AnalysisContext
): Promise<Recommendation[]> {
  const data = await post<
    | { title?: string; clauseText: string; benefits?: string; riskReduction?: string }[]
    | { recommendations?: { title?: string; clauseText: string; benefits?: string; riskReduction?: string }[] }
  >("/api/recommend-clause", { clause, context }, true);
  const items = Array.isArray(data) ? data : (data.recommendations ?? []);
  return items
    .filter((r) => r && r.clauseText)
    .map((r) => ({
      title: r.title ?? "",
      clauseText: r.clauseText,
      benefits: r.benefits ?? "",
      riskReduction: r.riskReduction ?? "",
    }));
}

/* ------------------- Jurisprudence (repris de getAutomaticDecisions.ts) ------------------- */

const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "d'un", "d'une", "et", "ou",
  "en", "au", "aux", "ce", "cette", "ces", "qui", "que", "dont", "pour", "par",
  "sur", "dans", "avec", "sans", "est", "sont", "être", "peut", "il", "elle",
  "ne", "pas", "plus", "très", "son", "sa", "ses", "leur", "leurs", "cela",
  "clause", "contrat", "risque", "juridique",
]);

function significantTerms(text: string, max: number): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-zà-öø-ÿ0-9\s-]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, max);
}

function buildJurisprudenceQueries(clause: ClauseRisk): string[] {
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

function buildJurisprudenceContext(clause: ClauseRisk): string {
  const ref = Array.isArray(clause.legalReference) ? clause.legalReference.join(", ") : clause.legalReference;
  return [
    `Type de clause : ${clause.type}.`,
    `Problème juridique identifié : ${clause.justification}`,
    ref ? `Références légales : ${ref}.` : "",
    `Clause : ${clause.content.slice(0, 800)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Recherche hybride de jurisprudence — même flux que la plateforme. */
export async function fetchJurisprudence(clause: ClauseRisk): Promise<JurisprudenceCase[]> {
  const queries = buildJurisprudenceQueries(clause);
  if (queries.length === 0) return [];
  const data = await post<Record<string, unknown>[]>("/api/jurisprudence", {
    queries,
    context: buildJurisprudenceContext(clause),
  });
  if (!Array.isArray(data)) return [];
  return data.map((item: Record<string, unknown>, i) => ({
    id: (item.url as string) || `case-${i}`,
    title: (item.title as string) || "",
    url: (item.url as string) || "",
    summary: (item.summary as string) || "",
    court: (item.court as string) || "",
    year: item.year as number | undefined,
    relevanceScore: (item.relevanceScore as number) || 0.8,
    citation: item.citation as string | undefined,
    date: item.date as string | undefined,
    keyPrinciples: item.keyPrinciples as string[] | undefined,
    litige: item.litige as string | undefined,
    resultat: item.resultat as string | undefined,
  }));
}

/* ------------------- Détail clause & question (relay /api/openai-chat-5) ------------------- */

const CLAUSE_AI_MODEL = "gpt-5.4-nano";

async function chat5(prompt: string, reasoning: "none" | "low" = "none"): Promise<string> {
  // reasoning "none" = réglage de la plateforme pour gpt-5.4-nano
  // (ex. ClauseReformulator) : même qualité de sortie, latence réduite.
  const data = await post<{ content?: string }>("/api/openai-chat-5", {
    prompt,
    reasoning,
    verbosity: "low",
    model: CLAUSE_AI_MODEL,
  });
  return data.content ?? "";
}

const parseClauseAI = (txt: string): ClauseAI =>
  JSON.parse(
    (txt || "{}")
      .trim()
      .replace(/^[\s\S]*?({)/, "$1")
      .replace(/```(?:json)?|```/gi, "")
  );

/** Détail IA d'une clause — même prompt que aiStore.fetch de la plateforme. */
export async function fetchClauseDetail(clause: ClauseRisk): Promise<ClauseAI> {
  const prompt = `Tu es un avocat français spécialisé en droit des contrats.
Analyse la clause suivante:
"""${clause.content}"""

RÈGLE DE STYLE : n'utilise JAMAIS d'énumérations en chiffres romains ((i), (ii), (iii), i., ii.…) ; rédige en phrases complètes, ou numérote 1. 2. 3. si nécessaire.

Réponds STRICTEMENT en JSON:
{
  "summary":"résumé 2 lignes",
  "riskLevel":"High|Medium|Low",
  "riskScore":"0-100",
  "litigation":"type de litige potentiel",
  "issues":["problème1","problème2"],
  "advice":"conseil global (1-2 phrases)",
  "alternatives":[
    {
      "clause":"réécriture intégrale (Proposition 1)",
      "benefits":"bénéfices de cette version",
      "riskReduction":"%"
    },
    {
      "clause":"réécriture intégrale (Proposition 2)",
      "benefits":"bénéfices de cette version",
      "riskReduction":"%"
    }
  ]
}`;
  return parseClauseAI(await chat5(prompt));
}

/** Question libre sur une clause (équivalent ChatUI de la modale). */
export async function askQuestion(clause: ClauseRisk, question: string): Promise<string> {
  const prompt = `Tu es un avocat français spécialisé en droit des contrats. Voici une clause d'un contrat :
"""${clause.content}"""

Contexte : cette clause a été identifiée comme à risque (${clause.type}) pour la raison suivante : ${clause.justification}

Question du juriste : ${question}

Réponds de façon concise, structurée et opérationnelle, en droit français, sans inventer de jurisprudence ni d'article de loi.`;
  return chat5(prompt, "low");
}
