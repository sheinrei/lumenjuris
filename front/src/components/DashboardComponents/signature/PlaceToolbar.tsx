import type { FieldType } from "./types";

interface Props {
  /** Type de champ armé — non affiché ici, gardé pour compatibilité avec PlaceStep. */
  armedFieldType?: FieldType | null;
  replicateAllPages: boolean;
  /** Toujours appelé avec "signature" — gardé pour compatibilité avec PlaceStep. */
  onArmFieldType: (type: FieldType) => void;
  onReplicateAllPagesChange: (value: boolean) => void;
}

/**
 * Barre latérale de l'étape "Placer" : case "Toutes les pages" pour dupliquer
 * le champ sur chaque page du document.
 *
 * Le choix du signataire actif (Vous / Cocontractant) vit désormais dans la
 * checklist de progression (PlaceStep) — un seul bloc, pas deux qui se
 * chevauchaient.
 *
 * Le type de champ est toujours "signature" et le placement est toujours
 * actif — l'utilisateur clique directement sur le PDF pour poser un champ.
 */
export function PlaceToolbar({
  replicateAllPages, onReplicateAllPagesChange,
}: Props) {
  return (
    <aside className="space-y-4">
      <AllPagesToggle
        replicateAllPages={replicateAllPages}
        onChange={onReplicateAllPagesChange}
      />
    </aside>
  );
}

/** Case "Toutes les pages" — duplique le champ sur chaque page du document. */
function AllPagesToggle({
  replicateAllPages, onChange,
}: {
  replicateAllPages: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={replicateAllPages}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-[#354F99] focus:ring-[#354F99]/30"
        />
        <div>
          <p className="text-xs font-semibold text-gray-700">Toutes les pages</p>
          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
            Le champ sera dupliqué à la même position sur chaque page.
          </p>
        </div>
      </label>
    </div>
  );
}
