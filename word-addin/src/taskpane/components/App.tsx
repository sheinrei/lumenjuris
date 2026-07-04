import * as React from "react";
import Header from "./Header";
import ClauseList from "./ClauseList";
import ClauseDetail from "./ClauseDetail";
import AnalysisForm from "./AnalysisForm";
import StatusMessage, { Status } from "./StatusMessage";
import { AnalysisContext, ClauseRisk } from "../core/types";
import { analyzeContract, DEFAULT_CONTEXT } from "../core/lumenService";
import { clearHighlights, getDocumentText, highlightClauses, selectClause } from "../core/wordDocument";

type Screen = "home" | "form" | "results";

const App: React.FC = () => {
  const [screen, setScreen] = React.useState<Screen>("home");
  const [documentText, setDocumentText] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [clauses, setClauses] = React.useState<ClauseRisk[]>([]);
  const [missingIds, setMissingIds] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<ClauseRisk | null>(null);

  /** Étape 1 : lecture du document puis ouverture du formulaire contextuel. */
  const handleStart = async () => {
    setStatus(null);
    try {
      const text = await getDocumentText();
      if (!text || text.trim().length < 100) {
        setStatus({ kind: "warn", text: "Document vide ou trop court." });
        return;
      }
      setDocumentText(text);
      setScreen("form");
    } catch (error) {
      setStatus({ kind: "err", text: String(error) });
    }
  };

  /** Étape 2 : analyse avec le contexte du formulaire (ou par défaut si « Ignorer »). */
  const handleAnalyze = async (context: AnalysisContext) => {
    setScreen("results");
    setAnalyzing(true);
    setStatus(null);
    setSelected(null);
    setClauses([]);
    setMissingIds([]);
    try {
      setProgress("Analyse IA en cours…");
      const found = await analyzeContract(documentText, context);
      setClauses(found);

      if (found.length === 0) {
        setStatus({ kind: "ok", text: "Aucune clause à risque détectée." });
        return;
      }

      // Liste affichée immédiatement, surlignage en arrière-plan.
      setStatus({ kind: "ok", text: `${found.length} clause(s) détectée(s) — surlignage…` });
      void highlightClauses(found)
        .then((report) => {
          setMissingIds(report.missing);
          setStatus({
            kind: "ok",
            text:
              `${found.length} clause(s), ${report.located.length} surlignée(s)` +
              (report.missing.length ? `, ${report.missing.length} non localisée(s).` : "."),
          });
        })
        .catch((e) => {
          setStatus({ kind: "warn", text: `Surlignage impossible : ${String(e)}` });
        });
    } catch (error) {
      setStatus({
        kind: "err",
        text: `Analyse échouée : ${error instanceof Error ? error.message : String(error)}. La plateforme LumenJuris est-elle démarrée ?`,
      });
    } finally {
      setProgress(null);
      setAnalyzing(false);
    }
  };

  const handleClear = async () => {
    await clearHighlights();
    setClauses([]);
    setMissingIds([]);
    setSelected(null);
    setStatus(null);
    setScreen("home");
  };

  /* ---------- Fiche détail (fenêtre modale de la plateforme) ---------- */
  if (selected) {
    return (
      <div>
        <Header />
        <main className="lj-content">
          <ClauseDetail clause={selected} onClose={() => setSelected(null)} />
        </main>
      </div>
    );
  }

  /* ---------- Formulaire contextuel (avant analyse) ---------- */
  if (screen === "form") {
    return (
      <div>
        <Header />
        <main className="lj-content">
          <AnalysisForm
            documentText={documentText}
            onSubmit={handleAnalyze}
            onSkip={() =>
              handleAnalyze({
                ...DEFAULT_CONTEXT,
                specificQuestions: "Analyse générale des risques",
                missionContext: "Analyse contractuelle",
              })
            }
            onCancel={() => setScreen("home")}
          />
        </main>
      </div>
    );
  }

  /* ---------- Accueil / résultats ---------- */
  return (
    <div>
      <Header />
      <main className="lj-content">
        <div className="lj-card">
          <h3 style={{ margin: 0 }}>Analyse des risques</h3>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="lj-btn" onClick={handleStart} disabled={analyzing}>
              {analyzing ? "Analyse en cours…" : "🔍 Analyser le document"}
            </button>
            {clauses.length > 0 && (
              <button className="lj-btn secondary" onClick={handleClear} disabled={analyzing}>
                Effacer
              </button>
            )}
          </div>
          {progress && <div className="lj-status warn">{progress}</div>}
          <StatusMessage status={status} />
        </div>

        <ClauseList
          clauses={clauses}
          missingIds={missingIds}
          onOpen={(clause) => setSelected(clause)}
          onLocate={(clause) => selectClause(clause.id)}
        />
      </main>
    </div>
  );
};

export default App;
