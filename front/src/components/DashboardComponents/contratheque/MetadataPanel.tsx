import { useState } from "react";
import { Check, Pencil, Sparkles, ShieldCheck, X, Loader2 } from "lucide-react";
import { FIELD_LABEL } from "./types";
import type { MetadataField, ValidationStatus } from "./types";

interface Props {
  fields: MetadataField[];
  onValidate: (fieldKey: string, value: string | null, status: ValidationStatus) => Promise<void>;
}

const DATE_FIELDS = ["signature_date", "effective_date", "end_date"];

/**
 * Rang d'affichage d'un champ : validé (en avant) > renseigné > info manquante
 * (en bas). Permet de mettre en avant ce qui est confirmé et de reléguer ce
 * qui reste à compléter.
 */
function fieldRank(f: MetadataField): number {
  const validated = f.validationStatus === "HUMAN_VALIDATED" || f.validationStatus === "HUMAN_CORRECTED";
  const hasValue = !!(f.value && f.value.trim());
  if (validated) return 2;
  if (hasValue) return 1;
  return 0;
}

/** Champs de métadonnées IA + validation humaine — validés en haut, manquants en bas. */
export function MetadataPanel({ fields, onValidate }: Props) {
  const ordered = [...fields].sort((a, b) => fieldRank(b) - fieldRank(a));
  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-xs text-gray-400 px-1 py-2">Aucune métadonnée extraite pour ce contrat.</p>
      )}
      {ordered.map((f) => (
        <FieldRow key={f.fieldKey} field={f} onValidate={onValidate} />
      ))}
    </div>
  );
}

/** Normalise une valeur de date vers "AAAA-MM-JJ" pour <input type="date">. */
function toDateInput(value: string | null): string {
  if (!value) return "";
  // Déjà au bon format
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FieldRow({ field, onValidate }: { field: MetadataField; onValidate: Props["onValidate"] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value ?? "");
  const [busy, setBusy] = useState(false);

  const label = FIELD_LABEL[field.fieldKey] ?? field.fieldKey;
  const isDate = DATE_FIELDS.includes(field.fieldKey);

  async function run(status: ValidationStatus, value: string | null) {
    setBusy(true);
    try { await onValidate(field.fieldKey, value, status); setEditing(false); }
    finally { setBusy(false); }
  }

  // ── Champ DATE : input toujours visible, calendrier au clic, save auto ──
  if (isDate) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
          <ValidationChip status={field.validationStatus} />
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            type="date"
            value={toDateInput(field.value)}
            disabled={busy}
            onClick={(e) => { (e.currentTarget as HTMLInputElement).showPicker?.(); }}
            onChange={(e) => void run("HUMAN_CORRECTED", e.target.value || null)}
            className="flex-1 min-w-0 text-sm px-2 py-1.5 rounded-md border border-gray-300 outline-none focus:border-[#354F99] cursor-pointer"
          />
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
        <ValidationChip status={field.validationStatus} />
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="flex-1 min-w-0 text-sm px-2 py-1 rounded-md border border-gray-300 outline-none focus:border-[#354F99]"
          />
          <button onClick={() => void run("HUMAN_CORRECTED", draft || null)} disabled={busy} className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50" title="Enregistrer la correction">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditing(false); setDraft(field.value ?? ""); }} className="p-1 rounded-md text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className={`text-sm ${field.value ? "text-gray-800" : "text-gray-300 italic"}`}>
            {field.value || "non renseigné"}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 rounded-md text-gray-300 hover:text-[#354F99] hover:bg-gray-50" title="Corriger">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {field.validationStatus === "AI_SUGGESTED" && (
              <button onClick={() => void run("HUMAN_VALIDATED", field.value)} disabled={busy} className="p-1 rounded-md text-emerald-500 hover:bg-emerald-50" title="Valider tel quel">
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pastille d'état de validation. */
function ValidationChip({ status }: { status: ValidationStatus }) {
  const cfg: Record<ValidationStatus, { label: string; icon: React.ElementType; cls: string }> = {
    AI_SUGGESTED: { label: "Suggéré IA", icon: Sparkles, cls: "text-amber-600 bg-amber-50" },
    HUMAN_VALIDATED: { label: "Validé", icon: ShieldCheck, cls: "text-emerald-600 bg-emerald-50" },
    HUMAN_CORRECTED: { label: "Corrigé", icon: Pencil, cls: "text-blue-600 bg-blue-50" },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${c.cls}`}>
      <c.icon className="w-2.5 h-2.5" /> {c.label}
    </span>
  );
}
