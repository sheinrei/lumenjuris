/**
 * Seed de la veille juridique : source Judilibre + taxonomie des concepts CDD.
 *
 * Idempotent : upsert par clé unique (name / concept) — relançable sans doublon.
 *
 * Lancement : npx tsx prisma/seedLegalWatch.ts
 *
 * `contractTypes` contient des CLÉS de modèles du moteur de génération
 * (front/src/contractEngine/models — ex. "cdd_accroissement"). Le matching
 * (src/services/legalWatch/matching.ts) résout ces clés vers les valeurs
 * réelles de Contract.contractType via CONTRACT_TYPE_PATTERNS.
 */
import "dotenv/config";
import { prisma } from "./singletonPrisma";

const DOMAIN_CDD = "droit_travail_contrats_precaires";

type ConceptSeed = {
  concept: string;
  label: string;
  legalDomain: string;
  keywords: string[];
  contractTypes: string[];
};

const CONCEPTS: ConceptSeed[] = [
  {
    concept: "motif_recours_cdd",
    label: "Motif de recours au CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "motif de recours",
      "cas de recours",
      "contrat à durée déterminée",
      "article L1242-2",
      "L. 1242-2",
      "recours au CDD",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "accroissement_temporaire_activite",
    label: "Accroissement temporaire d'activité",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "accroissement temporaire d'activité",
      "surcroît d'activité",
      "surcroît temporaire",
      "activité normale et permanente de l'entreprise",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "requalification_cdi",
    label: "Requalification en CDI",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "requalification en contrat à durée indéterminée",
      "requalification du CDD",
      "requalification en CDI",
      "article L1245-1",
      "L. 1245-1",
      "action en requalification",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "duree_maximale_renouvellement",
    label: "Durée maximale et renouvellement du CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "durée maximale du contrat à durée déterminée",
      "renouvellement du CDD",
      "dix-huit mois",
      "18 mois",
      "article L1242-8",
      "L. 1242-8",
      "avenant de renouvellement",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "delai_de_carence",
    label: "Délai de carence",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "délai de carence",
      "contrats successifs",
      "même poste de travail",
      "article L1244-3",
      "L. 1244-3",
      "tiers de la durée du contrat",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "mentions_obligatoires_cdd",
    label: "Mentions obligatoires du CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "mentions obligatoires",
      "définition précise de son motif",
      "contrat écrit",
      "article L1242-12",
      "L. 1242-12",
      "défaut de mention",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "indemnite_precarite",
    label: "Indemnité de précarité",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "indemnité de fin de contrat",
      "indemnité de précarité",
      "10 % de la rémunération",
      "article L1243-8",
      "L. 1243-8",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "rupture_anticipee_cdd",
    label: "Rupture anticipée du CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "rupture anticipée du contrat à durée déterminée",
      "rupture anticipée du CDD",
      "faute grave",
      "force majeure",
      "article L1243-1",
      "L. 1243-1",
      "article L1243-4",
      "dommages et intérêts d'un montant au moins égal",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "transmission_tardive_contrat",
    label: "Transmission tardive du contrat",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "transmission du contrat",
      "deux jours ouvrables",
      "transmission tardive",
      "article L1242-13",
      "L. 1242-13",
      "signature du contrat de travail",
    ],
    contractTypes: ["cdd_accroissement"],
  },
];

async function main() {
  // Sources (l'ingestion met à jour lastRunAt à chaque run). Judilibre active
  // par défaut ; Légifrance présente mais désactivée — l'utilisateur l'active
  // depuis l'onglet Paramètres. `update` ne force PAS isActive (respecte le
  // choix de l'utilisateur sur un reseed).
  const judilibre = await prisma.legalWatchSource.upsert({
    where: { name: "judilibre" },
    update: {},
    create: { name: "judilibre", isActive: true },
  });
  const legifrance = await prisma.legalWatchSource.upsert({
    where: { name: "legifrance" },
    update: {},
    create: { name: "legifrance", isActive: false },
  });
  console.log(`✔ Sources : ${judilibre.name} (active), ${legifrance.name} (désactivée par défaut)`);

  for (const c of CONCEPTS) {
    await prisma.legalConceptMapping.upsert({
      where: { concept: c.concept },
      update: {
        label: c.label,
        legalDomain: c.legalDomain,
        keywords: c.keywords,
        contractTypes: c.contractTypes,
      },
      create: {
        concept: c.concept,
        label: c.label,
        legalDomain: c.legalDomain,
        keywords: c.keywords,
        contractTypes: c.contractTypes,
      },
    });
  }
  const total = await prisma.legalConceptMapping.count();
  console.log(`✔ ${CONCEPTS.length} concepts CDD upsertés (${total} au total en base).`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
