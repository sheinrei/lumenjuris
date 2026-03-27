import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ClauseRisk } from '../types';
import { callOpenAI } from '../utils/aiClient';

/* ---------- TYPES ---------- */
export interface AltProposal {
  clause: string; // nouvelle rédaction complète
  benefits: string; // +valeur pour le client
  riskReduction: string; // ex. "35 %"
}

export interface ClauseAI {
  summary: string; // 2 lignes
  riskLevel: 'High' | 'Medium' | 'Low'; // badge
  riskScore: number; // 0-100
  litigation: string; // type de litige potentiel
  issues: string[]; // liste
  advice: string; // conseil global
  alternatives: AltProposal[]; // 2 propositions
}

interface AIState {
  map: Record<string, ClauseAI>;
  fetch: (clause: ClauseRisk) => Promise<void>;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      map: {},

      async fetch(clause) {
        if (get().map[clause.id]) return; // cache

        const prompt = `Tu es un avocat canadien spécialisé.
Analyse la clause suivante:
"""${clause.content}"""

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

        let obj: ClauseAI;
        try {
          const txt = await callOpenAI([
            { role: 'user', content: prompt }
          ], { model: 'gpt-3.5-turbo', temperature: 0.2 });
          obj = JSON.parse(txt || '{}');
        } catch (e) {
          console.error('OpenAI error:', e);
          obj = {
            summary: 'Analyse indisponible.',
            riskLevel: 'Medium',
            riskScore: 50,
            litigation: '',
            issues: [],
            advice: '',
            alternatives: [],
          };
        }

        set((s) => ({ map: { ...s.map, [clause.id]: obj } }));
      },
    }),
    { name: 'justiclause-ai-cache' }
  )
);
