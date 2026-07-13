/**
 * Modèle concret : avenant au contrat de travail.
 * Trame de départ éditable — à faire relire par un juriste avant usage.
 * Réf. : la modification d'un élément essentiel du contrat requiert l'accord
 * écrit du salarié (avenant signé).
 */
import type { ContractModel } from "../types";

export const avenantModel: ContractModel = {
  key: "avenant",
  version: 1,
  label: "Avenant au contrat de travail",

  variables: [
    { id: "emp_denomination", label: "Dénomination employeur", type: "text" },
    { id: "emp_adresse", label: "Adresse employeur", type: "text" },
    { id: "emp_siren", label: "SIREN", type: "text" },
    { id: "emp_representant", label: "Représentant", type: "text" },
    { id: "emp_qualite", label: "Qualité du représentant", type: "text" },
    { id: "sal_civilite", label: "Civilité", type: "text", default: "M." },
    { id: "sal_prenom", label: "Prénom du salarié", type: "text" },
    { id: "sal_nom", label: "Nom du salarié", type: "text" },
    { id: "contrat_initial_date", label: "Date du contrat initial", type: "date" },
    { id: "objet_modification", label: "Objet de la modification", type: "text" },
    { id: "date_effet", label: "Date d'effet de l'avenant", type: "date" },
    { id: "nouvelle_disposition", label: "Nouvelle disposition", type: "text" },
  ],

  blocks: [
    { id: "title", kind: "title", content: "AVENANT AU CONTRAT DE TRAVAIL" },
    {
      id: "preamble", kind: "preamble",
      content:
        "Entre {{emp_denomination}}, SIREN {{emp_siren}}, dont le siège est situé {{emp_adresse}}, " +
        "représentée par {{emp_representant}} en qualité de {{emp_qualite}}, ci-après « l'Employeur »,\n" +
        "Et {{sal_civilite}} {{sal_prenom}} {{sal_nom}}, ci-après « le Salarié »,\n" +
        "il a été convenu ce qui suit, en modification du contrat de travail conclu le {{contrat_initial_date}}.",
    },
    {
      id: "art_objet", kind: "clause", heading: "Article 1 – Objet de l'avenant", mandatory: true,
      content:
        "Le présent avenant a pour objet la modification suivante du contrat de travail initial : " +
        "{{objet_modification}}.",
    },
    {
      id: "art_modification", kind: "clause", heading: "Article 2 – Modification convenue", mandatory: true,
      content:
        "À compter du {{date_effet}}, la disposition suivante s'applique et remplace la clause " +
        "correspondante du contrat initial : {{nouvelle_disposition}}.",
    },
    {
      id: "art_inchange", kind: "clause", heading: "Article 3 – Dispositions inchangées",
      content:
        "Toutes les autres clauses du contrat de travail initial, non modifiées par le présent avenant, " +
        "demeurent applicables et inchangées.",
    },
    {
      id: "signatures", kind: "signature", heading: "Signatures",
      content: "Fait en deux exemplaires.\n\nL'Employeur\t\t\tLe Salarié (« Bon pour accord »)",
    },
  ],

  alternatives: [],
  decisions: [],
  rules: [],
  mandatoryMentions: [],
};
