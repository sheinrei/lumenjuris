/**
 * Modèle concret : convention de rupture conventionnelle (CDI).
 * Trame de départ éditable — à faire relire par un juriste avant usage.
 * Réf. : art. L1237-11 et s. (rupture conventionnelle), indemnité spécifique,
 * délai de rétractation de 15 jours, homologation par la DREETS (Cerfa 14598).
 */
import type { ContractModel } from "../types";

export const ruptureConventionnelleModel: ContractModel = {
  key: "rupture_conventionnelle",
  version: 1,
  label: "Rupture conventionnelle",

  variables: [
    { id: "emp_denomination", label: "Dénomination employeur", type: "text" },
    { id: "emp_adresse", label: "Adresse employeur", type: "text" },
    { id: "emp_siren", label: "SIREN", type: "text" },
    { id: "emp_representant", label: "Représentant", type: "text" },
    { id: "emp_qualite", label: "Qualité du représentant", type: "text" },
    { id: "sal_civilite", label: "Civilité", type: "text", default: "M." },
    { id: "sal_prenom", label: "Prénom du salarié", type: "text" },
    { id: "sal_nom", label: "Nom du salarié", type: "text" },
    { id: "sal_adresse", label: "Adresse du salarié", type: "text" },
    { id: "poste_intitule", label: "Poste occupé", type: "text" },
    { id: "date_entree", label: "Date d'entrée dans l'entreprise", type: "date" },
    { id: "date_entretien", label: "Date de l'entretien", type: "date" },
    { id: "date_rupture", label: "Date de rupture envisagée", type: "date" },
    { id: "indemnite_montant", label: "Indemnité spécifique de rupture (€)", type: "money" },
    { id: "convention_collective", label: "Convention collective", type: "text" },
  ],

  blocks: [
    { id: "title", kind: "title", content: "CONVENTION DE RUPTURE CONVENTIONNELLE" },
    {
      id: "preamble", kind: "preamble",
      content:
        "Entre {{emp_denomination}}, SIREN {{emp_siren}}, dont le siège est situé {{emp_adresse}}, " +
        "représentée par {{emp_representant}} en qualité de {{emp_qualite}}, ci-après « l'Employeur »,\n" +
        "Et {{sal_civilite}} {{sal_prenom}} {{sal_nom}}, demeurant {{sal_adresse}}, occupant le poste de " +
        "{{poste_intitule}} depuis le {{date_entree}}, ci-après « le Salarié ».",
    },
    {
      id: "art_accord", kind: "clause", heading: "Article 1 – Principe de la rupture", mandatory: true,
      content:
        "Les parties conviennent d'un commun accord de rompre le contrat de travail à durée indéterminée " +
        "qui les lie, dans le cadre des articles L1237-11 et suivants du Code du travail.",
    },
    {
      id: "art_entretien", kind: "clause", heading: "Article 2 – Entretien(s)", mandatory: true,
      content:
        "Les parties se sont rencontrées lors d'un entretien le {{date_entretien}}, au cours duquel elles " +
        "ont défini les conditions de la rupture. Le Salarié a été informé de la possibilité de se faire assister.",
    },
    {
      id: "art_date", kind: "clause", heading: "Article 3 – Date de rupture", mandatory: true,
      content:
        "La rupture du contrat prendra effet le {{date_rupture}}, au plus tôt le lendemain de l'homologation " +
        "de la présente convention par l'autorité administrative (DREETS).",
    },
    {
      id: "art_indemnite", kind: "clause", heading: "Article 4 – Indemnité spécifique", mandatory: true,
      content:
        "Le Salarié percevra une indemnité spécifique de rupture conventionnelle d'un montant de " +
        "{{indemnite_montant}} €, au moins égale à l'indemnité légale de licenciement.",
    },
    {
      id: "art_retractation", kind: "clause", heading: "Article 5 – Rétractation et homologation", mandatory: true,
      content:
        "Chaque partie dispose d'un délai de rétractation de 15 jours calendaires à compter de la signature. " +
        "La convention est ensuite adressée à l'autorité administrative pour homologation (art. L1237-14).",
    },
    {
      id: "art_convention", kind: "clause", heading: "Article 6 – Convention collective",
      content: "Les relations entre les parties restent régies, jusqu'à la rupture, par la convention collective : {{convention_collective}}.",
    },
    {
      id: "signatures", kind: "signature", heading: "Signatures",
      content: "Fait en deux exemplaires.\n\nL'Employeur\t\t\tLe Salarié (« Lu et approuvé »)",
    },
  ],

  alternatives: [],
  decisions: [],
  rules: [],
  mandatoryMentions: [],
};
