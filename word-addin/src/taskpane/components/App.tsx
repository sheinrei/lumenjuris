import * as React from "react";
import ClauseList from "./ClauseList";
import ClauseDetail from "./ClauseDetail";
import AnalysisForm from "./AnalysisForm";
import StatusMessage, { Status } from "./StatusMessage";
import { AnalysisContext, ClauseRisk } from "../core/types";
import { analyzeContract } from "../core/lumenService";
import { clearHighlights, getDocumentText, highlightClauses, selectClause } from "../core/wordDocument";

type Screen = "form" | "results";

/** Pastille compacte : nombre de clauses détectées, teintée selon la sévérité la plus haute. */
function ClauseCountBadge({ clauses }: { clauses: ClauseRisk[] }) {
  const maxScore = Math.max(...clauses.map((c) => c.riskScore));
  const css = maxScore >= 4 ? "high" : maxScore >= 3 ? "medium" : "low";
  return (
    <span className={`lj-count-badge ${css}`}>
      {clauses.length} clause{clauses.length > 1 ? "s" : ""} détectée{clauses.length > 1 ? "s" : ""}
    </span>
  );
}

const App: React.FC = () => {
  const [screen, setScreen] = React.useState<Screen>("form");
  const [documentText, setDocumentText] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [highlighting, setHighlighting] = React.useState(false);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [clauses, setClauses] = React.useState<ClauseRisk[]>([]);
  const [missingIds, setMissingIds] = React.useState<string[]>([]);
  const [appliedIds, setAppliedIds] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<ClauseRisk | null>(null);

  // Lecture du document dès l'ouverture, pour pré-remplir le formulaire (IA).
  React.useEffect(() => {
    getDocumentText()
      .then(setDocumentText)
      .catch(() => {
        /* best-effort */
      });
  }, []);

  /** Lance l'analyse avec le contexte du formulaire (texte lu à la volée). */
  const handleAnalyze = async (context: AnalysisContext) => {
    setStatus(null);
    let text = "";
    try {
      text = await getDocumentText();
    } catch (error) {
      setStatus({ kind: "err", text: `Lecture du document impossible : ${String(error)}` });
      return;
    }
    if (!text || text.trim().length < 100) {
      setStatus({ kind: "warn", text: "Document vide ou trop court : ouvrez un contrat dans Word." });
      return;
    }

    setScreen("results");
    setAnalyzing(true);
    setSelected(null);
    setClauses([]);
    setMissingIds([]);
    setAppliedIds([]);
    try {
      const found = await analyzeContract(text, context);
      setClauses(found);

      if (found.length === 0) {
        setStatus({ kind: "ok", text: "Aucune clause à risque détectée." });
        return;
      }

      // Liste affichée immédiatement, surlignage en arrière-plan.
      setHighlighting(true);
      void highlightClauses(found)
        .then((report) => setMissingIds(report.missing))
        .catch((e) => setStatus({ kind: "warn", text: `Surlignage impossible : ${String(e)}` }))
        .finally(() => setHighlighting(false));
    } catch (error) {
      setStatus({
        kind: "err",
        text: `Analyse échouée : ${error instanceof Error ? error.message : String(error)}. La plateforme LumenJuris est-elle démarrée ?`,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  /** Retour au formulaire pour relancer une analyse (efface les surlignages). */
  const handleNewAnalysis = async () => {
    await clearHighlights().catch(() => {});
    setClauses([]);
    setMissingIds([]);
    setSelected(null);
    setStatus(null);
    setScreen("form");
  };

  /* ---------- Fiche détail (fenêtre modale de la plateforme) ---------- */
  if (selected) {
    return (
      <main className="lj-content">
        <ClauseDetail
          clause={selected}
          onClose={() => setSelected(null)}
          onApplied={(id) => setAppliedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
        />
      </main>
    );
  }

  /* ---------- Accueil = formulaire de contexte (champs directs) ---------- */
  if (screen === "form") {
    return (
      <main className="lj-content">
        <AnalysisForm documentText={documentText} analyzing={analyzing} status={status} onSubmit={handleAnalyze} />
      </main>
    );
  }

  /* ---------- Résultats : liste des clauses ---------- */
  return (
    <main className="lj-content">
      <div className="lj-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button className="lj-btn secondary small" onClick={handleNewAnalysis} disabled={analyzing || highlighting}>
            ← Nouvelle analyse
          </button>
          {!analyzing && !highlighting && clauses.length > 0 && <ClauseCountBadge clauses={clauses} />}
        </div>
        {analyzing && <p className="lj-muted" style={{ margin: "8px 0 0" }}>Analyse IA en cours…</p>}
        {highlighting && <p className="lj-muted" style={{ margin: "8px 0 0" }}>Surlignage dans le document…</p>}
        <StatusMessage status={status} />
      </div>

      <ClauseList
        clauses={clauses}
        missingIds={missingIds}
        appliedIds={appliedIds}
        onOpen={(clause) => {
          // Sélectionne la clause surlignée dans le document, puis ouvre sa fiche.
          void selectClause(clause.id);
          setSelected(clause);
        }}
      />
    </main>
  );
};

export default App;
