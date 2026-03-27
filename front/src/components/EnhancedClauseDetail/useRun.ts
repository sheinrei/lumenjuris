import { Dispatch, SetStateAction, useEffect } from "react";
import { ClauseRisk } from "../../types";
import { JurisprudenceCase } from "../../types";
import { getAutomaticDecisions } from "../../utils/getAutomaticDecisions";
import { getKeywordSearchLinks } from "../../utils/getKeywordSearchLinks";
import { perfMark, perfMeasure } from "../EnhancedClauseDetail";



/**
 * Use effect qui va run les recherches necessaires liée à la jurisprudence
 * @param clause 
 * @param setKeywordSearches 
 * @param setIsLoadingDecisions 
 * @param setAutomaticDecisions 
 * @param jurisprudenceCache 
 */
export const useRun = (
    clause: ClauseRisk,
    setKeywordSearches: Dispatch<SetStateAction<{ query: string, url: string }[]>>,
    setIsLoadingDecisions: Dispatch<SetStateAction<boolean>>,
    setAutomaticDecisions: Dispatch<SetStateAction<JurisprudenceCase[]>>,
    jurisprudenceCache: Record<string, JurisprudenceCase[]>

) => {

    const CASES_CACHE_TTL = 10 * 60 * 1000
    const jurisprudenceCacheTime: Record<string, number> = {}

    useEffect(() => {
        const run = async () => {
            if (!clause) return;
            const key = clause.id;
            // Valid cache
            if (jurisprudenceCache[key] && jurisprudenceCacheTime[key] && Date.now() - jurisprudenceCacheTime[key] < CASES_CACHE_TTL) {
                setAutomaticDecisions(jurisprudenceCache[key]);
                setIsLoadingDecisions(false);
                setKeywordSearches(getKeywordSearchLinks(clause));
                return;
            }
            setIsLoadingDecisions(true);
            setKeywordSearches(getKeywordSearchLinks(clause));
            try {
                const dec = await getAutomaticDecisions(clause);
                jurisprudenceCache[key] = dec;
                jurisprudenceCacheTime[key] = Date.now();
                setAutomaticDecisions(dec);
            } catch { setAutomaticDecisions([]); }
            setIsLoadingDecisions(false);
            perfMark(`clause:${key}:cases_ready`);
            perfMeasure(`clause:${key}:time_to_cases`, `clause:${key}:open`, `clause:${key}:cases_ready`);
        };
        run();


    }, [clause])
}