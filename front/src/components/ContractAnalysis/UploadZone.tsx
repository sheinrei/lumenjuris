import React from "react";
import { TextInputZone } from "./TextInputZone";
import { FileText, Brain, BarChart3, FileCheck } from "lucide-react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onTextSubmit: (text: string, fileName: string) => void;
  isProcessing: boolean;
  processingPhase?: string;
  analyseCredit?: number | null;
}

/**
 * Point d'entrée principal pour l'import d'un contrat.
 *
 * Les étapes de traitement suivies sont (dans l'ordre) :
 * `"extraction"` → `"analysis"` → `"scoring"` → `"report"`.
 * La progression de la barre est calculée proportionnellement à l'index
 * de l'étape courante dans ce tableau.
 *
 * @example
 * ```tsx
 * <UploadZone
 *   onFileSelect={(file) => handleFile(file)}
 *   onTextSubmit={(text, name) => handleText(text, name)}
 *   isProcessing={isLoading}
 *   processingPhase={currentPhase}  // ex: "analysis"
 *   analyseCredit={user.credits}
 * />
 * ```
 *
 * @param onFileSelect     Callback transmis à `TextInputZone.onFileUpload`.
 *                         Reçoit l'objet `File` validé par `TextInputZone`.
 * @param onTextSubmit     Callback transmis à `TextInputZone.onTextSubmit`.
 *                         Reçoit le texte et le nom de fichier auto-généré.
 * @param isProcessing     Contrôle le basculement entre la zone d'import et
 *                         l'écran de chargement. Doit rester `true` jusqu'à la
 *                         fin complète du pipeline d'analyse.
 * @param processingPhase  Identifiant de l'étape en cours parmi :
 *                         `"extraction"` | `"analysis"` | `"scoring"` | `"report"`.
 *                         Utilisé pour calculer la progression de la barre et
 *                         mettre en évidence l'étape active. Optionnel.
 * @param analyseCredit    Solde de crédits passé en transparence à `TextInputZone`.
 *                         En dessous de 100, les interactions sont bloquées.
 */
export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelect,
  onTextSubmit,
  isProcessing,
  processingPhase,
  analyseCredit,
}) => {
  // Définition des étapes avec leurs détails
  const steps = [
    {
      id: "extraction",
      label: "Extraction du contenu",
      icon: <FileText className="w-5 h-5" />,
      description: "Lecture et extraction du texte du document",
    },
    {
      id: "analysis",
      label: "Analyse IA",
      icon: <Brain className="w-5 h-5" />,
      description:
        "Détection des clauses à risque par intelligence artificielle",
    },
    {
      id: "scoring",
      label: "Calcul des scores",
      icon: <BarChart3 className="w-5 h-5" />,
      description: "Évaluation du niveau de risque de chaque clause",
    },
    {
      id: "report",
      label: "Génération du rapport",
      icon: <FileCheck className="w-5 h-5" />,
      description: "Préparation de l'analyse complète",
    },
  ];

  // Calculer le progrès basé sur l'étape actuelle
  const getCurrentStepIndex = () => {
    if (!processingPhase) return -1;
    return steps.findIndex((step) => step.id === processingPhase);
  };

  const currentStepIndex = getCurrentStepIndex();
  const progress = isProcessing
    ? ((currentStepIndex + 1) / steps.length) * 100
    : 0;

  // Si en cours de traitement, afficher la zone de chargement À LA PLACE du drag & drop
  if (isProcessing) {
    return (
      <div className="bg-white border border-blue-200 rounded-xl p-8 shadow-lg text-center">
        {/* Spinner et message simple */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <h3 className="text-lg font-semibold text-gray-900">
            📄 Chargement en cours...
          </h3>
          <p className="text-sm text-gray-600 max-w-md">
            Extraction et préparation de votre document pour l'analyse
          </p>
          <progress
            value={progress}
            max="100"
            className="w-full h-3 appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-blue-500 [&::-webkit-progress-value]:to-indigo-500 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-gradient-to-r [&::-moz-progress-bar]:from-blue-500 [&::-moz-progress-bar]:to-indigo-500"
          ></progress>
        </div>
      </div>
    );
  }

  // Sinon, afficher la zone normale de drag & drop
  return (
    <TextInputZone
      onTextSubmit={onTextSubmit}
      onFileUpload={onFileSelect}
      isProcessing={false}
      analyseCredit={analyseCredit}
    />
  );
};
