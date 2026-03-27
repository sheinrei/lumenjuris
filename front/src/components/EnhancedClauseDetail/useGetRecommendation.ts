import { SetStateAction, useEffect, Dispatch } from "react";
import { perfMark, perfMeasure } from "../EnhancedClauseDetail";
import { ClauseRisk } from "../../types";
import { Recommendation } from "../../types";
import { AnalysisContext } from "../../types/contextualAnalysis";
import { getRecommendedClauses } from "../../utils/getRecommendedClauses";

export const useGetRecommendation = (
    clause:ClauseRisk,
    setAlternatives:Dispatch<SetStateAction<Recommendation[]| null>>,
    altCache:Record<string, Recommendation[]>,
    altCacheTime: Record<string, number>,
    context:AnalysisContext | undefined
) => {
    useEffect(() => {
        if (!clause) return
        const RECO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        const id = clause.id

        // Cache hit & valid TTL
        if (altCache[id] && altCacheTime[id] && Date.now() - altCacheTime[id] < RECO_CACHE_TTL) {
            setAlternatives(altCache[id]);
            return;
        }
        // Need fetch
        setAlternatives(null);
        const start = `clause:${id}:open`;
        getRecommendedClauses(clause, context).then(alts => {
            altCache[id] = alts; altCacheTime[id] = Date.now(); setAlternatives(alts);
            perfMark(`clause:${id}:reco_ready`);
            perfMeasure(`clause:${id}:time_to_reco`, start, `clause:${id}:reco_ready`);
        });
    }, [clause, context]);

}