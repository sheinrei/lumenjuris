import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { fetchProxy } from "../../utils/fetchProxy";
import { Activity, Zap, Users, TrendingUp, ChevronDown } from "lucide-react";

// ─── Métadonnées des features ──────────────────────────────────────────────────

const FEATURE_META: Record<string, { label: string; color: string }> = {
  analyze_contract:  { label: "Analyse contrat",      color: "#6366f1" },
  detect_contract:   { label: "Détection type",       color: "#8b5cf6" },
  market_analysis:   { label: "Analyse de marché",    color: "#14b8a6" },
  recommend_clause:  { label: "Recomm. clause",       color: "#f59e0b" },
  detect_legal_refs: { label: "Réf. légales",         color: "#3b82f6" },
  summarize_case:    { label: "Résumé jurispru.",     color: "#ec4899" },
  generate_contract: { label: "Génération contrat",   color: "#10b981" },
  import_template:   { label: "Import template",      color: "#f97316" },
  analyze_clause:    { label: "Analyse clause",       color: "#06b6d4" },
  chat:              { label: "Chat juridique",        color: "#64748b" },
  openai_chat:       { label: "Assistant IA",         color: "#a78bfa" },
};

function featureLabel(key: string): string {
  return FEATURE_META[key]?.label ?? key;
}
function featureColor(key: string): string {
  return FEATURE_META[key]?.color ?? "#94a3b8";
}

// ─── Plages temporelles ────────────────────────────────────────────────────────

const TIME_RANGES = [
  { label: "7 j",    days: 7 },
  { label: "14 j",   days: 14 },
  { label: "30 j",   days: 30 },
  { label: "3 mois", days: 90 },
  { label: "6 mois", days: 180 },
  { label: "1 an",   days: 365 },
] as const;

// ─── Granularité & groupement ──────────────────────────────────────────────────

type Granularity = "day" | "week" | "month";

function granularityFor(days: number): Granularity {
  if (days <= 30)  return "day";
  if (days <= 180) return "week";
  return "month";
}

function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

type TimelineEntry = { date: string } & Record<string, number>;

function groupTimeline(entries: TimelineEntry[], gran: Granularity): TimelineEntry[] {
  if (gran === "day") return entries;
  const buckets = new Map<string, Record<string, number>>();
  for (const e of entries) {
    const key = gran === "week" ? mondayOf(e.date) : monthOf(e.date);
    if (!buckets.has(key)) buckets.set(key, {});
    const b = buckets.get(key)!;
    for (const [k, v] of Object.entries(e)) {
      if (k === "date") continue;
      b[k] = (b[k] ?? 0) + (v as number);
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

function formatTick(iso: string, gran: Granularity): string {
  if (gran === "month") {
    const d = new Date(`${iso}-01T00:00:00Z`);
    return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  const d = new Date(iso + "T00:00:00Z");
  if (gran === "week") return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

function formatTooltipLabel(iso: string, gran: Granularity): string {
  if (gran === "month") {
    const d = new Date(`${iso}-01T00:00:00Z`);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  const d = new Date(iso + "T00:00:00Z");
  if (gran === "week") {
    return "Sem. du " + d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type FeatureSummaryItem = { feature: string; count: number };
type TopUser = {
  userId: number;
  email: string;
  nom: string | null;
  prenom: string | null;
  total: number;
  byFeature: Record<string, number>;
};
type ActivityData = {
  summary: FeatureSummaryItem[];
  timeline: TimelineEntry[];
  topUsers: TopUser[];
  days: number;
};

// ─── Composant principal ───────────────────────────────────────────────────────

export function ActivitySection() {
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchProxy(`/api/admin/feature-usage?days=${selectedDays}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ success: boolean; data?: ActivityData; message?: string }>)
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.message ?? "Erreur serveur");
        setData(json.data ?? null);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDays]);

  const gran = granularityFor(selectedDays);

  const chartData = useMemo(() => {
    if (!data) return [];
    return groupTimeline(data.timeline, gran);
  }, [data, gran]);

  const activeFeatures = useMemo(() => {
    if (!data) return [];
    return data.summary.map((s) => s.feature);
  }, [data]);

  const totalEvents = useMemo(() => data?.summary.reduce((s, f) => s + f.count, 0) ?? 0, [data]);
  const topFeature = data?.summary[0] ?? null;
  const activeUserCount = data?.topUsers.length ?? 0;

  const tickInterval = Math.max(0, Math.floor(chartData.length / 8) - 1);

  return (
    <div className="space-y-6">
      {/* Sélecteur de plage */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIME_RANGES.map(({ label, days }) => (
          <button
            key={days}
            onClick={() => setSelectedDays(days)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedDays === days
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl p-4">
          Erreur : {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-4">
            <StatTile
              icon={<Zap className="w-4 h-4" />}
              label="Appels LLM"
              value={totalEvents.toLocaleString("fr-FR")}
              sub={`sur ${selectedDays} j`}
            />
            <StatTile
              icon={<TrendingUp className="w-4 h-4" />}
              label="Feature la plus utilisée"
              value={topFeature ? featureLabel(topFeature.feature) : "—"}
              sub={topFeature ? `${topFeature.count} appels` : ""}
              accent
            />
            <StatTile
              icon={<Users className="w-4 h-4" />}
              label="Utilisateurs actifs"
              value={activeUserCount.toString()}
              sub="(top 10)"
            />
          </div>

          {/* Graphique */}
          {chartData.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                Activité par fonctionnalité
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({gran === "day" ? "par jour" : gran === "week" ? "par semaine" : "par mois"})
                </span>
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={(v: string) => formatTick(v, gran)}
                    interval={tickInterval}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(v: string) => formatTooltipLabel(v, gran)}
                    formatter={(value: number, name: string) => [value, featureLabel(name)]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Legend
                    formatter={(value: string) => featureLabel(value)}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  {activeFeatures.map((feat) => (
                    <Bar
                      key={feat}
                      dataKey={feat}
                      stackId="a"
                      fill={featureColor(feat)}
                      radius={activeFeatures.indexOf(feat) === activeFeatures.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune activité enregistrée sur cette période.</p>
              <p className="text-xs mt-1 text-gray-300">Les données s'accumuleront dès que des fonctionnalités IA seront utilisées.</p>
            </div>
          )}

          {/* Tableau feature breakdown */}
          {data.summary.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <ChevronDown className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Répartition par fonctionnalité</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide font-semibold">
                  <tr>
                    <th className="px-5 py-2.5 text-left">Fonctionnalité</th>
                    <th className="px-5 py-2.5 text-right">Appels</th>
                    <th className="px-5 py-2.5 text-left w-48">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.summary.map((item) => {
                    const pct = totalEvents > 0 ? (item.count / totalEvents) * 100 : 0;
                    return (
                      <tr key={item.feature} className="hover:bg-gray-50/50">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: featureColor(item.feature) }}
                            />
                            <span className="text-gray-700">{featureLabel(item.feature)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                          {item.count.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: featureColor(item.feature) }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Top utilisateurs */}
          {data.topUsers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Top utilisateurs</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide font-semibold">
                  <tr>
                    <th className="px-5 py-2.5 text-left">#</th>
                    <th className="px-5 py-2.5 text-left">Utilisateur</th>
                    <th className="px-5 py-2.5 text-right">Total</th>
                    <th className="px-5 py-2.5 text-left">Répartition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topUsers.map((u, idx) => {
                    const name = [u.prenom, u.nom].filter(Boolean).join(" ") || u.email.split("@")[0];
                    const initials = `${u.prenom?.[0] ?? ""}${u.nom?.[0] ?? ""}`.toUpperCase() || u.email[0]?.toUpperCase() || "?";
                    const topFeat = Object.entries(u.byFeature).sort(([, a], [, b]) => b - a)[0];
                    return (
                      <tr key={u.userId} className="hover:bg-gray-50/50">
                        <td className="px-5 py-2.5 text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{name}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold text-gray-900">
                          {u.total.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {topFeat && (
                              <span
                                className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
                                style={{ backgroundColor: featureColor(topFeat[0]) }}
                              >
                                {featureLabel(topFeat[0])}
                              </span>
                            )}
                            {Object.keys(u.byFeature).length > 1 && (
                              <span className="text-xs text-gray-400 self-center">
                                +{Object.keys(u.byFeature).length - 1} autre{Object.keys(u.byFeature).length > 2 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200"}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${accent ? "text-indigo-600" : "text-gray-500"}`}>
        {icon}
        {label}
      </div>
      <p className={`text-xl font-bold truncate ${accent ? "text-indigo-700" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
