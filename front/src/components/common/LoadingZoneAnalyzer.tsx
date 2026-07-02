import { useState, useEffect } from "react"
import { AnalysisProgress } from "../../types/analysisProgress";



const TARGET_DURATION_MS = 53000;

const MSG_INTERVAL_MS = TARGET_DURATION_MS / 4
const PROGRESS_STEPS = 80;
const PROGRESS_INTERVAL_MS = TARGET_DURATION_MS / PROGRESS_STEPS


type PhaseMessage = { main: string; sub: string | null };

const PHASE_CONFIG: Record<
    string,
    { label: string; pctRange: [number, number]; messages: PhaseMessage[] }
> = {
    analysis: {
        label: "Analyse du document",
        pctRange: [1, 97],
        messages: [
            {
                main: "Lecture du contrat",
                sub: "Compréhension de la structure du document",
            },
            {
                main: "Analyse du contenu",
                sub: "Comprendre les enjeux du document",
            },
            {
                main: "Détection des clauses",
                sub: "Évaluation des risques juridiques",
            },
            {
                main: "Génération du rapport",
                sub: "Organisation des résultats de l'analyse",
            },],
    },
};




function useLoadingAnimation(phase: string, isActive: boolean) {
    const [pct, setPct] = useState(0);
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        const config = PHASE_CONFIG[phase];
        if (!config) return;

        const [startPct, endPct] = config.pctRange;
        setPct(startPct);
        setMsgIndex(0);

        const pctStep = (endPct - startPct) / PROGRESS_STEPS;

        const progressTimer = setInterval(() => {
            setPct((prev) => {
                const next = prev + pctStep;
                return next >= endPct ? endPct : next;
            });
        }, PROGRESS_INTERVAL_MS);

        const msgTimer = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % config.messages.length);
        }, MSG_INTERVAL_MS);

        return () => {
            clearInterval(progressTimer);
            clearInterval(msgTimer);
        };
    }, [phase, isActive]);

    const config = PHASE_CONFIG[phase];
    const currentMsg = config?.messages[msgIndex] ?? { main: "Chargement…", sub: null };
    const phaseLabel = config?.label ?? "";

    if (pct >= 97) {
        return {
            pct: 99,
            phaseLabel: "Finalisation de l'analyse",
            currentMsg: {
                main: "Préparation du rendu final",
                sub: "Génération des clauses détectées"
            },
        }
    }

    return { pct: Math.round(pct), currentMsg, phaseLabel };
}



interface LoadingZoneProps {
    phase: string;
    analysisProgress?: AnalysisProgress | null;
}

export function LoadingZoneAnalyzer({ phase, analysisProgress }: LoadingZoneProps) {
    const isRetrying = (analysisProgress?.currentAttempt ?? 1) > 1;
    const { pct, currentMsg, phaseLabel } = useLoadingAnimation(phase, !isRetrying);

    const displayMain = isRetrying
        ? `Nouvelle tentative ${analysisProgress?.currentAttempt}/${analysisProgress?.totalAttempts}`
        : currentMsg.main;
    const displaySub = isRetrying ? "Une erreur est survenue, réessai en cours…" : currentMsg.sub;
    const displayPct = isRetrying ? null : pct;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            {/* En-tête de phase */}
            <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-blue-600">{phaseLabel}</span>
                {displayPct !== null && (
                    <span className="text-sm text-gray-400">{displayPct} %</span>
                )}
            </div>

            {/* Barre de progression */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-6">
                {isRetrying ? (
                    <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: "100%", animation: "pulse 1.5s ease-in-out infinite" }}
                    />
                ) : (
                    <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out relative overflow-hidden"
                        style={{ width: `${pct}%` }}
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                                animation: "shimmer 2s ease-in-out infinite",
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="space-y-1 min-h-[2.5rem]">
                <p className="text-sm text-gray-700 transition-all duration-300">{displayMain}</p>
                {displaySub && (
                    <p className="text-xs text-gray-400 transition-all duration-300">{displaySub}</p>
                )}
            </div>

            {/* Points animés */}
            <div className="flex gap-1.5 justify-center mt-6">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full bg-blue-300"
                        style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                    />
                ))}
            </div>

            <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(100%); opacity: 1; }
        }
      `}</style>
        </div>
    );
}