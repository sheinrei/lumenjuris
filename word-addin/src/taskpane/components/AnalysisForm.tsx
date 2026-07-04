import * as React from "react";
import { AnalysisContext } from "../core/types";
import { DEFAULT_CONTEXT, detectContract } from "../core/lumenService";

interface Props {
  documentText: string;
  onSubmit: (context: AnalysisContext) => void;
  onSkip: () => void;
  onCancel: () => void;
}

/** Placeholder adaptatif de la mission — repris du formulaire plateforme. */
function getMissionPlaceholder(contractType: string): string {
  const type = contractType.toLowerCase();
  if (type.includes("bail") || type.includes("location")) {
    return "Ex: Vérifier les charges cachées, protéger mes droits de locataire, analyser le dépôt de garantie...";
  }
  if (type.includes("travail") || type.includes("emploi")) {
    return "Ex: Vérifier la période d'essai, analyser les clauses de non-concurrence, négocier le télétravail...";
  }
  if (type.includes("vente") || type.includes("achat")) {
    return "Ex: Vérifier les garanties, analyser les conditions de livraison, négocier les délais...";
  }
  if (type.includes("prestation") || type.includes("service")) {
    return "Ex: Vérifier les livrables, analyser les pénalités de retard, clarifier la propriété intellectuelle...";
  }
  return "Ex: vérifier la conformité légale, protéger vos intérêts, identifier les risques...";
}

/**
 * 📋 Questions d'analyse personnalisée — réplique du formulaire contextuel de
 * la plateforme (ContextualAnalysisForm) : mêmes champs, même pré-remplissage
 * IA (/api/detect-contract), mêmes règles de validation.
 */
const AnalysisForm: React.FC<Props> = ({ documentText, onSubmit, onSkip, onCancel }) => {
  const [context, setContext] = React.useState<AnalysisContext>({ ...DEFAULT_CONTEXT });
  const [detecting, setDetecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEquitable = context.interestOrientation === "balanced";

  // Détection IA au chargement pour pré-remplir le formulaire (comme la plateforme).
  React.useEffect(() => {
    if (!documentText || documentText.length < 100) return undefined;
    let active = true;
    setDetecting(true);
    detectContract(documentText)
      .then((ai) => {
        if (!active) return;
        setContext((prev) => ({
          ...prev,
          contractType: ai.contractType ?? prev.contractType,
          userRole: ai.userRole ?? prev.userRole,
          specificQuestions: ai.specificQuestions ?? prev.specificQuestions,
          mission: ai.mission ?? prev.mission,
          analysisDepth: ai.analysisDepth ?? prev.analysisDepth,
          interestOrientation: ai.interestOrientation ?? prev.interestOrientation,
          legalRegime: ai.legalRegime ?? prev.legalRegime,
          contractObjective: ai.contractObjective ?? prev.contractObjective,
        }));
      })
      .catch(() => {
        /* pré-remplissage best-effort */
      })
      .finally(() => active && setDetecting(false));
    return () => {
      active = false;
    };
  }, [documentText]);

  const handleSubmit = () => {
    if (!context.contractType.trim()) {
      setError("Veuillez spécifier le type de contrat.");
      return;
    }
    if (!isEquitable && !context.userRole.trim()) {
      setError("Veuillez spécifier votre position contractuelle.");
      return;
    }
    if (!context.legalRegime?.trim()) {
      setError("Veuillez renseigner le régime juridique.");
      return;
    }
    if (!context.contractObjective?.trim()) {
      setError("Veuillez renseigner l'objectif du contrat.");
      return;
    }
    setError(null);
    onSubmit({
      ...context,
      specificQuestions: context.specificQuestions || "Analyse générale des risques",
      missionContext: context.mission || "Analyse contractuelle",
    });
  };

  return (
    <div className="lj-card">
      <h3>📋 Questions d&apos;analyse personnalisée</h3>

      {detecting && <div className="lj-status warn">Analyse du document pour pré-remplir le formulaire…</div>}

      <label className="lj-label">Type de contrat :</label>
      <input
        className="lj-input"
        type="text"
        value={context.contractType}
        placeholder="ex: Contrat de travail, Contrat commercial..."
        onChange={(e) => setContext({ ...context, contractType: e.target.value })}
      />

      {isEquitable ? (
        <div className="lj-status ok">⚖️ Contrat équilibré : la position contractuelle est neutre.</div>
      ) : (
        <>
          <label className="lj-label">Quelle est votre position contractuelle ?</label>
          <label className="lj-radio">
            <input
              type="radio"
              name="userRole"
              value="position_favorable"
              checked={context.userRole === "position_favorable"}
              onChange={(e) => setContext({ ...context, userRole: e.target.value, interestOrientation: "assertive" })}
            />
            <span>
              <strong>🏛️ Position favorable</strong> — j&apos;ai l&apos;avantage contractuel
            </span>
          </label>
          <label className="lj-radio">
            <input
              type="radio"
              name="userRole"
              value="position_vulnerable"
              checked={context.userRole === "position_vulnerable"}
              onChange={(e) => setContext({ ...context, userRole: e.target.value, interestOrientation: "defensive" })}
            />
            <span>
              <strong>🛡️ Position vulnérable</strong> — je suis en situation de faiblesse
            </span>
          </label>
        </>
      )}

      <label className="lj-label">🎯 Orientation de l&apos;analyse :</label>
      <label className="lj-radio">
        <input
          type="radio"
          name="interestOrientation"
          value="defensive"
          checked={context.interestOrientation === "defensive"}
          onChange={() => setContext({ ...context, interestOrientation: "defensive" })}
        />
        <span>
          <strong>🛡️ Défensif</strong> — protéger mes intérêts, identifier tous les risques
        </span>
      </label>
      <label className="lj-radio">
        <input
          type="radio"
          name="interestOrientation"
          value="balanced"
          checked={context.interestOrientation === "balanced"}
          onChange={() => setContext({ ...context, interestOrientation: "balanced" })}
        />
        <span>
          <strong>⚖️ Équilibré</strong> — analyse objective des deux parties
        </span>
      </label>
      <label className="lj-radio">
        <input
          type="radio"
          name="interestOrientation"
          value="assertive"
          checked={context.interestOrientation === "assertive"}
          onChange={() => setContext({ ...context, interestOrientation: "assertive" })}
        />
        <span>
          <strong>⚡ Assertif</strong> — maximiser mes avantages contractuels
        </span>
      </label>

      <label className="lj-label">Régime juridique :</label>
      <input
        className="lj-input"
        type="text"
        value={context.legalRegime || ""}
        placeholder="ex: Droit privé – Contrat commercial"
        onChange={(e) => setContext({ ...context, legalRegime: e.target.value })}
      />

      <label className="lj-label">Objectif du contrat :</label>
      <input
        className="lj-input"
        type="text"
        value={context.contractObjective || ""}
        placeholder="ex: Sécuriser un partenariat"
        onChange={(e) => setContext({ ...context, contractObjective: e.target.value })}
      />

      <label className="lj-label">
        Mission spécifique <span className="lj-muted">(optionnel — améliore la précision)</span>
      </label>
      <textarea
        className="lj-textarea"
        rows={3}
        value={context.mission || ""}
        placeholder={getMissionPlaceholder(context.contractType)}
        onChange={(e) => setContext({ ...context, mission: e.target.value })}
      />

      {error && <div className="lj-status err">{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <button className="lj-btn" onClick={handleSubmit}>
          🚀 Analyse
        </button>
        <div>
          <button className="lj-btn secondary small" onClick={onSkip} style={{ marginRight: 6 }}>
            Ignorer
          </button>
          <button className="lj-btn secondary small" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisForm;
