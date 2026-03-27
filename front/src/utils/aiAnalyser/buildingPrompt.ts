

import { AnalysisContext } from "../../types/contextualAnalysis";

import {
    CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT,
    CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT_ULTIMATE,
    CLAUSE_ANALYSIS_PROMPT,

} from "./aiPrompts";


/**
 * Contexte normalisé utilisé pour l'injection des variables
 * dans les prompts d'analyse contractuelle.
 */
export interface PromptContext {
    userRole: string;
    contractType: string;
    missionContext: string;
    strategicOrientation: string;
    industry: string;
    contractObjective: string;
    legalRegime: string
}


/**
 * Construit le prompt d'extraction de clauses à risque pour l'analyse principale (courte) ET le chunking (documents moyens/longs).
 * 
 * @param { string } sectionLabel - Label entre le prompt et le texte, utile en cas de plusieurs chunk
 * @param { string } sectionText - Le texte brut du contrat
 * @param { AnalysisContext } context - Contexte brut issu de l'analyse du contrat si présent
 * @param { boolean } retryWithAnotherPrompt - En cas d'echec du premier prompt "CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT_ULTIMATE" on utilise le deuxieme "CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT" qui est un peu moins poussé
 * @returns { string } - Le prompt prêt à être utilisé
 */
export function buildClauseExtractionPromptForAI(
    sectionLabel: string,
    sectionText: string,
    context?: AnalysisContext,
    retryWithAnotherPrompt: boolean = false
): string {
    const header = context
        ? `${buildContextualPrompt(
            !retryWithAnotherPrompt ? CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT_ULTIMATE : CONTEXTUAL_CLAUSE_ANALYSIS_PROMPT,
            mapAnalysisContextToPromptContext(context)
        )}`
        : CLAUSE_ANALYSIS_PROMPT;
    return `${header}\n\n${sectionLabel}\n${sectionText}`;
}




/**
 * Transforme un AnalysisContext en PromptContext exploitable par le moteur de prompt.
 * Effectue un mapping des propriétés et applique des valeurs de repli
 * lorsque certaines informations sont absentes.
 * 
 * @param {AnalysisContext} context - Contexte brut issu de l'analyse du contrat
 * @returns { PromptContext } - Contexte formaté pour la génération de prompt
 */
function mapAnalysisContextToPromptContext(context: AnalysisContext): PromptContext {
    return {
        userRole: context.userRole,
        contractType: context.contractType,
        missionContext: context.missionContext || context.mission || 'analyse contractuelle générale',
        strategicOrientation: context.interestOrientation,
        industry: context.industry || 'secteur général',
        contractObjective: context.contractObjective || "null",
        legalRegime: context.legalRegime || "null",
    };
}






/**
 * Remplace dynamiquement un prompt par le context de l'analyse du contrat via les placeHolder {{ variable }}
 * 
 * @param {string} template - Le prompt où l'on injecte le context 
 * @param {PromptContext} context - Le context de l'analyse du contrat
 * @returns { string } - Le prompt final avec les valeurs injectées
 */
export function buildContextualPrompt(template: string, context: PromptContext): string {
    return template
        .replace(/\{\{userRole\}\}/g, context.userRole || 'la partie contractante')
        .replace(/\{\{contractType\}\}/g, context.contractType || 'contrat commercial')
        .replace(/\{\{mission\}\}/g, context.missionContext || 'analyse contractuelle générale')
        .replace(/\{\{strategicOrientation\}\}/g, context.strategicOrientation || 'équilibré')
        .replace(/\{\{industry\}\}/g, context.industry || 'secteur général')
        .replace(/\{\{legalRegime\}\}/g, context.legalRegime)
        .replace(/\{\{contractObjective\}\}/g, context.contractObjective)

}