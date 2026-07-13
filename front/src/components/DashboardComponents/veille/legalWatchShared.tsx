import { ExternalLink } from "lucide-react";

/**
 * Types, libellés, helpers et briques d'affichage partagés par les trois
 * onglets de la veille juridique (Alertes, Actualités, Paramètres).
 */

// ── Types (miroir des DTO backNode /legal-watch) ─────────────────────────────

export type ImpactLevel = "HAUT" | "MOYEN" | "FAIBLE";

export interface DigestItem {
  id: string;
  title: string;
  jurisdiction: string | null;
  decisionDate: string | null;
  sourceUrl: string;
  summary: string | null;
  legalDomain: string | null;
  concepts: string[];
  impactLevel: ImpactLevel | null;
  isEvolution: boolean | null;
}

export interface Alert {
  id: string;
  status: "UNREAD" | "READ" | "DISMISSED";
  createdAt: string;
  item: DigestItem;
  contracts: Array<{ id: string; title: string; contractType: string | null }>;
}

export interface WatchStatus {
  lastRunAt: string | null;
  isActive: boolean;
  activeConceptCount: number;
  publishedCount: number;
}

export interface WatchConfig {
  sources: Array<{ name: string; isActive: boolean; lastRunAt: string | null }>;
  concepts: Array<{ concept: string; label: string; legalDomain: string; isActive: boolean }>;
}

// ── Libellés ─────────────────────────────────────────────────────────────────

export const DOMAIN_LABELS: Record<string, string> = {
  droit_travail_contrats_precaires: "Droit du travail · Contrats précaires (CDD)",
};

const CONCEPT_LABELS: Record<string, string> = {
  motif_recours_cdd: "Motif de recours au CDD",
  accroissement_temporaire_activite: "Accroissement temporaire d'activité",
  requalification_cdi: "Requalification en CDI",
  duree_maximale_renouvellement: "Durée maximale et renouvellement",
  delai_de_carence: "Délai de carence",
  mentions_obligatoires_cdd: "Mentions obligatoires du CDD",
  indemnite_precarite: "Indemnité de précarité",
  rupture_anticipee_cdd: "Rupture anticipée du CDD",
  transmission_tardive_contrat: "Transmission tardive du contrat",
};

export function conceptLabel(key: string): string {
  return CONCEPT_LABELS[key] ?? key.replace(/_/g, " ");
}

export function domainLabel(key: string): string {
  return DOMAIN_LABELS[key] ?? key.replace(/_/g, " ");
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "jamais";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "jamais";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ── Briques d'affichage ──────────────────────────────────────────────────────

/** Corps commun d'une carte (titre, résumé, concepts, lien décision). */
export function ItemBody({ item }: { item: DigestItem }) {
  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        {item.isEvolution && (
          <span
            title="La Cour fait évoluer sa position — à surveiller de près."
            className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-lumenjuris/10 text-lumenjuris cursor-help"
          >
            Évolution
          </span>
        )}
        <span className="text-xs text-gray-400">{formatDate(item.decisionDate)}</span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</h3>

      {item.summary && (
        <p className="text-sm text-gray-500 leading-relaxed">{item.summary}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {item.concepts.map((c) => (
          <span
            key={c}
            title="Point juridique détecté dans cette décision"
            className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
          >
            {conceptLabel(c)}
          </span>
        ))}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-lumenjuris hover:underline"
        >
          Voir la décision <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-pulse space-y-3">
      <div className="flex gap-2">
        <div className="h-5 w-24 bg-gray-100 rounded-full" />
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-gray-100 rounded" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-5/6 bg-gray-100 rounded" />
    </div>
  );
}
