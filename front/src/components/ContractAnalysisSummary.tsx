
import { AnalysisContext } from "../types/contextualAnalysis";

interface ContractAnalysisSummaryProps {
    contractSummary?: AnalysisContext
}

export const ContractAnalysisSummary = ({
    contractSummary,
}: ContractAnalysisSummaryProps) => {

    if (!contractSummary) {
        console.log(
            "%c[Data contractAnalysis]",
            "background:grey; padding:5px; font-weight:bold ; border-radius:5px",
            "Les détails de l'analyse du contract ne sont pas disponible."
        )
        return null
    }

    const Header = () => (
        <div className="w-80 bg-white  border-gray-200 flex flex-col h-fit">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    📝 Détails de l'analyse du contrat
                </h3>
            </div>
        </div>
    )

    const renderRow = (label: string, value: string) => (
        <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-500">{label}</span>
            <span className="text-gray-900 bg-gray-50 p-2 rounded-md shadow-sm">{value}</span>
        </div>
    )

    let {
        contractType,
        industry,
        userRole,
        mission,
    } = contractSummary;



    return (
        <div className="w-80 bg-white border-l flex flex-col h-fit">
            {/* Header */}
            <Header />

            {/* Content contractAnalysis*/}
            <div className="flex-1 flex gap-1 flex-col overflow-y-auto p-4 space-y-3">

                {contractType && renderRow("Le type du contrat", contractType)}
                {industry && renderRow("Secteur d'activité", industry)}
                {userRole && renderRow("Votre rôle", userRole)}
                {mission && renderRow("Contexte de la mission", mission)}

            </div>
        </div>
    )
}