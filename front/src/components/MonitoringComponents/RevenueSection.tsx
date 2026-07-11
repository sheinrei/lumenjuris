import { useEffect, useState } from "react";
import { TrendingUp, Users, CreditCard, Receipt, BadgeEuro } from "lucide-react";
import { fetchProxy } from "../../utils/fetchProxy";

type RevenueUser = { idUser: number; email: string; nom: string | null; prenom: string | null };
type Plan = { idPlan: number; name: string; price: number; interval: string; creditIncluded: number };
type Facture = { idFacture: number; price: number; stripeInvoiceId: string; createdAt: string };
type Subscription = {
  idSubscription: number;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING";
  startAt: string;
  expiresAt: string;
  user: RevenueUser;
  plan: Plan;
  facture: Facture[];
};

type RevenueFacture = Facture & {
  subscription: {
    user: { email: string; nom: string | null; prenom: string | null };
    plan: { name: string };
  };
};

type RevenueData = {
  subscriptions: Subscription[];
  totalRevenue: number;
  activeCount: number;
  revenueByPlan: Record<string, { count: number; revenue: number }>;
  recentFactures: RevenueFacture[];
};

const STATUS_CONFIG = {
  ACTIVE: { label: "Actif", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  CANCELLED: { label: "Annulé", bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
  EXPIRED: { label: "Expiré", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
  PENDING: { label: "En attente", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
};

const fmt = {
  eur: (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n / 100),
  date: (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
};

function KpiTile({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 tabular-nums">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

export function RevenueSection() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchProxy("/api/admin/revenue", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? `HTTP ${res.status}`);
        setData(json.data as RevenueData);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        Erreur : {error}
      </div>
    );
  }

  if (!data) return null;

  const thisMonthRevenue = data.recentFactures
    .filter((f) => {
      const d = new Date(f.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, f) => s + f.price, 0);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiTile
          icon={TrendingUp}
          label="Revenus totaux"
          value={fmt.eur(data.totalRevenue)}
          sub="tous paiements confondus"
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiTile
          icon={Users}
          label="Abonnements actifs"
          value={String(data.activeCount)}
          sub="en ce moment"
          color="bg-indigo-50 text-indigo-600"
        />
        <KpiTile
          icon={BadgeEuro}
          label="Ce mois"
          value={fmt.eur(thisMonthRevenue)}
          sub={new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Breakdown par plan */}
      {Object.keys(data.revenueByPlan).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Répartition par plan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data.revenueByPlan).map(([plan, stats]) => (
              <div key={plan} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-gray-800">{plan}</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums mt-0.5">{fmt.eur(stats.revenue)}</p>
                <p className="text-xs text-gray-400">{stats.count} actif{stats.count > 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Liste des abonnements */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">
          Tous les abonnements{" "}
          <span className="font-normal text-gray-400 text-sm">— {data.subscriptions.length} au total</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-4">Utilisateur</span>
            <span className="col-span-2">Plan</span>
            <span className="col-span-2">Statut</span>
            <span className="col-span-2">Début</span>
            <span className="col-span-2 text-right">Payé</span>
          </div>
          {data.subscriptions.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-400 text-center">Aucun abonnement.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.subscriptions.map((sub) => {
                const st = STATUS_CONFIG[sub.status];
                const name = [sub.user.prenom, sub.user.nom].filter(Boolean).join(" ") || sub.user.email;
                const paid = sub.facture.reduce((s, f) => s + f.price, 0);
                return (
                  <div key={sub.idSubscription} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-50/50">
                    <div className="col-span-4 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate">{sub.user.email}</p>
                    </div>
                    <span className="col-span-2 text-gray-700 font-medium">{sub.plan.name}</span>
                    <span className="col-span-2">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                        {st.label}
                      </span>
                    </span>
                    <span className="col-span-2 text-gray-500 text-xs">{fmt.date(sub.startAt)}</span>
                    <span className="col-span-2 text-right font-semibold text-gray-800 tabular-nums">
                      {fmt.eur(paid)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Historique des paiements */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">
          Derniers paiements{" "}
          <span className="font-normal text-gray-400 text-sm">— 30 derniers</span>
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-4">Utilisateur</span>
            <span className="col-span-2">Plan</span>
            <span className="col-span-3">Date</span>
            <span className="col-span-3 text-right">Montant</span>
          </div>
          {data.recentFactures.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-400 text-center">Aucun paiement enregistré.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentFactures.map((f) => {
                const name = [f.subscription.user.nom, f.subscription.user.prenom].filter(Boolean).join(" ") || f.subscription.user.email;
                return (
                  <div key={f.idFacture} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-50/50">
                    <div className="col-span-4 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate">{f.subscription.user.email}</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <span className="text-gray-700">{f.subscription.plan.name}</span>
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5 text-gray-500 text-xs">
                      <Receipt className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      {fmt.date(f.createdAt)}
                    </div>
                    <span className="col-span-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {fmt.eur(f.price)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
