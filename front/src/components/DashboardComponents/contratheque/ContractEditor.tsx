import { useMemo, useState } from "react";
import { Loader2, Sparkles, Check, X, Save, ListTree, FileText, Plus, Trash2 } from "lucide-react";
import { contractApi } from "./api";

interface Props {
  contractId: string;
  initialText: string;
  onSaved: () => void;
  onCancel: () => void;
}

type Mode = "clauses" | "full";

/**
 * Découpe le contrat en clauses éditables. Priorité aux séparations par ligne
 * vide ; à défaut, on coupe sur les en-têtes d'articles (« Article 3 », « Art. 3 »).
 */
function splitIntoClauses(text: string): string[] {
  const t = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!t) return [""];

  // 1. Paragraphes séparés par une ligne vide.
  if (/\n\s*\n/.test(t)) {
    return t.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
  }

  // 2. Découpe sur les débuts d'article (en gardant l'en-tête avec son bloc).
  const lines = t.split("\n");
  const clauses: string[] = [];
  let current: string[] = [];
  const isHeading = (l: string) => /^\s*(article|art\.?)\s+\d+/i.test(l);
  for (const line of lines) {
    if (isHeading(line) && current.length) {
      clauses.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  if (current.length) clauses.push(current.join("\n").trim());
  return clauses.filter(Boolean).length ? clauses.filter(Boolean) : [t];
}

/**
 * Éditeur du contrat — même logique que le générateur : on modifie les clauses
 * une par une (avec reformulation IA) ou le contrat dans son ensemble, puis on
 * enregistre. Le texte est persisté via `contractApi.update({ ocrText })`.
 */
export function ContractEditor({ contractId, initialText, onSaved, onCancel }: Props) {
  const original = useMemo(() => initialText ?? "", [initialText]);
  const [mode, setMode] = useState<Mode>("clauses");
  const [clauses, setClauses] = useState<string[]>(() => splitIntoClauses(original));
  const [fullText, setFullText] = useState<string>(original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bascule de mode en synchronisant le contenu.
  function toMode(next: Mode) {
    if (next === mode) return;
    if (next === "full") setFullText(clauses.join("\n\n"));
    else setClauses(splitIntoClauses(fullText));
    setMode(next);
  }

  function currentText(): string {
    return (mode === "full" ? fullText : clauses.join("\n\n")).trim();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await contractApi.update(contractId, { ocrText: currentText() });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const dirty = currentText() !== original.trim();

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          <ModeBtn active={mode === "clauses"} onClick={() => toMode("clauses")} icon={ListTree}>
            Par clause
          </ModeBtn>
          <ModeBtn active={mode === "full"} onClick={() => toMode("full")} icon={FileText}>
            Contrat entier
          </ModeBtn>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#354F99] rounded-lg hover:bg-[#1a2d5a] disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {mode === "full" ? (
        <textarea
          value={fullText}
          onChange={(e) => setFullText(e.target.value)}
          className="w-full text-sm text-gray-700 leading-relaxed font-sans px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#354F99]/40 resize-y"
          style={{ minHeight: 460 }}
        />
      ) : (
        <div className="space-y-2.5">
          {clauses.map((clause, i) => (
            <ClauseCard
              key={i}
              index={i}
              value={clause}
              onChange={(v) => setClauses((prev) => prev.map((c, j) => (j === i ? v : c)))}
              onRemove={() => setClauses((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          <button
            onClick={() => setClauses((prev) => [...prev, ""])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#354F99] bg-[#354F99]/5 border border-[#354F99]/20 rounded-lg hover:bg-[#354F99]/10"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une clause
          </button>
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
        active ? "bg-white text-[#354F99] shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

/** Une clause éditable + reformulation IA (accepter / ignorer la suggestion). */
function ClauseCard({
  index, value, onChange, onRemove,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reformulate() {
    if (!value.trim()) return;
    setBusy(true);
    setErr(null);
    setSuggestion(null);
    try {
      setSuggestion(await contractApi.reformulateClause(value, ""));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reformulation indisponible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Clause {index + 1}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void reformulate()}
            disabled={busy || !value.trim()}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#354F99] rounded-md hover:bg-[#354F99]/5 disabled:opacity-40"
            title="Reformuler cette clause avec l'IA"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Reformuler
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-gray-300 hover:text-red-500 rounded-md"
            title="Supprimer la clause"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(12, Math.max(2, value.split("\n").length + 1))}
        className="w-full text-sm text-gray-700 leading-relaxed font-sans px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#354F99]/40 resize-y"
      />

      {err && <p className="text-[11px] text-red-500 mt-1.5">{err}</p>}

      {suggestion !== null && (
        <div className="mt-2 rounded-lg border border-[#354F99]/20 bg-[#354F99]/5 p-2.5">
          <p className="text-[10px] font-bold text-[#354F99] uppercase tracking-wide mb-1">Reformulation proposée</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{suggestion}</p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => { onChange(suggestion); setSuggestion(null); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#354F99] rounded-md hover:bg-[#1a2d5a]"
            >
              <Check className="w-3 h-3" /> Remplacer
            </button>
            <button
              onClick={() => setSuggestion(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <X className="w-3 h-3" /> Ignorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
