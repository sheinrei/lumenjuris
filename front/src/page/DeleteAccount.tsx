import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import { getParamConfirmationModalContent } from "../utils/param/paramSettings";
import { fetchProxy } from "../utils/fetchProxy";
import { AlertBanner } from "../components/common/AlertBanner";

type AccountConfirmationModal = "export_data" | "delete_account";

export function ConfirmDeleteAccountPage() {
  const { token } = useParams<{ token: string }>();

  const [activeConfirmationModal, setActiveConfirmationModal] =
    useState<AccountConfirmationModal | null>(null);
  const [exportDataSuccess, setExportDataSuccess] = useState(false);
  const [exportDataError, setExportDataError] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reasonDeparture, setReasonDeparture] = useState("");
  const [customReason, setCustomReason] = useState("");

  const confirmationModalContent = getParamConfirmationModalContent({
    activeConfirmationModal,
    onClose: () => setActiveConfirmationModal(null),

    onExportDataConfirm: () => {
      void fetchProxy("/api/user/export-data", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: token ? JSON.stringify({ token }) : undefined,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          const result = await response.json();
          if (!result.success) throw new Error();

          setActiveConfirmationModal(null);
          setExportDataSuccess(true);
        })
        .catch(() => {
          setActiveConfirmationModal(null);
          setExportDataError(true);
        });
    },

    onDeleteAccountConfirm: () => {
      setLoading(true);
      setDeleteError("");

      void fetchProxy(`/api/user/confirm-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: token
          ? JSON.stringify({
              token,
              reason: reasonDeparture === "autre" ? customReason : reasonDeparture,
            })
          : undefined,
      })
        .then(async (response) => {
          const result = await response.json();
          if (response.ok && result.success) {
            window.location.href = "https://www.lumenjuris.com/";
          } else {
            throw new Error(result.message || "Lien invalide ou expiré");
          }
        })
        .catch((error) => {
          setDeleteError(
            error.message || "Une erreur est survenue lors de la suppression.",
          );
        })
        .finally(() => {
          setActiveConfirmationModal(null);
          setLoading(false);
        });
    },

    onTwoFactorConfirm: () => {},
    onPasswordConfirm: () => {},
    onProfileUpdateConfirm: () => {},
    onSendMailDeleteAccountConfirm: () => {},
  });

  return (
    <div className="max-w-xl mx-auto my-8 p-6 bg-white rounded-xl border border-slate-100 shadow-sm space-y-6">
      
      {/* Alertes de statut */}
      {exportDataSuccess && (
        <AlertBanner
          title="Export demandé avec succès !"
          variant="success"
          detail="Un e-mail contenant toutes les informations liées à votre compte vous a été envoyé."
          duration={10000}
          onClose={() => setExportDataSuccess(false)}
        />
      )}
      {exportDataError && (
        <AlertBanner
          title="Échec de l'exportation !"
          variant="error"
          detail="Une erreur est survenue lors de la récupération de vos données. Veuillez réessayer."
          duration={10000}
          onClose={() => setExportDataError(false)}
        />
      )}
      {deleteError && (
        <AlertBanner
          title="Erreur de suppression"
          variant="error"
          detail={deleteError}
          duration={10000}
          onClose={() => setDeleteError("")}
        />
      )}

      {/* En-tête */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Suppression de votre compte</h1>
        <p className="text-sm text-slate-500">
          Nous sommes désolés de vous voir partir. Votre décision est définitive et effacera toutes vos données.
        </p>
      </div>

      {/* Section 1 : Motif de départ */}
      <div className="space-y-3 pt-2">
        <label htmlFor="delete-reason" className="block text-sm font-medium text-slate-700">
          Pourquoi souhaitez-vous nous quitter ? <span className="text-red-500">*</span>
        </label>
        <select
          id="delete-reason"
          value={reasonDeparture}
          onChange={(e) => setReasonDeparture(e.target.value)}
          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition outline-none cursor-pointer"
        >
          <option value="">Sélectionnez une raison</option>
          <option value="plus_utilise">Je n'utilise plus le service</option>
          <option value="trop_cher">Trop cher</option>
          <option value="autre_outil">Je préfère un autre outil</option>
          <option value="technique">Problème technique</option>
          <option value="confidentialite">Confidentialité / Données personnelles</option>
          <option value="autre">Autre raison...</option>
        </select>

        {reasonDeparture === "autre" && (
          <textarea
            placeholder="Dites-nous en plus pour nous aider à nous améliorer..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg text-sm h-28 focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition outline-none resize-none"
            maxLength={1000}
          />
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Section 2 : Sauvegarde / Box Export */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-900">Pensez à sauvegarder vos données</h4>
          <p className="text-xs text-slate-600 max-w-sm">
            Souhaitez-vous télécharger une copie de vos informations de compte avant leur suppression irréversible ?
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setActiveConfirmationModal("export_data")}
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 text-xs py-2 whitespace-nowrap self-start md:self-center"
        >
          Récupérer mes données
        </Button>
      </div>

      {/* Section 3 : Action finale */}
      <div className="pt-4 flex flex-col sm:flex-row sm:justify-end gap-3">
        <Button
          className="bg-red-600 text-white hover:bg-red-700 px-5 py-2.5 font-medium rounded-lg shadow-sm shadow-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          disabled={loading || !reasonDeparture || (reasonDeparture === "autre" && !customReason.trim())}
          onClick={() => setActiveConfirmationModal("delete_account")}
        >
          {loading ? "Suppression..." : "Supprimer mon compte"}
        </Button>
      </div>

      {/* Modale de confirmation */}
      {confirmationModalContent ? (
        <ConfirmationModal
          open
          title={confirmationModalContent.title}
          description={confirmationModalContent.description}
          confirmLabel={confirmationModalContent.confirmLabel}
          confirmClassName={confirmationModalContent.confirmClassName}
          onCancel={() => setActiveConfirmationModal(null)}
          onConfirm={confirmationModalContent.onConfirm}
        />
      ) : null}
    </div>
  );
}
