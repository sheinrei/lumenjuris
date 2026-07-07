import React from "react";
import {
  Share2,
  FileText,
  CheckCircle,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { useDocumentTextStore } from "../../store/documentTextStore";
import { useAppliedRecommendationsStore } from "../../store/appliedRecommendationsStore";

interface ActionButtonsProps {
  onShareReport: () => void;
  isProcessed: boolean;
  originalContent?: string;
  htmlContent?: string | null;
  fileName?: string;
  onRelaunchAnalysis?: () => void;
  isRelaunchingAnalysis?: boolean;
  onSuggestedClauses?: () => void;
  isLoadingSuggested?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onShareReport,
  isProcessed,
  originalContent,
  htmlContent,
  fileName,
  onRelaunchAnalysis,
  isRelaunchingAnalysis = false,
  onSuggestedClauses,
  isLoadingSuggested = false,
}) => {
  const patches = useDocumentTextStore((state) => state.patches);
  const activePatchCount = patches.filter((p) => p.active).length;
  const generateWordDocument = useAppliedRecommendationsStore(
    (s) => s.generateWordDocument,
  );

  const btnBase =
    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const btnGhost = `${btnBase} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300`;
  const btnExport = `${btnBase} bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm`;
  const btnExportDisabled = `${btnBase} bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed`;

  return (
    <div className=" px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onShareReport} className={btnGhost}>
            <Share2 className="w-4 h-4" />
            Partager
          </button>

          {generateWordDocument && (
            <button
              onClick={() =>
                generateWordDocument(
                  originalContent,
                  fileName,
                  htmlContent ?? undefined,
                )
              }
              disabled={!isProcessed}
              className={isProcessed ? btnExport : btnExportDisabled}
              title="Exporter le document en .docx"
            >
              <FileText className="w-4 h-4" />
              Export Word
            </button>
          )}

          {onRelaunchAnalysis && (
            <button
              onClick={onRelaunchAnalysis}
              disabled={isRelaunchingAnalysis}
              className={btnGhost}
              title="Relancer une nouvelle analyse complète"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRelaunchingAnalysis ? "animate-spin" : ""}`}
              />
              {isRelaunchingAnalysis
                ? "Analyse en cours…"
                : "Relancer l'analyse"}
            </button>
          )}

          {onSuggestedClauses && (
            <button
              onClick={onSuggestedClauses}
              disabled={isLoadingSuggested}
              className={btnGhost}
              title="Voir les clauses suggérées"
            >
              <Lightbulb className="w-4 h-4" />
              {isLoadingSuggested ? "Analyse en cours…" : "Clauses suggérées"}
            </button>
          )}
        </div>

        {activePatchCount > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {activePatchCount} recommandation{activePatchCount > 1 ? "s" : ""}{" "}
            appliquée{activePatchCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
};
