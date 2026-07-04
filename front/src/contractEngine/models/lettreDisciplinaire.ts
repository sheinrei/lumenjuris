/**
 * Modèle concret : convocation à entretien préalable à une sanction disciplinaire.
 * Trame de départ éditable — à faire relire par un juriste avant usage.
 * Réf. : art. L1332-1 et s. (procédure disciplinaire), L1232-2 (entretien préalable).
 *
 * Pas de convention collective ici : le panneau dédié est automatiquement masqué.
 */
import type { ContractModel } from "../types";

export const lettreDisciplinaireModel: ContractModel = {
  key: "lettre_disciplinaire",
  version: 1,
  label: "Lettre disciplinaire – convocation à entretien préalable",

  variables: [
    { id: "emp_denomination", label: "Dénomination employeur", type: "text" },
    { id: "emp_adresse", label: "Adresse employeur", type: "text" },
    { id: "emp_representant", label: "Représentant", type: "text" },
    { id: "emp_qualite", label: "Qualité du représentant", type: "text" },
    { id: "sal_civilite", label: "Civilité", type: "text", default: "M." },
    { id: "sal_prenom", label: "Prénom du salarié", type: "text" },
    { id: "sal_nom", label: "Nom du salarié", type: "text" },
    { id: "sal_adresse", label: "Adresse du salarié", type: "text" },
    { id: "date_faits", label: "Date des faits", type: "date" },
    { id: "description_faits", label: "Description des faits reprochés", type: "text" },
    { id: "date_entretien", label: "Date de l'entretien", type: "date" },
    { id: "heure_entretien", label: "Heure de l'entretien", type: "text" },
    { id: "lieu_entretien", label: "Lieu de l'entretien", type: "text" },
    { id: "lieu_courrier", label: "Fait à", type: "text" },
    { id: "date_courrier", label: "Date du courrier", type: "date" },
  ],

  blocks: [
    { id: "title", kind: "title", content: "CONVOCATION À ENTRETIEN PRÉALABLE" },
    {
      id: "entete", kind: "preamble",
      content:
        "{{emp_denomination}}, {{emp_adresse}}, représentée par {{emp_representant}} ({{emp_qualite}}),\n" +
        "À l'attention de {{sal_civilite}} {{sal_prenom}} {{sal_nom}}, {{sal_adresse}}.\n" +
        "Lettre remise en main propre contre décharge ou adressée en recommandé avec accusé de réception.",
    },
    {
      id: "art_objet", kind: "clause", heading: "Objet", mandatory: true,
      content: "Convocation à un entretien préalable pouvant conduire à une sanction disciplinaire.",
    },
    {
      id: "art_faits", kind: "clause", heading: "Faits reprochés", mandatory: true,
      content:
        "Nous envisageons de prendre une sanction disciplinaire à votre encontre en raison des faits " +
        "suivants, constatés le {{date_faits}} : {{description_faits}}.",
    },
    {
      id: "art_entretien", kind: "clause", heading: "Entretien préalable", mandatory: true,
      content:
        "Nous vous convoquons à un entretien préalable le {{date_entretien}} à {{heure_entretien}}, " +
        "{{lieu_entretien}} (art. L1232-2 du Code du travail).",
    },
    {
      id: "art_assistance", kind: "clause", heading: "Assistance",
      content:
        "Vous pouvez vous faire assister lors de cet entretien par une personne de votre choix appartenant " +
        "au personnel de l'entreprise, ou, en l'absence de représentants du personnel, par un conseiller du salarié.",
    },
    {
      id: "signatures", kind: "signature", heading: "Signature",
      content: "Fait à {{lieu_courrier}}, le {{date_courrier}}.\n\nPour l'Employeur, {{emp_representant}}",
    },
  ],

  alternatives: [],
  decisions: [],
  rules: [],
  mandatoryMentions: [],
};
