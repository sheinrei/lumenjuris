import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, FolderPlus, Loader2 } from "lucide-react";
import { contractApi } from "../DashboardComponents/contratheque/api";
import type { ContractAnalysis } from "../../types";
import type { AnalysisContext } from "../../types/contextualAnalysis";

/**
 * Enregistre le contrat analysé dans la contrathèque.
 * Reprend le texte extrait (`ocrText` → recherche plein texte + veille par type)
 * et le type de contrat détecté. Statut initial DRAFT : c'est un import à
 * compléter, pas un contrat validé.
 */
export function AddToContrathequeButton({
  contract,
  context,
}: {
  contract: ContractAnalysis;
  context?: AnalysisContext | null;
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [createdId, setCreatedId] = useState<string | null>(null);

  const btnBase =
    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const btnGhost = `${btnBase} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300`;
  const btnDone = `${btnBase} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`;

  const handleAdd = async () => {
    if (state === "saving") return;
    setState("saving");
    try {
      const title =
        (contract.fileName || "Contrat analysé").replace(/\.[^.]+$/, "").trim() ||
        "Contrat analysé";
      const contractType =
        (context?.contractType || contract.contractType || "").trim() || null;

      const { id } = await contractApi.create({
        title,
        contractType,
        ocrText: contract.content,
        status: "DRAFT",
      });
      setCreatedId(id);
      setState("done");
      toast.success("Ajouté à la contrathèque.");
    } catch (e) {
      setState("idle");
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        /403|éditeur|editor/i.test(msg)
          ? "Réservé aux rôles Juriste et Administrateur."
          : "Échec de l'ajout à la contrathèque.",
      );
    }
  };

  if (state === "done" && createdId) {
    return (
      <button
        onClick={() => navigate(`/contratheque/${createdId}`)}
        className={btnDone}
        title="Ouvrir la fiche dans la contrathèque"
      >
        <Check className="w-4 h-4" />
        Ajouté — voir la fiche
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={state === "saving"}
      className={btnGhost}
      title="Enregistrer ce contrat dans la contrathèque"
    >
      {state === "saving" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FolderPlus className="w-4 h-4" />
      )}
      {state === "saving" ? "Ajout…" : "Ajouter à la contrathèque"}
    </button>
  );
}
