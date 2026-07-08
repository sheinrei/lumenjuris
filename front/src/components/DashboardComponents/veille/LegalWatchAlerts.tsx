import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, FileText, Play, RefreshCw, Settings2, X } from "lucide-react";
import { fetchProxy } from "../../../utils/fetchProxy";
import { useLegalWatchStore } from "../../../store/legalWatchStore";
import { useUserStore } from "../../../store/userStore";
import { Alert, CardSkeleton, ItemBody, WatchStatus, formatDateTime } from "./legalWatchShared";

/**
 * Onglet « Alertes » : uniquement ce qui touche VOS contrats.
 * La jurisprudence générale vit dans l'onglet Actualités ; le paramétrage
 * (sources, thèmes) dans l'onglet Paramètres.
 */

function AlertCard({ alert, onAction }: { alert: Alert; onAction: (id: string, status: "READ" | "DISMISSED") => void }) {
  const unread = alert.status === "UNREAD";
  return (
    <article
      className={`bg-white rounded-xl border p-5 shadow-sm ${
        unread ? "border-lumenjuris/30 border-l-4 border-l-lumenjuris" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {/* L'essentiel d'abord : le(s) contrat(s) touché(s) */}
          {alert.contracts.length > 0 && (
            <div className="bg-lumenjuris/5 border border-lumenjuris/15 rounded-lg px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-lumenjuris">
                {alert.contracts.length > 1
                  ? `${alert.contracts.length} contrats concernés :`
                  : "1 contrat concerné :"}
              </p>
              <ul className="space-y-1">
                {alert.contracts.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/contratheque/${c.id}`}
                      title="Ouvrir la fiche de ce contrat"
                      className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-lumenjuris transition-colors underline decoration-gray-300 hover:decoration-lumenjuris underline-offset-2"
                    >
                      <FileText className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="truncate">{c.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ItemBody item={alert.item} />
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {unread && (
            <button
              onClick={() => onAction(alert.id, "READ")}
              title="J'ai pris connaissance de cette alerte"
              className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-gray-300 hover:text-lumenjuris transition-colors"
            >
              <Check className="h-3.5 w-3.5" /> Lue
            </button>
          )}
          <button
            onClick={() => onAction(alert.id, "DISMISSED")}
            title="Ne plus afficher cette alerte"
            className="flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-gray-300 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Ignorer
          </button>
        </div>
      </div>
    </article>
  );
}

export function LegalWatchAlerts({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshUnreadCount = useLegalWatchStore((s) => s.refreshUnreadCount);
  const role = useUserStore((s) => s.userData?.profile?.role);
  const canRun = role === "ADMIN" || role === "JURISTE";

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetchProxy("/api/legal-watch/status", { credentials: "include" });
      if (!res.ok) return;
      const payload = (await res.json()) as { success: boolean; data?: WatchStatus };
      if (payload.success && payload.data) setStatus(payload.data);
    } catch {
      /* ligne d'état en mode dégradé */
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProxy("/api/legal-watch/alerts", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as { success: boolean; data?: Alert[] };
      setAlerts(
        (payload.success && payload.data ? payload.data : []).filter((a) => a.status !== "DISMISSED"),
      );
    } catch {
      setError("Impossible de charger les alertes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    loadStatus();
    refreshUnreadCount();
  }, [loadAlerts, loadStatus, refreshUnreadCount]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetchProxy("/api/legal-watch/run", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await Promise.all([loadAlerts(), loadStatus()]);
      refreshUnreadCount();
    } catch {
      setError("L'analyse n'a pas abouti. Réessayez dans quelques instants.");
    } finally {
      setRunning(false);
    }
  };

  const handleAlertAction = async (id: string, next: "READ" | "DISMISSED") => {
    // Optimiste : action immédiate à l'écran, rollback silencieux en cas d'échec.
    const previous = alerts;
    setAlerts((prev) =>
      next === "DISMISSED"
        ? prev.filter((a) => a.id !== id)
        : prev.map((a) => (a.id === id ? { ...a, status: next } : a)),
    );
    try {
      const res = await fetchProxy(`/api/legal-watch/alerts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      refreshUnreadCount();
    } catch {
      setAlerts(previous);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ligne d'état compacte + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400">
          {status ? `Dernière analyse : ${formatDateTime(status.lastRunAt)}` : "Chargement…"}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" /> Paramétrer
          </button>
          {canRun && (
            <button
              onClick={handleRun}
              disabled={running}
              title="Récupère les dernières décisions et met à jour vos alertes"
              className="flex items-center gap-1.5 text-xs font-medium text-lumenjuris border border-lumenjuris/30 rounded-lg px-3 py-1.5 hover:bg-lumenjuris/5 transition-colors disabled:opacity-50"
            >
              {running ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analyse…</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Analyser</>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
          {error}
        </div>
      )}

      {loading ? (
        <CardSkeleton />
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
          <p className="text-gray-400 text-sm">Aucune alerte — rien ne touche vos contrats.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onAction={handleAlertAction} />
          ))}
        </div>
      )}
    </div>
  );
}
