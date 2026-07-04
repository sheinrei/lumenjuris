import * as React from "react";
import { ClauseRisk } from "../core/types";

const riskBadge = (score: number): { label: string; css: string } =>
  score >= 4
    ? { label: `Risque élevé ${score}/5`, css: "high" }
    : score >= 3
      ? { label: `Risque modéré ${score}/5`, css: "medium" }
      : { label: `Risque faible ${score}/5`, css: "low" };

interface Props {
  clauses: ClauseRisk[];
  missingIds: string[];
  onOpen: (clause: ClauseRisk) => void;
  onLocate: (clause: ClauseRisk) => void;
}

/**
 * Liste des clauses à risque détectées (équivalent ClausesSidebar de la
 * plateforme). Clic sur une carte → fiche détail ; « Voir » → sélectionne la
 * clause surlignée dans le document Word.
 */
const ClauseList: React.FC<Props> = ({ clauses, missingIds, onOpen, onLocate }) => {
  if (clauses.length === 0) return null;

  const sorted = [...clauses].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div>
      {sorted.map((clause) => {
        const badge = riskBadge(clause.riskScore);
        const missing = missingIds.includes(clause.id);
        return (
          <div
            className="lj-card lj-clickable"
            key={clause.id}
            onClick={() => onOpen(clause)}
            role="button"
            tabIndex={0}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0 }}>{clause.type}</h3>
              <span className={`lj-badge ${badge.css}`}>{badge.label}</span>
            </div>
            <p className="lj-muted" style={{ margin: "6px 0" }}>
              {clause.content.length > 100 ? `${clause.content.slice(0, 100)}…` : clause.content}
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="lj-btn secondary small"
                onClick={(e) => {
                  e.stopPropagation();
                  onLocate(clause);
                }}
                disabled={missing}
              >
                📍 Voir dans le document
              </button>
              {missing && <span className="lj-muted">Non localisée</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClauseList;
