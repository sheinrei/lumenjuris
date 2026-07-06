// Création « de zéro », façon juriste, EN LIGNE (pas de pop-up) : une question
// fermée à la fois, on clique une réponse, on passe à la suivante, puis le
// contrat est rédigé et ouvert dans l'éditeur (variables surlignées).
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { BlockDef, ContractModel, VariableDef } from "../../../contractEngine/types";
import {
  generateContractQuestions, generateContractDraft,
  type WizardQuestion, type ContractDraft,
} from "./contractAi";

function slug(s: string): string {
  const o = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return o || "contrat";
}

/** Assemble le brouillon IA en modèle éditable, variables comprises. */
function buildModel(title: string, draft: ContractDraft): ContractModel {
  const variables: VariableDef[] = draft.variables.map((v) => ({ id: v.id, label: v.label, type: "text" }));
  const blocks: BlockDef[] = [
    { id: "title", kind: "title", content: draft.title || title.toUpperCase() },
  ];
  draft.sections.forEach((s, i) => {
    blocks.push({ id: `sec_${i}`, kind: "clause", heading: s.heading, content: s.content });
  });
  if (!draft.sections.some((s) => /signature/i.test(s.heading ?? ""))) {
    blocks.push({
      id: "signatures", kind: "signature", heading: "Signatures",
      content: "Fait en deux exemplaires.\n\nLa première partie\t\t\tLa seconde partie",
    });
  }
  return {
    key: "scratch", version: 1, label: title,
    variables, blocks, alternatives: [], decisions: [], rules: [], mandatoryMentions: [],
  };
}

type Step = "loading" | "asking" | "generating" | "error";

export function ScratchWizard({ title, onReady, onBack }: {
  title: string;
  onReady: (r: { model: ContractModel; fileBase: string }) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>("loading");
  const [questions, setQuestions] = useState<WizardQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStep("loading");
      setError("");
      try {
        const qs = await generateContractQuestions(title);
        if (cancelled) return;
        setQuestions(qs);
        setIdx(0);
        setStep("asking");
      } catch {
        if (!cancelled) { setError("Service IA indisponible — impossible de préparer les questions."); setStep("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [title]);

  async function finish(finalAnswers: Record<string, string>) {
    setStep("generating");
    setError("");
    try {
      const qa = questions.map((q) => ({ question: q.question, answer: finalAnswers[q.id] ?? "" }));
      const draft = await generateContractDraft(title, qa);
      onReady({ model: buildModel(title, draft), fileBase: slug(title) });
    } catch {
      setError("Échec de la rédaction. Réessayez.");
      setStep("asking");
    }
  }

  function answer(value: string) {
    const q = questions[idx];
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (idx < questions.length - 1) setIdx(idx + 1);
    else void finish(next);
  }

  const q = questions[idx];
  const total = questions.length;

  return (
    <div className="mx-auto max-w-lg">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="rounded-card border border-line bg-white p-6 shadow-card">
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <p className="text-sm text-ink-muted">Génération des questions en cours…</p>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <p className="text-sm text-ink-muted">Rédaction du contrat…</p>
          </div>
        )}

        {step === "error" && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger-dark">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {step === "asking" && q && (
          <div>
            {/* Progression : numéro + jauge, rien d'autre */}
            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-subtle">
                Question {idx + 1} / {total}
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
              </div>
            </div>

            <p className="mb-4 text-base font-semibold text-ink">{q.question}</p>

            {q.type === "choice" ? (
              <div className="flex flex-col gap-2">
                {(q.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => answer(opt)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-all hover:border-brand/40 hover:bg-brand-light/50"
                  >
                    {opt}
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
                  </button>
                ))}
                {/* Réponse libre possible sur chaque question */}
                <FreeAnswer key={q.id} onSubmit={answer} />
              </div>
            ) : (
              <TextAnswer key={q.id} onSubmit={answer} />
            )}

            {error && <p className="mt-3 text-xs text-danger">{error}</p>}

            {idx > 0 && (
              <button
                onClick={() => setIdx(idx - 1)}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-brand"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Précédent
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Champ libre proposé sous les choix — même mise en forme que les options. */
function FreeAnswer({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 transition-all focus-within:border-brand/40 focus-within:shadow-ring-brand">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) onSubmit(v.trim()); }}
        placeholder="Autre…"
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-placeholder"
      />
      <button
        onClick={() => v.trim() && onSubmit(v.trim())}
        disabled={!v.trim()}
        title="Valider cette réponse"
        className="shrink-0 text-ink-subtle transition-colors hover:text-brand disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Réponse libre (question ouverte) : champ + validation. */
function TextAnswer({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) onSubmit(v.trim()); }}
        className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-brand/40 focus:shadow-ring-brand"
      />
      <div className="flex justify-end">
        <button
          onClick={() => onSubmit(v.trim())}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card transition-all hover:bg-brand-hover"
        >
          Continuer <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
