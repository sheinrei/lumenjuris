import { escapeHtml } from "./escapeHtml";
import { InlineClauseEditor } from "../../components/InlineClauseEditor";
import { TextPatch } from "../../store/documentTextStore";
import { ClauseRisk } from "../../types";




//Functions utilitaires


// Set un element React pour chaque fragment de texte
const setDiv = (index: number, string: string) => (<div
    key={`paragraph-${index}-${string.substring(0, 30)}`}
    className="mb-4 leading-relaxed text-gray-800"
    dangerouslySetInnerHTML={{ __html: string }}
/>)


// Set un element React pour un titre
const setTitle = (index: number, string: string) => (<div
    key={`title-${index}-${string.substring(0, 30)}`}
    className="mb-6 mt-8">
    <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
        {string.replace(/^##\s*/, '')}
    </h3>
</div>)


// Detection de titre dans le texte
const searchTitle = (string: string) => string.length < 100 && (
    string === string.toUpperCase() ||
    string.startsWith('ARTICLE') ||
    string.startsWith('CHAPITRE') ||
    string.startsWith('##') ||
    /^[IVX]+\./.test(string)
)

const setCssClause = (clauseRisk: number) => {
    const map: Record<number, string> = {
        1: "bg-green-100 border-green-200",
        2: "bg-green-100 border-green-200",
        3: "bg-orange-100 border-orange-200",
        4: "bg-orange-100 border-orange-200",
        5: "bg-red-100 border-red-200",
        10: "bg-blue-100 border-blue-200"
    };
    return (map[clauseRisk] || "bg-orange-200") + " cursor-pointer select-none border-b-2 leading-[30px] p-[1px]";
}







interface ParamFormatContent {
    text: string,
    clauseRiskRange: any,
    patches: TextPatch[],
    clauses: ClauseRisk[],
    editingClauseId: string | null,
    setEditingClauseId: React.Dispatch<React.SetStateAction<string | null>>,
    recommendationIndex: number,
    setRecommendationIndex: (number: number) => void,
    handleClickSpanClause: (clauseId: string) => void
}
export const formatContent = ({
    text,
    clauseRiskRange,
    patches,
    clauses,
    editingClauseId,
    setEditingClauseId,
    recommendationIndex,
    setRecommendationIndex,
    handleClickSpanClause,
}: ParamFormatContent) => {
    if (!text.trim()) return [];


    let transformed = text;
    const FragmentTextBrut: React.ReactNode[] = []
    let cursor = 0


    for (const range of clauseRiskRange) {
        const { start, end, clauseId } = range
        const before: string = transformed.slice(cursor, start)
        const clause: string = transformed.slice(start, end);
        FragmentTextBrut.push(escapeHtml(before));

        const isPatched = patches.some(p => p.clauseId == clauseId && p.active == true)
        let currentPatchText;
        if (isPatched) {
            currentPatchText = patches.find(p => p.clauseId === clauseId  && p.active === true)?.newSlice
        }


        const parsedClause = escapeHtml(isPatched ? currentPatchText! : clause).replace(/\n\n/g, '<br />')

        const targetClause = clauses.find(c => c.id === clauseId);


        // Si cette clause est en cours d'édition, afficher l'éditeur de text
        if (editingClauseId === clauseId && targetClause) {
            FragmentTextBrut.push(
                <InlineClauseEditor
                    key={`editor-${clauseId}`}
                    clause={targetClause}
                    text={isPatched ? currentPatchText! : clause}
                    onCancel={() => setEditingClauseId(null)}
                    recommendationIndex={recommendationIndex}
                    setRecommendationIndex={setRecommendationIndex}
                />
            );
        } else {
            // Sinon, afficher le span cliquable normal
            const clauseRisk = clauses.find(c => c.id == clauseId)?.riskScore
            FragmentTextBrut.push(
                <span
                    key={clauseId}
                    className={setCssClause(isPatched ? 10 : clauseRisk!)}
                    data-clause-risk-id={clauseId}
                    dangerouslySetInnerHTML={{ __html: parsedClause }}
                    onPointerUp={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleClickSpanClause(clauseId)
                    }}
                />
            );
        }
        cursor = end;
    }


    // Toutes les clauses sont injectées, on ajoute la fin du texte
    if (cursor < transformed.length) {
        FragmentTextBrut.push(transformed.slice(cursor))
    }


    return FragmentTextBrut.flatMap((fragment): React.ReactNode[] => {
        if (typeof fragment !== 'string') return [fragment]

        const paragraphs = fragment
            .split('\n\n')
            .filter(p => p.trim())

        return paragraphs.map((p: any, index: any): React.ReactNode => {
            if (searchTitle(p)) return setTitle(index, p);
            return setDiv(index, p.trim())
        })
    })
}
