import { useState } from "react";
import { Calculator, Download, Info } from "lucide-react";
import { calculateLegalSeverance } from "../components/Calculator/calculerIndemnitees";
import type { ContractType, SeveranceCalculationResult, TerminationReason } from "../components/Calculator/typesIndemnitees";

const MOTIF_VERS_RAISON_RESILIATION: Record<string, TerminationReason> = {
  personnel: "standard",
  economique: "standard",
  faute_grave: "gross_misconduct",
  faute_lourde: "serious_misconduct",
};

const LIBELLE_MOTIF: Record<string, string> = {
  personnel: "1/4 mois par année (personnel)",
  economique: "1/4 mois par année (économique)",
  faute_grave: "Faute grave — aucune indemnité",
  faute_lourde: "Faute lourde — aucune indemnité",
};

export function Calculateur() {
  const [typeContrat, setTypeContrat] = useState<ContractType>("CDI");
  const [ancienneteAnnees, setAncienneteAnnees] = useState("8");
  const [ancienneteMois, setAncienneteMois] = useState("0");
  const [salaireMensuelBrut, setSalaireMensuelBrut] = useState("3200");
  const [salaireMoyen12Mois, setSalaireMoyen12Mois] = useState("3200");
  const [salaireMoyen3Mois, setSalaireMoyen3Mois] = useState("3200");
  const [ratioTempsPartiel, setRatioTempsPartiel] = useState("1");
  const [motifLicenciement, setMotifLicenciement] = useState("personnel");
  const [resultat, setResultat] = useState<SeveranceCalculationResult | null>(null);

  const lancerCalcul = () => {
    const raisonResiliation = MOTIF_VERS_RAISON_RESILIATION[motifLicenciement] ?? "standard";

    setResultat(calculateLegalSeverance({
      contractType: typeContrat,
      terminationReason: raisonResiliation,
      seniority: {
        years: Math.trunc(parseFloat(ancienneteAnnees) || 0),
        months: Math.trunc(parseFloat(ancienneteMois) || 0),
      },
      monthlyGrossSalary: parseFloat(salaireMensuelBrut) || 0,
      averageSalary12Months: parseFloat(salaireMoyen12Mois) || 0,
      averageSalary3Months: parseFloat(salaireMoyen3Mois) || 0,
      partTimeRatio: parseFloat(ratioTempsPartiel) || 1,
    }));
  };

  const formuleApplicable = LIBELLE_MOTIF[motifLicenciement] ?? "1/4 mois par année";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Calculateur juridique</h1>
        <p className="text-sm text-gray-500 mt-1">Estimez les indemnités et obligations légales</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

        {/* Formulaire */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#354F99]" />
            <h2 className="text-base font-semibold text-gray-900">Indemnité de licenciement</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Type de contrat</label>
            <select
              value={typeContrat}
              onChange={(e) => setTypeContrat(e.target.value as ContractType)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors bg-white"
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ancienneté (années)</label>
              <input
                type="number" min="0" value={ancienneteAnnees}
                onChange={(e) => setAncienneteAnnees(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Mois supplémentaires</label>
              <input
                type="number" min="0" max="11" value={ancienneteMois}
                onChange={(e) => setAncienneteMois(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Salaire brut mensuel (€)</label>
            <input
              type="number" min="0" value={salaireMensuelBrut}
              onChange={(e) => setSalaireMensuelBrut(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Salaire moyen 12 mois (€)</label>
              <input
                type="number" min="0" value={salaireMoyen12Mois}
                onChange={(e) => setSalaireMoyen12Mois(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Salaire moyen 3 mois (€)</label>
              <input
                type="number" min="0" value={salaireMoyen3Mois}
                onChange={(e) => setSalaireMoyen3Mois(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Ratio temps partiel (1 = temps plein)</label>
            <input
              type="number" min="0.01" max="1" step="0.01" value={ratioTempsPartiel}
              onChange={(e) => setRatioTempsPartiel(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Motif du licenciement</label>
            <select
              value={motifLicenciement}
              onChange={(e) => setMotifLicenciement(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#354F99] transition-colors bg-white"
            >
              <option value="personnel">Personnel (non disciplinaire)</option>
              <option value="economique">Économique</option>
              <option value="faute_grave">Faute grave</option>
              <option value="faute_lourde">Faute lourde</option>
            </select>
          </div>

          <button
            onClick={lancerCalcul}
            className="w-full bg-[#354F99] text-white text-sm font-semibold py-3 rounded-lg hover:bg-[#2d4387] transition-colors"
          >
            Calculer l'indemnité
          </button>
        </div>

        {/* Résultat */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center space-y-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Indemnité estimée</p>
            <p className="text-4xl font-bold text-[#354F99]">
              {resultat ? resultat.indemnityAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €" : "— €"}
            </p>
            <p className="text-xs text-gray-400">Minimum légal</p>
          </div>

          {/* Détails */}
          {resultat && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Détail du calcul</h3>

              {resultat.errors.length > 0 ? (
                <ul className="space-y-1">
                  {resultat.errors.map((erreur) => (
                    <li key={erreur} className="text-xs text-red-600">{erreur}</li>
                  ))}
                </ul>
              ) : (
                <dl className="space-y-3">
                  {[
                    { label: "Salaire de référence", value: `${resultat.referenceSalaryUsed.toLocaleString("fr-FR")} €/mois` },
                    { label: "Ancienneté retenue", value: `${resultat.seniorityInYears} an${resultat.seniorityInYears > 1 ? "s" : ""}` },
                    { label: "Formule applicable", value: formuleApplicable },
                    { label: "Tranche ≤ 10 ans", value: `${resultat.breakdown.partBefore10Years.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` },
                    { label: "Tranche > 10 ans", value: `${resultat.breakdown.partAfter10Years.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` },
                    { label: "Total estimé", value: `${resultat.indemnityAmount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`, bold: true },
                  ].map((ligne) => (
                    <div key={ligne.label} className="flex items-center justify-between gap-4 text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-gray-500">{ligne.label}</span>
                      <span className={`font-medium text-right ${ligne.bold ? "text-gray-900" : "text-gray-700"}`}>{ligne.value}</span>
                    </div>
                  ))}
                </dl>
              )}

              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Base légale : Art. R1234-2 du Code du travail. La convention collective peut prévoir une indemnité plus favorable.
                </p>
              </div>

              <button className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:border-gray-300 transition-colors">
                <Download className="h-4 w-4" />
                Exporter le rapport
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

