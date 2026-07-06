/**
 * Modèle concret : CDI (contrat de travail à durée indéterminée).
 * Trame de départ éditable — à faire relire par un juriste avant usage.
 * Réf. : art. L1221-1 et s., L1242-1 a contrario, conventions collectives.
 *
 * Réutilise les mêmes identifiants de variables employeur/salarié que le CDD
 * pour bénéficier du pré-remplissage entreprise et de la vérification de
 * convention collective.
 */
import type { ContractModel } from "../types";

export const cdiModel: ContractModel = {
  key: "cdi",
  version: 1,
  label: "CDI – Contrat à durée indéterminée",

  variables: [
    { id: "emp_denomination", label: "Dénomination employeur", type: "text" },
    { id: "emp_adresse", label: "Adresse employeur", type: "text" },
    { id: "emp_siren", label: "SIREN", type: "text" },
    { id: "emp_representant", label: "Représentant", type: "text" },
    { id: "emp_qualite", label: "Qualité du représentant", type: "text" },
    { id: "emp_code_naf", label: "Code NAF", type: "text" },
    { id: "sal_civilite", label: "Civilité", type: "text", default: "M." },
    { id: "sal_prenom", label: "Prénom du salarié", type: "text" },
    { id: "sal_nom", label: "Nom du salarié", type: "text" },
    { id: "sal_adresse", label: "Adresse du salarié", type: "text" },
    { id: "poste_intitule", label: "Intitulé du poste", type: "text" },
    { id: "poste_qualification", label: "Qualification / classification", type: "text" },
    { id: "lieu_travail", label: "Lieu de travail", type: "text" },
    { id: "date_debut", label: "Date d'embauche", type: "date" },
    { id: "essai_mois", label: "Période d'essai (mois)", type: "number" },
    { id: "heures_hebdo", label: "Heures hebdomadaires", type: "number", default: "35" },
    { id: "remuneration_brute", label: "Rémunération brute mensuelle (€)", type: "money" },
    { id: "preavis", label: "Préavis (mois)", type: "text" },
    { id: "convention_collective", label: "Convention collective", type: "text" },
  ],

  blocks: [
    { id: "title", kind: "title", content: "CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE" },
    {
      id: "preamble", kind: "preamble",
      content:
        "Entre {{emp_denomination}}, SIREN {{emp_siren}}, dont le siège est situé {{emp_adresse}}, " +
        "représentée par {{emp_representant}} en qualité de {{emp_qualite}}, ci-après « l'Employeur »,\n" +
        "Et {{sal_civilite}} {{sal_prenom}} {{sal_nom}}, demeurant {{sal_adresse}}, ci-après « le Salarié »,\n" +
        "il a été convenu ce qui suit.",
    },
    {
      id: "art_engagement", kind: "clause", heading: "Article 1 – Engagement", mandatory: true,
      content:
        "L'Employeur engage le Salarié à compter du {{date_debut}}, à durée indéterminée, " +
        "sous réserve des résultats de la visite d'information et de prévention.",
    },
    {
      id: "art_fonctions", kind: "clause", heading: "Article 2 – Fonctions et qualification", mandatory: true,
      content:
        "Le Salarié est engagé en qualité de {{poste_intitule}} (qualification : {{poste_qualification}}). " +
        "Le lieu de travail est fixé à {{lieu_travail}}.",
    },
    {
      id: "art_essai", kind: "clause", heading: "Article 3 – Période d'essai",
      content:
        "Le contrat comporte une période d'essai de {{essai_mois}} mois, renouvelable une fois dans les " +
        "conditions prévues par la convention collective et la loi (art. L1221-19 et s.).",
    },
    {
      id: "art_temps", kind: "clause", heading: "Article 4 – Durée du travail",
      content: "La durée hebdomadaire de travail est fixée à {{heures_hebdo}} heures.",
    },
    {
      id: "art_remuneration", kind: "clause", heading: "Article 5 – Rémunération", mandatory: true,
      content:
        "En contrepartie de son travail, le Salarié percevra une rémunération brute mensuelle de " +
        "{{remuneration_brute}} €, versée à la fin de chaque mois.",
    },
    {
      id: "art_convention", kind: "clause", heading: "Article 6 – Convention collective", mandatory: true,
      content: "Les relations entre les parties sont régies par la convention collective : {{convention_collective}}.",
    },
    {
      id: "art_conges", kind: "clause", heading: "Article 7 – Congés payés",
      content:
        "Le Salarié bénéficie des congés payés dans les conditions légales et conventionnelles " +
        "(2,5 jours ouvrables par mois de travail effectif).",
    },
    {
      id: "art_preavis", kind: "clause", heading: "Article 8 – Préavis et rupture",
      content:
        "En cas de rupture du contrat, et hors période d'essai, un préavis de {{preavis}} sera respecté, " +
        "conformément à la loi et à la convention collective applicable.",
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
