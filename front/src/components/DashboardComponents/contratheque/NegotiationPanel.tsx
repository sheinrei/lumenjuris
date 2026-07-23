import { useState } from "react";
import { MessageSquare, Send, Check, Trash2, Loader2 } from "lucide-react";
import { contractApi } from "./api";
import { fmtDate } from "./types";
import type { ContractDetail, ContractComment } from "./types";
import { ConfirmationModal } from "../../ui/ConfirmationModal";

interface Props {
  data: ContractDetail;
  canEdit: boolean;
  onChanged: () => void;
}

/** Fil de négociation : commentaires collaboratifs sur le contrat. */
export function NegotiationPanel({ data, canEdit, onChanged }: Props) {
  return <CommentsCard contractId={data.id} comments={data.comments} canEdit={canEdit} onChanged={onChanged} />;
}

/** Carte du fil de commentaires collaboratifs. */
function CommentsCard({
  contractId, comments, canEdit, onChanged,
}: {
  contractId: string;
  comments: ContractComment[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteComment, setDeleteComment] = useState<ContractComment | null>(null);
  const [validateModalOpen, setValidateModalOpen] = useState(false);

  async function add() {
    if (!draft.trim()) return;
    setBusy(true);
    try { await contractApi.addComment(contractId, draft.trim()); setDraft(""); onChanged(); }
    finally { setBusy(false); }
  }

  async function toggleResolve(c: ContractComment) {
    await contractApi.resolveComment(c.id, !c.resolved);
    onChanged();
  }

  async function remove(c: ContractComment) {
    setDeleteComment(c);
    setValidateModalOpen(true);
  }

  async function validateConfirmed() {
    if (!deleteComment) return;
    try {
      await contractApi.deleteComment(deleteComment.id);
      onChanged()
    } catch {}
    finally {
      setDeleteComment(null);
      setValidateModalOpen(false);
    };
  }

  return (
    <div className="bg-white rounded-card border border-line shadow-card p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-ink-muted" />
        <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest">Fil de négociation</p>
        <span className="text-[10px] font-semibold text-ink-subtle bg-surface-muted px-1.5 py-0.5 rounded-chip">{comments.length}</span>
      </div>

      {/* Liste des commentaires */}
      <div className="space-y-2.5 mb-4 max-h-72 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-xs text-ink-muted italic py-4 text-center">Aucun échange pour le moment.</p>
        )}
        {comments.map((c) => (
          <div
            key={c.id}
            className={`rounded-panel border p-3 group ${c.resolved ? "bg-surface-subtle border-line-subtle opacity-70" : "bg-white border-line"}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-ink">{c.userName ?? "Utilisateur"}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink-subtle">{fmtDate(c.createdAt)}</span>
                {canEdit && (
                  <>
                    <button
                      onClick={() => void toggleResolve(c)}
                      className={`p-1 rounded-md transition-all ${c.resolved ? "text-success" : "text-ink-subtle hover:text-success hover:bg-success-light"}`}
                      title={c.resolved ? "Marquer non traité" : "Marquer traité"}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => void remove(c)}
                      className="p-1 rounded-md text-ink-subtle hover:text-danger hover:bg-danger-light transition-all opacity-0 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">{c.body}</p>
            {c.resolved && <span className="text-[9px] font-bold text-success uppercase tracking-wide mt-1.5 inline-block">Traité</span>}
          </div>
        ))}
      </div>

      {/* Saisie */}
      {canEdit && (
        <div className="flex items-end gap-2 mt-auto">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void add(); }}
            rows={2}
            placeholder="Ajouter un commentaire (Ctrl+Entrée pour envoyer)…"
            className="flex-1 text-sm px-3 py-2 border border-line rounded-lg outline-none focus:border-brand/40 transition-all resize-none placeholder:text-ink-placeholder"
          />
          <button
            onClick={() => void add()}
            disabled={busy || !draft.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all disabled:opacity-40 shrink-0"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
      <ConfirmationModal
        open={validateModalOpen}
        title="Supprimer le commentaire"
        description={`Souhaitez-vous supprimer le commentaire ?`}
        confirmLabel="Valider"
        onConfirm={validateConfirmed}
        onCancel={() => { setValidateModalOpen(false); setDeleteComment(null) }}
      />
    </div>
  );
}
