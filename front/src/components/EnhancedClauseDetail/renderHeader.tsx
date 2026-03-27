import { ClauseRisk } from "../../types";
import { Copy, X } from "lucide-react"
import { copyToClipboard } from "../EnhancedClauseDetail";




export function renderHeader(
    longText: string,
    clause:ClauseRisk,
    onClose:() => void,
) {
    if (!clause) return null;
    return (
        <header className="flex-shrink-0 flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">{clause!.type}</h3>
            </div>
            <div className="flex gap-3">
                <button onClick={() => copyToClipboard(longText)} title="Copier la clause">
                    <Copy size={16} />
                </button>
                <button onClick={onClose} title="Fermer">
                    <X size={18} />
                </button>
            </div>
        </header>
    );
}