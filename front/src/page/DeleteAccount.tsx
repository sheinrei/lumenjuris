import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import { getParamConfirmationModalContent } from "../utils/param/paramSettings";
import { fetchProxy } from "../utils/fetchProxy";
import { AlertBanner } from "../components/common/AlertBanner";

type AccountConfirmationModal = "export_data" | "delete_account";

export function ConfirmDeleteAccountPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [activeConfirmationModal, setActiveConfirmationModal] =
    useState<AccountConfirmationModal | null>(null);
  const [exportDataSuccess, setExportDataSuccess] = useState(false);
  const [exportDataError, setExportDataError] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);

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
        body: token ? JSON.stringify({ token }) : undefined,
      })
        .then(async (response) => {
          const result = await response.json();
          if (response.ok && result.success) {
            navigate("/logout?deleted=true");
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
    <div className="p-6 max-w-xl mx-auto text-center space-y-6">
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
      <h1 className="text-2xl font-bold">Suppression de votre compte</h1>
      <p>
        Souhaitez-vous récupérer vos données avant de supprimer définitivement
        votre compte ?
      </p>

      {exportDataSuccess && (
        <p className="text-green-600">E-mail d'export envoyé !</p>
      )}
      {exportDataError && <p className="text-red-600">L'export a échoué.</p>}
      {deleteError && <p className="text-red-600">{deleteError}</p>}

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => setActiveConfirmationModal("export_data")}
        >
          Récupérer mes données
        </Button>

        <Button
          className="bg-red-600 text-white hover:bg-red-700"
          disabled={loading}
          onClick={() => setActiveConfirmationModal("delete_account")}
        >
          {loading ? "Suppression..." : "Supprimer mon compte"}
        </Button>
      </div>

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
