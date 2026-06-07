import { useState } from "react";
import { X } from "lucide-react";
import { SignatureDashboard } from "./signature/SignatureDashboard";
import { SignatureWizard } from "./signature/SignatureWizard";

/**
 * Point d'entrée du module Signature (route `/signature`).
 *
 * Le tableau de bord est toujours visible. Cliquer "Nouveau contrat" ouvre
 * le wizard dans un panneau modal qui se superpose au dashboard sans
 * navigation — pas de "nouvelle page", pas de bouton retour superflu.
 */
export function Signature() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function openWizard() { setWizardOpen(true); }
  function closeWizard() { setRefreshKey((k) => k + 1); setWizardOpen(false); }

  return (
    <>
      {/* Dashboard toujours rendu en arrière-plan */}
      <SignatureDashboard
        refreshKey={refreshKey}
        onNewContract={openWizard}
      />

      {/* Overlay wizard — s'ouvre par-dessus le dashboard */}
      {wizardOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 backdrop-blur-[2px] overflow-y-auto py-6 px-4">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
            {/* Bouton fermer */}
            <button
              onClick={closeWizard}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <SignatureWizard
              onSent={closeWizard}
              onExit={closeWizard}
            />
          </div>
        </div>
      )}
    </>
  );
}
