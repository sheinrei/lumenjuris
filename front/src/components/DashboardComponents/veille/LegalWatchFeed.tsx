import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { fetchProxy } from "../../../utils/fetchProxy";
import { CardSkeleton, DigestItem, conceptLabel, formatDate } from "./legalWatchShared";
import { AlertBanner } from "../../common/AlertBanner";

/**
 * Fil unique de l'onglet « Actualités juridiques » : jurisprudence (Judilibre /
 * Légifrance) et actualités RH (flux RSS) fusionnées en une seule liste
 * chronologique, filtrable par thématique via une barre de chips.
 */

// ── Thématiques : jurisprudence + tags RH (ordre + couleurs) ─────────────────

const JURIS_THEME = "Jurisprudence";

const THEME_ORDER = [
  JURIS_THEME,
  "Rupture",
  "Temps de travail",
  "Rémunération",
  "Santé/Sécurité",
  "Discipline",
  "Relations collectives",
  "Protection sociale",
  "Recrutement",
];

const THEME_COLORS: Record<string, string> = {
  Jurisprudence: "bg-lumenjuris/10 text-lumenjuris",
  "Temps de travail": "bg-green-100 text-green-700",
  Rupture: "bg-orange-100 text-orange-700",
  Discipline: "bg-purple-100 text-purple-700",
  Rémunération: "bg-blue-100 text-blue-700",
  "Santé/Sécurité": "bg-red-100 text-red-700",
  "Relations collectives": "bg-yellow-100 text-yellow-700",
  "Protection sociale": "bg-teal-100 text-teal-700",
  Recrutement: "bg-indigo-100 text-indigo-700",
};

function themeChipClass(theme: string): string {
  return THEME_COLORS[theme] ?? "bg-gray-100 text-gray-600";
}

// ── Modèle d'un élément du fil ────────────────────────────────────────────────

interface FeedItem {
  key: string;
  ts: number; // pour le tri chronologique
  dateLabel: string;
  theme: string;
  title: string;
  summary: string;
  source: string;
  link?: string;
  concepts?: string[];
}

interface RssArticle {
  tag: string;
  date: string;
  isoDate: string;
  title: string;
  summary: string;
  source: string;
  link?: string;
}

function jurisdictionSource(jurisdiction: string | null): string {
  if (!jurisdiction) return "Jurisprudence";
  if (/^(LOI|DECRET|ARRETE|ORDONNANCE)/i.test(jurisdiction)) return "Légifrance";
  return "Cour de cassation";
}

// ── Carte ─────────────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <article className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${themeChipClass(item.theme)}`}>
          {item.theme}
        </span>
        <span className="text-xs text-gray-400">{item.dateLabel}</span>
      </div>

      {item.link ? (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-semibold text-gray-900 leading-snug hover:text-lumenjuris transition-colors"
        >
          {item.title}
        </a>
      ) : (
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</h3>
      )}

      {item.summary && <p className="text-sm text-gray-500 leading-relaxed">{item.summary}</p>}

      <div className="flex items-center gap-1.5 flex-wrap">
        {item.concepts?.map((c) => (
          <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {conceptLabel(c)}
          </span>
        ))}
        <span className="text-xs text-gray-400">{item.source}</span>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-lumenjuris hover:underline"
          >
            Ouvrir <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function LegalWatchFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<string>("Tout");
  const [isNotRefreshed, setIsNotRefreshed] = useState(false);
  const [onClick, setOnClick] = useState(false);

  const load = useCallback(async (nocache = false) => {
    setLoading(true);
    setIsNotRefreshed(false);
    const feed: FeedItem[] = [];

    // Jurisprudence (Judilibre / Légifrance)
    try {
      const res = await fetchProxy("/api/legal-watch/digest?pageSize=40", { credentials: "include" });
      if (res.ok) {
        const payload = (await res.json()) as { success: boolean; data?: { items: DigestItem[] } };
        for (const it of payload.data?.items ?? []) {
          feed.push({
            key: `juris-${it.id}`,
            ts: it.decisionDate ? new Date(it.decisionDate).getTime() : 0,
            dateLabel: formatDate(it.decisionDate),
            theme: JURIS_THEME,
            title: it.title,
            summary: it.summary ?? "",
            source: jurisdictionSource(it.jurisdiction),
            link: it.sourceUrl,
            concepts: it.concepts,
          });
        }
      }
    } catch {
      /* le fil se limite au RSS si la jurisprudence échoue */
    }

    // Actualités RH (flux RSS classés)
    try {
      const veilleUrl = nocache ? "/api/veille?nocache=1" : "/api/veille"
      const res = await fetchProxy(veilleUrl, { credentials: "include" });
      if (res.ok) {
        const payload = (await res.json());

        if (nocache || payload.cached === true) {
          setIsNotRefreshed(true);
        }

        (payload.data ?? []).forEach((a: RssArticle, i: number) => {
          const t = new Date(a.isoDate).getTime();
          feed.push({
            key: `rss-${i}-${a.link ?? a.title.slice(0, 40)}`,
            ts: isNaN(t) ? 0 : t,
            dateLabel: a.date,
            theme: a.tag,
            title: a.title,
            summary: a.summary,
            source: a.source,
            link: a.link,
          });
        });
      }
    } catch {
      /* le fil se limite à la jurisprudence si le RSS échoue */
    }

    feed.sort((a, b) => b.ts - a.ts);
    setItems(feed);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setOnClick(true);
    await load(true);
  }

  // Thématiques réellement présentes, dans l'ordre canonique, + "Tout".
  const availableThemes = useMemo(() => {
    const present = new Set(items.map((i) => i.theme));
    const ordered = THEME_ORDER.filter((t) => present.has(t));
    const extras = [...present].filter((t) => !THEME_ORDER.includes(t));
    return ["Tout", ...ordered, ...extras];
  }, [items]);

  const filtered = theme === "Tout" ? items : items.filter((i) => i.theme === theme);

  return (
    <section className="space-y-4">
      {/* Filtres par thématique + rafraîchir */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableThemes.map((t) => {
            const active = theme === t;
            return (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                  active
                    ? "bg-lumenjuris text-white border-lumenjuris"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {isNotRefreshed && onClick && (
        <AlertBanner
          title="À jour !"
          variant="success"
          detail="Les actualités sont à jour"
          duration={8000}
          onClose={() => setIsNotRefreshed(false)}
        />
      )}

      {/* Fil */}
      {loading && items.length === 0 ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
          <p className="text-gray-400 text-sm">
            {theme === "Tout" ? "Aucune actualité pour l'instant." : `Rien dans « ${theme} ».`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <FeedCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
