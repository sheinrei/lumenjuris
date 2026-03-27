import React, {  useState } from "react";
import { ClauseRisk, ClauseRecommendation } from "../types";
import { useAppliedRecommendationsStore } from "../store/appliedRecommendationsStore";
import { useDocumentTextStore } from "../store/documentTextStore";
import { findBestClauseSpan } from "../utils/textPatchLocator";

interface PropsModaleTextEditor {
    clause: ClauseRisk;
    onClose: () => void;
    recommendationIndex: number;
    setRecommendationIndex : (number:number)=> void
}

export const ModaleTextEditor: React.FC<PropsModaleTextEditor> = ({
    clause,
    onClose,
    recommendationIndex,
    setRecommendationIndex
}) => {

    
    const [modifiedClauseContent, setModifiedClauseContent] = useState(clause?.content || "");
    const { applyRecommendation, removeAppliedRecommendation, getAllRecommendation } = useAppliedRecommendationsStore();
    const applyPatch = useDocumentTextStore(s => s.applyPatch);
    const originalTextGlobal = useDocumentTextStore(s => s.originalText);



    console.log("l'index de reco :", recommendationIndex)

    const manualRecommendation: ClauseRecommendation = {
        title: "Modification manuelle",
        riskReduction: "Ajustement manuel du texte de la clause",
        clauseText: modifiedClauseContent,
        benefits: "Permet d’adapter précisément la clause au contexte du client",
    };

    const allReco = getAllRecommendation();


    const handleSave = () => {
        if (!clause) return;

        const clauseId = clause.id;

        // trouver et supprimer l'ancien patch/recommendation s'il existe
        const alreadyExist = allReco.find(r => r.clauseId === clauseId);
        if (alreadyExist) {
            console.log("Suppression de l'ancienne recommendation:", alreadyExist)
            removeAppliedRecommendation(clauseId, alreadyExist.recommendationIndex)

            const removePatch = useDocumentTextStore.getState().removePatch;
            const oldKey = `${clauseId}:${alreadyExist.recommendationIndex}`
            removePatch(oldKey)
        }

        // créer la nouvelle recommendation avec un nouvel index
        setRecommendationIndex(recommendationIndex)
        const currentIndex = recommendationIndex
        const recommendationKey = `${clauseId}:${currentIndex}`

        applyRecommendation(
            clauseId,
            currentIndex,
            manualRecommendation,
            clause
        );

        // Appliquer le nouveau patch
        const anchor = findBestClauseSpan(originalTextGlobal, clause)
        if (!anchor) {
            console.error("Impossible de trouver l'ancrage de la clause")
            return
        }

        applyPatch({
            clauseId,
            recommendationKey,
            startOrig: anchor.start,
            endOrig: anchor.end,
            newSlice: modifiedClauseContent,
            originalSlice: clause.content,
        });

        onClose()
    };





    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg p-6 w-[600px] max-w-full">
                <h2 className="text-lg font-bold mb-4">Édition manuelle de la clause</h2>

                <p className="mb-2 text-sm text-slate-600">Texte actuel de cette clause :</p>

                <textarea
                    className="w-full h-40 border rounded p-2 text-sm leading-relaxed"
                    value={modifiedClauseContent}
                    onChange={(e) => {
                        setModifiedClauseContent(e.target.value)
                    }}
                />

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-3 py-1 border rounded">
                        Annuler
                    </button>

                    <button
                        onClick={handleSave}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Sauvegarder
                    </button>
                </div>
            </div>
        </div>
    );
};