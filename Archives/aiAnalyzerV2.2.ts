/* ------------------------------------------------------------------
   🧠 AI ANALYZER V2.2 - VERSION CORRIGÉE ET STABLE
   ------------------------------------------------------------------ 
*/

// CORRECTION 1 : On ne garde que le type 'ClauseRisk' car les autres ne sont plus utilisés ici.
import { ClauseRisk } from '../types';
import {
  CLAUSE_ANALYSIS_PROMPT,
  CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT,
  buildContextualPrompt,
  PromptContext
} from './aiAnalyser/aiPrompts';
import { AnalysisContext, ContextualAnalysisResult } from '../types/contextualAnalysis';
import { callOpenAI } from './aiClient';


/**
 * 🎯 ANALYSE PRINCIPALE - API OpenAI GPT-4
 *     
 */
export async function analyzeContractWithAI(content: string, context?: AnalysisContext): Promise<ClauseRisk[]> {
  console.log(`🧠 === ANALYSE IA OPENAI DÉMARRE ===`);
  console.log(`📄 Contenu: ${content.length} caractères`);

  console.log("Le contexte de l'analyse :", context)
  if (context) {
    console.log('%c🧩 Contexte utilisateur fourni pour analyse des clauses: \n',
      "background:grey; border-radius:5px; padding:6px; font-size:1.2em",
      {
        contractType: context.contractType,
        userRole: context.userRole,
        orientation: context.interestOrientation,
        mission: context.missionContext || context.mission,
        questions: context.specificQuestions?.slice(0, 120)
      });
  }

  const estimatedTokens = Math.ceil(content.length / 4);
  console.log(`📊 Estimation tokens: ~${estimatedTokens} tokens`);

  if (content.length > 30000) {
    console.warn('⚠️ ATTENTION: Contrat très long, analyse en sections multiples');
  }

  const cached = loadAnalysisFromCache(content, context);
  if (cached && cached.length > 0) {
    console.log('🗂️ Analyse servie depuis le cache (sessionStorage)');
    return cached;
  }

  try {
    console.log(`📄 Taille du contenu: ${content.length} caractères`);

    if (content.length > 25000) {
      console.log(`🔄 Document long détecté - Analyse par sections intelligentes`);
      return await analyzeLongContractIntelligently(content, context);
    }

    if (content.length > 12000) {
      console.log(`⚠️ Document moyen - Division en chunks optimisés avec retry automatique`);
      return await analyzeWithOptimizedChunkingAndRetry(content, context);
    }

    console.log(`📁 Document court - Analyse directe avec GPT-4o`);
    const result = await analyzeDirectlyWithGPT4(content, context);

    saveAnalysisToCache(content, result, context);
    return result;

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse OpenAI:', error);
    console.log('🔄 Fallback vers analyse locale...');
    return analyzeContractLocally(content);
  }
}

/**
 * 📊 Parsing de la réponse IA et création des objets ClauseRisk
 */
function parseAIResponse(response: string): ClauseRisk[] {
  console.log('[DEBUG] 🔍 Parsing de la réponse IA brute...');

  let cleanedText = response.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.substring(7).trim();
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3).trim();
  }

  try {
    const parsedResponse = JSON.parse(cleanedText);

    if (!parsedResponse.clauses || !Array.isArray(parsedResponse.clauses)) {
      console.error('❌ [ERREUR] Réponse JSON invalide: la clé "clauses" est manquante ou n\'est pas un tableau.');
      return [];
    }

    const clauses: ClauseRisk[] = [];

    parsedResponse.clauses.forEach((parsed: any, index: number) => {
      if (parsed.type && parsed.text && parsed.riskScore && typeof parsed.startIndex === 'number' && typeof parsed.endIndex === 'number' && Array.isArray(parsed.keywords)) {
        const clause: ClauseRisk = {
          id: `ai-clause-${Date.now()}-${index}`,
          type: parsed.type,
          content: parsed.text,
          riskScore: Math.min(5, Math.max(1, parsed.riskScore)),
          category: mapTypeToCategory(parsed.type),
          justification: parsed.justification || 'Clause identifiée par IA',
          suggestion: parsed.suggestion || 'Révision recommandée',
          page: 1,
          keywords: parsed.keywords,
          startIndex: parsed.startIndex,
          endIndex: parsed.endIndex,
        };
        clauses.push(clause);
      } else {
        console.warn(`⚠️ [ATTENTION] Clause ${index + 1} ignorée (champs manquants ou invalides):`, parsed);
      }
    });

    return clauses;

  } catch (error) {
    console.error('❌ [ERREUR] Erreur de parsing JSON:', error);
    console.error('[DEBUG] 📄 Réponse reçue (après nettoyage):', cleanedText);
    return [];
  }
}

/**
 * 🏷️ Mappage du type vers la catégorie
 */
function mapTypeToCategory(type: string): 'termination' | 'penalty' | 'responsibility' | 'confidentiality' | 'nonCompete' | 'warranty' | 'other' {
  const typeMap: Record<string, string> = {
    'résiliation': 'termination',
    'pénalité': 'penalty',
    'responsabilité': 'responsibility',
    'confidentialité': 'confidentiality',
    'non-concurrence': 'nonCompete',
    'garantie': 'warranty'
  };

  const normalizedType = type.toLowerCase();

  for (const [key, category] of Object.entries(typeMap)) {
    if (normalizedType.includes(key)) {
      return category as any;
    }
  }

  return 'other';
}

/**
 * 🔄 ANALYSE LOCALE (Fallback)
 * En cas d'echec complet d'une analyse par ia utilisation de fallback de secours qui utilise des riskPattern
 * pour detecter des clauses à risque
 */
async function analyzeContractLocally(content: string): Promise<ClauseRisk[]> {
  console.log('🏠 Analyse locale de secours...');

  const localClauses: ClauseRisk[] = [];
  const riskPatterns = [
    { pattern: /pénalité|pénalités/gi, type: 'Clause pénale', category: 'penalty' as const, riskScore: 4 },
    { pattern: /résiliation|résilie|résilier/gi, type: 'Résiliation', category: 'termination' as const, riskScore: 3 },
    { pattern: /responsabilité|responsable/gi, type: 'Responsabilité', category: 'responsibility' as const, riskScore: 3 },
    { pattern: /confidentialité|confidentiel/gi, type: 'Confidentialité', category: 'confidentiality' as const, riskScore: 2 }
  ];

  riskPatterns.forEach((risk, index) => {
    if (content.match(risk.pattern)) {
      localClauses.push({
        id: `local-${index}-${Date.now()}`,
        type: risk.type,
        content: `Clause ${risk.type.toLowerCase()} détectée`,
        riskScore: risk.riskScore,
        category: risk.category,
        justification: 'Détection par analyse locale',
        suggestion: 'Révision recommandée',
        page: 1,
        keywords: [risk.type.toLowerCase()]
      });
    }
  });

  console.log(`✅ Analyse locale terminée: ${localClauses.length} clauses`);
  return localClauses;
}

/**
 * 🚀 ANALYSE DIRECTE - Document court avec GPT-4o
 */
async function analyzeDirectlyWithGPT4(content: string, context?: AnalysisContext): Promise<ClauseRisk[]> {
  console.log('🎯 Analyse directe avec GPT-4o (haute capacité)');
  const contextBlock = context ? buildContextBlock(context) : '';
  const analysisPrompt = `${CLAUSE_ANALYSIS_PROMPT}\n${contextBlock}\nCONTRAT À ANALYSER:\n${content}`;

  const responseText = await callOpenAI(
    [
      { role: 'system', content: 'Vous êtes un expert juridique. Identifiez toutes les clauses à risque. Terminez toujours vos phrases complètement.' },
      { role: 'user', content: analysisPrompt }
    ],
    { model: 'gpt-4o', max_tokens: 8192, temperature: 0.2, response_format: { type: 'json_object' } }
  );
  return parseAIResponse(responseText);
}

/**
 * 🔄 ANALYSE OPTIMISÉE AVEC RETRY - Document moyen
 */
async function analyzeWithOptimizedChunkingAndRetry(content: string, context?: AnalysisContext): Promise<ClauseRisk[]> {
  console.log('🔄 Analyse avec chunking optimisé + retry automatique');

  let result = await analyzeWithOptimizedChunking(content, 15000, context);

  if (result.length === 0) {
    console.warn('⚠️ Premier essai échec - Retry avec chunks plus petits...');
    result = await analyzeWithOptimizedChunking(content, 8000, context);
    console.log(`🔄 Retry terminé: ${result.length} clauses identifiées`);
  }

  return result;
}

/**
 * 🔄 ANALYSE OPTIMISÉE - Document moyen avec chunking intelligent
 */
async function analyzeWithOptimizedChunking(content: string, chunkSize: number, context?: AnalysisContext): Promise<ClauseRisk[]> {
  const chunks = createSmartChunks(content, chunkSize);
  let allClauses: ClauseRisk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🔍 Analyse chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

    const contextBlock = context ? buildContextBlock(context) : '';

    const chunkPrompt = `${CLAUSE_ANALYSIS_PROMPT}\n${contextBlock}\nPARTIE ${i + 1}/${chunks.length} DU CONTRAT:\n${chunk}`;
    try {
      const responseText = await callOpenAI(
        [
          { role: 'system', content: `Vous analysez la partie ${i + 1}/${chunks.length} d'un contrat. Soyez exhaustif.` },
          { role: 'user', content: chunkPrompt }
        ],
        { model: 'gpt-4o', max_tokens: 4000, temperature: 0.1 }
      );
      if (responseText) {
        allClauses = allClauses.concat(parseAIResponse(responseText));
      }
    } catch (error) {
      console.warn(`❌ Erreur API pour chunk ${i + 1}:`, error);
    }

    if (i < chunks.length - 1) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log("Toute les clauses qui ont été retournée : ", allClauses)
  return allClauses;
}

/**
 * 🎯 ANALYSE LONGUE - Document très long
 */
async function analyzeLongContractIntelligently(content: string, context?: AnalysisContext): Promise<ClauseRisk[]> {
  console.log('🎯 Analyse intelligente de document long');
  const clauses = await analyzeWithOptimizedChunking(content, 20000, context);
  return deduplicateAndPrioritizeClauses(clauses);
}

/**
 * 🏗️ Création de chunks intelligents
 */
function createSmartChunks(content: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\s*\n/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  console.log(`📊 Document divisé en ${chunks.length} chunks intelligents`);
  return chunks;
}

/**
 * 🔄 Déduplication et priorisation des clauses
 */
function deduplicateAndPrioritizeClauses(clauses: ClauseRisk[]): ClauseRisk[] {
  const uniqueClausesMap = new Map<string, ClauseRisk>();
  for (const clause of clauses) {
    const key = `${clause.type}:${clause.content.substring(0, 50)}`;
    if (!uniqueClausesMap.has(key)) {
      uniqueClausesMap.set(key, clause);
    }
  }
  return Array.from(uniqueClausesMap.values()).sort((a, b) => b.riskScore - a.riskScore);
}



/**
 * 🎯 ANALYSE CONTEXTUELLE AVEC VARIABLES
 */
export async function analyzeContextually(
  contract: string,
  clauses: ClauseRisk[],
  context: AnalysisContext
): Promise<ContextualAnalysisResult> {

  console.log("%c [ 🎯 Analyse contextuelle utilisé ]",
    "background:purple; padding:6px; font-size:1.2em; border-radius:6px",
    `${context.industry || 'N/A'} / ${context.contractType}`);

  try {
    const promptContext: PromptContext = {
      userRole: context.userRole,
      contractType: context.contractType,
      missionContext: context.missionContext || 'analyse contractuelle générale',
      strategicOrientation: context.interestOrientation,
      industry: context.industry || 'secteur général'
    };
    const contextualPrompt = buildContextualPrompt(CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT, promptContext);

    const fullPrompt = `${contextualPrompt}\n\nCLAUSES DÉTECTÉES:\n${clauses.map(c => `- ${c.type}: ${c.content.slice(0, 100)}...`).join('\n')}\n\nCONTRAT À ANALYSER:\n${contract.slice(0, 8000)}`;

    const responseText = await callOpenAI(
      [{ role: 'user', content: fullPrompt }],
      { model: 'gpt-4o-mini', temperature: 0.25, max_tokens: 1500 }
    );
    return parseContextualResponse(responseText, clauses, context);
  } catch (error) {
    console.error('❌ Erreur analyse contextuelle:', error);
    return createDefaultContextualResult(clauses, context);
  }
}

/**
 * 📊 Parsing de la réponse contextuelle
 */
function parseContextualResponse(
  response: string,
  clauses: ClauseRisk[],
  context: AnalysisContext
): ContextualAnalysisResult {
  // Logique de parsing simplifiée et plus robuste
  const recommendations = response.split('\n').filter(line => line.toLowerCase().includes('recommand')).slice(0, 3);
  const specificInsights = response.split('\n').filter(line => line.toLowerCase().includes('point de vigilance')).slice(0, 3);

  const clauses_prioritaires = clauses.slice(0, 5).map(clause => {
    const priority = clause.riskScore >= 4 ? 'critical' as const : clause.riskScore >= 3 ? 'high' as const : 'medium' as const;
    return {
      id: clause.id,
      text: clause.content,
      type: clause.type,
      priority,
      impact_pour_utilisateur: `Impact pour ${context.userRole} à évaluer.`,
      conseil_specifique: `Révision de cette clause de type "${clause.type}" conseillée.`,
      keywords: clause.keywords || []
    };
  });

  return {
    context,
    clauses_prioritaires,
    adjustedClauses: clauses,
    recommendations,
    riskProfile: calculateRiskProfile(clauses),
    specificInsights
  };
}

/**
 * 📊 Calcul du profil de risque
 */
function calculateRiskProfile(clauses: ClauseRisk[]): {
  overall: 'low' | 'medium' | 'high';
  distribution: { high: number; medium: number; low: number };
} {
  const distribution = {
    high: clauses.filter(c => c.riskScore >= 4).length,
    medium: clauses.filter(c => c.riskScore === 3).length,
    low: clauses.filter(c => c.riskScore < 3).length
  };
  const avgRisk = clauses.length > 0 ? clauses.reduce((sum, c) => sum + c.riskScore, 0) / clauses.length : 0;

  let overall: 'low' | 'medium' | 'high' = 'low';
  if (avgRisk >= 3.5 || distribution.high > 2) overall = 'high';
  else if (avgRisk >= 2.5 || distribution.high > 0 || distribution.medium > 1) overall = 'medium';

  return { overall, distribution };
}

/**
 * 🔄 Résultat contextuel par défaut
 */
function createDefaultContextualResult(
  clauses: ClauseRisk[],
  context: AnalysisContext
): ContextualAnalysisResult {
  return {
    context,
    clauses_prioritaires: [],
    adjustedClauses: clauses,
    recommendations: ['Analyse contextuelle non disponible, révision manuelle requise.'],
    riskProfile: calculateRiskProfile(clauses),
    specificInsights: [`Analyse basée sur les risques standards pour un contrat de type "${context.contractType}".`]
  };
}

/**
 * 🔍 GET RELEVANT CASES - Wrapper pour la fonction de recherche de jurisprudence
 */
// CORRECTION 3 : On supprime toute cette fonction qui n'a plus sa place ici.
/*
export async function getRelevantCases(
  clause: ClauseRisk
): Promise<{ cases: JurisprudenceCase[]; keywordSearches: KeywordSearchLink[] }> {
    return fetchRelevantCases(clause);
}
*/

// --- Fonctions de Cache ---
function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h.toString();
}

const ANALYSIS_CACHE_NS = 'analysisV2:';

function contextCacheKeyPart(context?: AnalysisContext): string {
  if (!context) return 'noctx';
  const shallow = {
    contractType: context.contractType,
    userRole: context.userRole,
    orientation: context.interestOrientation,
    mission: context.missionContext || context.mission || '',
    questions: (context.specificQuestions || '').slice(0, 200)
  };
  return hashString(JSON.stringify(shallow));
}

function buildContextBlock(context: AnalysisContext): string {
  return `\n[CONTEXTE UTILISATEUR]\nType de contrat: ${context.contractType}\nRôle utilisateur: ${context.userRole}\nOrientation: ${context.interestOrientation}\nMission: ${context.missionContext || context.mission || 'N/A'}\nQuestions spécifiques: ${context.specificQuestions || 'Aucune'}\n`;
}

function loadAnalysisFromCache(content: string, context?: AnalysisContext): ClauseRisk[] | null {
  try {
    const key = ANALYSIS_CACHE_NS + hashString(content) + ':' + contextCacheKeyPart(context);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveAnalysisToCache(content: string, clauses: ClauseRisk[], context?: AnalysisContext): void {
  try {
    const key = ANALYSIS_CACHE_NS + hashString(content) + ':' + contextCacheKeyPart(context);
    sessionStorage.setItem(key, JSON.stringify(clauses));
  } catch { /* ignore */ }
}
