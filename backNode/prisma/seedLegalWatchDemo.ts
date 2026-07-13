/**
 * Contrat CDD de démonstration pour la veille juridique — VOLONTAIREMENT mal
 * rédigé : chaque défaut correspond à un concept surveillé par la veille.
 *
 *   - motif vague (« surcroît d'activité » sans précision)  → motif de recours / mentions obligatoires
 *   - durée 24 mois                                          → durée maximale (18 mois)
 *   - « renouvelable autant de fois que nécessaire »         → renouvellement
 *   - poste repris le lendemain d'un autre CDD               → délai de carence
 *   - renonciation à l'indemnité de fin de contrat           → indemnité de précarité
 *   - rupture libre par l'employeur sous 48 h                → rupture anticipée
 *   - remise du contrat « dans le mois »                     → transmission tardive (> 2 jours ouvrables)
 *
 * Idempotent (upsert). Lancement : npx tsx prisma/seedLegalWatchDemo.ts [userId]
 */
import "dotenv/config";
import { prisma } from "./singletonPrisma";

const EXTERNAL_ID = "seed-legalwatch-demo-cdd";
const TARGET_USER_ID = Number(process.argv[2] ?? 1);

const BAD_CDD_TEXT = `CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE

Entre la société DUPONT LOGISTIQUE SARL, représentée par son gérant,
et Monsieur Karim BENALI, demeurant à Lyon,

il est convenu ce qui suit :

Article 1 — Engagement
M. BENALI est engagé en CDD pour surcroît d'activité.

Article 2 — Durée
Le contrat est conclu pour une durée de 24 mois à compter du 1er juin 2026.
Il pourra être renouvelé autant de fois que nécessaire, par simple décision
de l'employeur.

Article 3 — Poste
M. BENALI occupera le poste de préparateur de commandes, précédemment occupé
en CDD par M. MARTIN dont le contrat s'est achevé la veille de l'embauche.

Article 4 — Rémunération
Salaire mensuel brut : 1 900 euros. Le salarié déclare renoncer expressément
à l'indemnité de fin de contrat de 10 %.

Article 5 — Rupture
L'employeur pourra mettre fin au présent contrat à tout moment, sans
indemnité, moyennant un préavis de 48 heures.

Article 6 — Remise du contrat
Un exemplaire du présent contrat sera remis au salarié dans le mois suivant
son embauche.

Fait à Lyon, le 1er juin 2026, en un seul exemplaire.`;

async function main() {
  const data = {
    title: "CDD préparateur de commandes — Dupont Logistique (démo)",
    contractType: "CDD – Accroissement temporaire d'activité",
    counterpartyName: "Karim Benali",
    responsibleName: "Margaux Chauvin",
    status: "ACTIVE" as const,
    signatureDate: new Date("2026-06-01"),
    effectiveDate: new Date("2026-06-01"),
    endDate: new Date("2028-05-31"),
    durationMonths: 24,
    amount: 22800,
    governingLaw: "Droit français",
    ocrText: BAD_CDD_TEXT,
  };
  const contract = await prisma.contract.upsert({
    where: { externalId: EXTERNAL_ID },
    update: data,
    create: { ...data, externalId: EXTERNAL_ID, userId: TARGET_USER_ID },
  });
  console.log(`✔ Contrat démo "${contract.title}" (${contract.externalId}) pour userId=${contract.userId}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
