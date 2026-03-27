import { useState, useRef, useEffect } from "react"
import { ClauseRisk } from "../types";
import { ClauseRecommendation } from "../types";
import { useAppliedRecommendationsStore } from "../store/appliedRecommendationsStore";
import { useDocumentTextStore } from "../store/documentTextStore";
import { findBestClauseSpan } from "../utils/textPatchLocator";

interface PropsInlineClauseEditor {
    clause: ClauseRisk;
    text: string;
    onCancel: () => void;
    recommendationIndex: number;
    setRecommendationIndex: (number: number) => void
}


export const InlineClauseEditor: React.FC<PropsInlineClauseEditor> = ({
    clause,
    text,
    onCancel,
    recommendationIndex,
    setRecommendationIndex
}) => {

    const { applyRecommendation, removeAppliedRecommendation, getAllRecommendation } = useAppliedRecommendationsStore();
    const applyPatch = useDocumentTextStore(s => s.applyPatch);
    const originalTextGlobal = useDocumentTextStore(s => s.originalText);
    const [clauseNewText, setClauseNewText] = useState(text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);


    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 10 + 'px' //+10  pour eviter la scrollbar
        }
    }, []);


    const handleSave = () => {
        if (clauseNewText.trim() !== text.trim()) {
            const manualRecommendation: ClauseRecommendation = {
                title: "Modification manuelle",
                riskReduction: "Ajustement manuel du texte de la clause",
                clauseText: clauseNewText,
                benefits: "Permet d’adapter précisément la clause au contexte du client",
            };
            const allReco = getAllRecommendation();
            if (!clause) return;

            const clauseId = clause.id;

            // trouver et supprimer l'ancien patch/recommendation si il y en a
            const alreadyExist = allReco.find(r => r.clauseId === clauseId)

            if (alreadyExist) {
                removeAppliedRecommendation(clauseId, alreadyExist.recommendationIndex)

                const removePatch = useDocumentTextStore.getState().removePatch;
                const oldKey = `${clauseId}:${alreadyExist.recommendationIndex}`
                removePatch(oldKey)
            }

            // créer la nouvelle recommendation avec un nouvel index
            setRecommendationIndex(recommendationIndex)
            const currentIndex = recommendationIndex + 1
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
                newSlice: clauseNewText,
                originalSlice: clause.content,
            });
            onCancel()
        } else {
            onCancel();
        }
    };




    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setClauseNewText(e.target.value);
        // Auto-resize
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 10 + 'px';
    };





    //Retour du JSX
    return (
        <div className="relative inline-block w-full my-2">
            <textarea
                id={clause.id}
                ref={textareaRef}
                value={clauseNewText}
                onChange={handleTextChange}
                onFocus={(e) => {
                    const el = e.target
                    const length = el.value.length
                    el.setSelectionRange(length, length)

                }}
                className="w-full p-3 border-2 border-yellow-400 rounded-lg bg-yellow-50/50 
                   focus:outline-none resize-none shadow-sm"
            /* onBlur={onCancel} */
            />
            <div className="flex gap-2 mt-2 justify-end">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 
                     rounded-md transition-colors font-medium"
                >
                    Retour
                </button>
                <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 
                     text-white rounded-md transition-colors font-medium"
                >
                    Sauvegarder
                </button>

                {/* Pour le futur fonctionnalitée à mettre en place -> retour du texte à son état d'origine. 
                On peut aller chercher le fonctionnement de "retirer" dans enhancedClause on voudrai le même comportement ici. */}
                {false  && ( //if le text est modifié et est actif
                    <button
                        className="px-3 py-1.5 text-sm bg-red-500  hover:bg-red-700 
                     text-white rounded-md transition-colors font-medium"
                    >
                        Remettre le text d'origine
                    </button>
                )}
            </div>
        </div>
    )
}
