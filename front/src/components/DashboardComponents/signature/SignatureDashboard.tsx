import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, FileText, Send, Clock, CheckCircle2, Loader2, Trash2, Filter, MoreVertical, FileSearch } from "lucide-react";
import { fetchProxy } from "../../../utils/fetchProxy";
import { AlertBanner, type AlertVariant } from "../../common/AlertBanner";

/** Statuts d'enveloppe (miroir de l'enum Prisma). */
type EnvelopeStatus = "DRAFT" | "SENT" | "PARTIALLY_SIGNED" | "SIGNED" | "DECLINED" | "EXPIRED";

interface EnvelopeDTO {
  id: string;
  documentName: string;
  numPages: number;
  status: EnvelopeStatus;
  selfName: string;
  selfEmail: string;
  counterpartyName: string;
  counterpartyEmail: string;
  sentAt: string | null;
  selfSignedAt: string | null;
  counterpartySignedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  draft: number;
  sent: number;
  partiallySigned: number;
  signed: number;
  other: number;
  recent: EnvelopeDTO[];
}

interface Props {
  /** Appelé quand l'utilisateur clique sur "Nouveau contrat". */
  onNewContract: () => void;
  /** Clé de refresh — incrémenter pour forcer un re-fetch des données. */
  refreshKey?: number;
}

/**
 * Vue tableau de bord du module Signature électronique :
 *   - 4 cartes KPI (total / signés / en cours / brouillons)
 *   - filtre par statut
 *   - liste des enveloppes
 *   - bouton "Nouveau contrat" en haut à droite
 *
 * Charge les données via 2 endpoints proxy :
 *   GET /api/signature-envelope/stats  → KPIs + 5 récents
 *   GET /api/signature-envelope?status=XXX → liste filtrée
 */
export function SignatureDashboard({ onNewContract, refreshKey }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [list, setList] = useState<EnvelopeDTO[]>([]);
  const [filter, setFilter] = useState<EnvelopeStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ variant: AlertVariant; title: string; detail?: string } | null>(null);


  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        fetchProxy("/api/signature-envelope/stats", { credentials: "include" }),
        fetchProxy(`/api/signature-envelope${filter !== "ALL" ? `?status=${filter}` : ""}`, { credentials: "include" }),
      ]);
      const statsData = await statsRes.json() as { success: boolean; data?: Stats };
      const listData = await listRes.json() as { success: boolean; data?: EnvelopeDTO[] };
      if (statsData.success && statsData.data) setStats(statsData.data);
      if (listData.success && listData.data) setList(listData.data);
    } catch (e: unknown) {
      setAlert({ variant: "error", title: "Chargement impossible", detail: e instanceof Error ? e.message : "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void fetchAll(); }, [fetchAll, refreshKey]);

  async function handleDelete(externalId: string) {
    if (!confirm("Supprimer définitivement cette enveloppe ?")) return;
    try {
      await fetchProxy(`/api/signature-envelope/${externalId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await fetchAll();
    } catch { /* silent */ }
  }





  async function handleResend(id: string) {
    try {
      const res = await fetchProxy(`/api/signature-envelope/resend`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: id }),
      });
      const data = await res.json().catch(() => ({})) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        setAlert({ variant: "error", title: "Renvoi impossible", detail: data.message ?? "L'email n'a pas pu être renvoyé." });
        return;
      }
      setAlert({ variant: "success", title: "Email renvoyé", detail: "L'invitation à signer a été renvoyée au cocontractant." });
    } catch (err) {
      console.error(err);
      setAlert({ variant: "error", title: "Renvoi impossible", detail: "Erreur réseau." });
    }
  }




  async function handleDownload(externalId: string) {
    try {
      const res = await fetchProxy(`/api/signature-envelope/download/${externalId}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        setAlert({ variant: "error", title: "Téléchargement impossible", detail: "Le document signé n'a pas pu être récupéré." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Récupère le nom proposé par le serveur (Content-Disposition), sinon fallback.
      const cd = res.headers.get("content-disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(cd);
      a.download = match?.[1] ?? "document_signe.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  }




  return (
    <div className="space-y-5">
      <Header onNewContract={onNewContract} />

      {alert && (
        <AlertBanner
          variant={alert.variant}
          title={alert.title}
          detail={alert.detail}
          accent
          onClose={() => setAlert(null)}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total"
          value={stats?.total ?? 0}
          icon={FileText}
          accent="#354F99"
          loading={loading}
        />
        <KpiCard
          label="En attente"
          value={(stats?.sent ?? 0) + (stats?.partiallySigned ?? 0)}
          icon={Clock}
          accent="#d97706"
          loading={loading}
        />
        <KpiCard
          label="Signés"
          value={stats?.signed ?? 0}
          icon={CheckCircle2}
          accent="#059669"
          loading={loading}
        />
        <KpiCard
          label="Brouillons"
          value={stats?.draft ?? 0}
          icon={Send}
          accent="#64748b"
          loading={loading}
        />
      </div>

      {/* Filtres */}
      <StatusFilters current={filter} onChange={setFilter} />

      {/* Liste */}
      <EnvelopeList
        list={list}
        loading={loading}
        onDelete={handleDelete}
        onResend={handleResend}
        onDownload={handleDownload}
      />
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

/** Titre de la page + bouton "Nouveau contrat". */
function Header({ onNewContract }: { onNewContract: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Signature électronique</h1>
        <p className="text-sm text-ink-muted mt-1">
          Suivez l'avancement de vos contrats à signer.
        </p>
      </div>
      <button
        onClick={onNewContract}
        className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-all shadow-card"
      >
        <Plus className="w-4 h-4" /> Nouveau contrat
      </button>
    </div>
  );
}

/** Une carte KPI — même gabarit que la bibliothèque de clauses (icône à gauche). */
function KpiCard({
  label, value, icon: Icon, accent, loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-card border border-line shadow-card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-panel flex items-center justify-center shrink-0" style={{ backgroundColor: accent + "18" }}>
        <Icon className="w-5 h-5 stroke-[1.5]" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="h-7 w-8 rounded-md bg-surface-muted animate-pulse mb-1" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-ink">{value}</p>
        )}
        <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/** Boutons de filtre par statut. */
function StatusFilters({
  current, onChange,
}: {
  current: EnvelopeStatus | "ALL";
  onChange: (s: EnvelopeStatus | "ALL") => void;
}) {
  const options: Array<{ id: EnvelopeStatus | "ALL"; label: string }> = [
    { id: "ALL", label: "Tous" },
    { id: "SENT", label: "Envoyés" },
    { id: "PARTIALLY_SIGNED", label: "Partiellement signés" },
    { id: "SIGNED", label: "Signés" },
    { id: "DRAFT", label: "Brouillons" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-3.5 h-3.5 text-ink-subtle" />
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-card ${current === o.id
            ? "bg-brand text-white border-brand"
            : "text-ink-secondary bg-white border-line hover:bg-surface-subtle"
            }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Liste des enveloppes. */
function EnvelopeList({
  list, loading, onDelete,onResend, onDownload
}: {
  list: EnvelopeDTO[];
  loading: boolean;
  onDelete: (id: string) => void;
  onResend: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-ink-subtle" />
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-card border border-line shadow-card">
        <div className="w-14 h-14 rounded-card bg-surface-subtle border border-line flex items-center justify-center">
          <FileText className="w-6 h-6 text-ink-subtle stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Aucune enveloppe</p>
          <p className="text-xs text-ink-muted max-w-sm">
            Créez votre premier contrat à signer depuis le bouton « Nouveau contrat ».
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card border border-line shadow-card divide-y divide-line-subtle ">
      {list.map((env) => (
        <EnvelopeRow
          key={env.id}
          env={env}
          onDelete={() => onDelete(env.id)}
          onResend={() => onResend(env.id)}
          onDownload={() => onDownload(env.id)}
        />
      ))}
    </div>
  );
}

/** Une ligne d'enveloppe dans la liste. */
function EnvelopeRow({ env, onDelete, onResend, onDownload }: { env: EnvelopeDTO; onDelete: () => void; onResend: () => void; onDownload: () => void }) {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const classActionBtn = "p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-muted flex justify-start gap-2 items-center"
  console.log("Data de la signature", env)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  return (
    <div className="group flex items-center gap-4 px-5 py-3 hover:bg-surface-subtle/60 transition-colors relative">

      <div className="w-9 h-9 rounded-panel bg-surface-subtle border border-line flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-ink-subtle" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">
          {env.documentName}
        </p>

        <p className="text-[11px] text-ink-subtle truncate">
          {env.counterpartyName} · {env.counterpartyEmail}
        </p>
      </div>

      <div className="hidden md:block text-[11px] text-ink-subtle shrink-0 min-w-[120px] text-right">
        {formatDate(env.sentAt ?? env.createdAt)}
      </div>

      <StatusBadge status={env.status} />


      <div ref={menuRef} className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu((prev) => !prev);
          }}
          className="p-1.5 text-ink-subtle hover:text-ink-secondary transition-colors rounded-lg hover:bg-surface-muted"
        >
          <MoreVertical className="w-4 h-4 stroke-[1.5]" />
        </button>


        {openMenu && (
          <div className="absolute right-0 top-8 z-10 flex flex-col p-1 bg-white border border-line rounded-panel shadow-card-md py-1 min-w-[180px]">
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-danger hover:bg-danger-light flex justify-start gap-2 items-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>


            <button
              onClick={onResend}
              className={classActionBtn}
            >
              <Send className="w-3.5 h-3.5" />
              Renvoyer l'email
            </button>


            <button
              onClick={onDownload}
              className={classActionBtn}
            >
              <FileSearch className="w-3.5 h-3.5" />
              Télécharger
            </button>

          </div>
        )}
      </div>

    </div>
  );
}

/** Badge coloré selon le statut de l'enveloppe. */
function StatusBadge({ status }: { status: EnvelopeStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  );
}

const STATUS_CONFIG: Record<EnvelopeStatus, { label: string; bg: string; fg: string }> = {
  DRAFT: { label: "Brouillon", bg: "#f1f5f9", fg: "#64748b" },
  SENT: { label: "Envoyé", bg: "#fef3c7", fg: "#92400e" },
  PARTIALLY_SIGNED: { label: "Partiellement", bg: "#dbeafe", fg: "#1e40af" },
  SIGNED: { label: "Signé", bg: "#d1fae5", fg: "#065f46" },
  DECLINED: { label: "Refusé", bg: "#fee2e2", fg: "#991b1b" },
  EXPIRED: { label: "Expiré", bg: "#f3f4f6", fg: "#6b7280" },
};

/** "JJ/MM/AAAA" à partir d'un ISO ou d'un timestamp. */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
