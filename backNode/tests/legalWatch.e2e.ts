/**
 * Vérification de bout en bout du pipeline de veille juridique.
 *
 * ATTENTION : appelle les vraies APIs (Judilibre via PISTE, OpenAI) et écrit
 * en base. Volume plafonné (LEGAL_WATCH_MAX_DECISIONS, défaut 5 ici).
 *
 * Prérequis : microservice Python démarré (PYTHON_URL, défaut :5678),
 * base MariaDB accessible, taxonomie seedée (npm run seed:legalwatch).
 *
 * Lancement : npx tsx tests/legalWatch.e2e.ts [userId]
 * Crée un contrat CDD de démo (externalId préfixé "seed-legalwatch-") pour
 * vérifier le matching — supprimable en relançant seed:contratheque ou via
 * la contrathèque.
 */
import "dotenv/config"
import crypto from "crypto"

process.env.LEGAL_WATCH_MAX_DECISIONS = process.env.LEGAL_WATCH_MAX_DECISIONS || "5"

const TARGET_USER_ID = Number(process.argv[2] ?? 1)

const { prisma } = await import("../prisma/singletonPrisma")
const { LegalWatchService } = await import("../src/services/legalWatch/classLegalWatch")

const svc = new LegalWatchService()

// ── 0. Contrat CDD de démo pour le matching ──────────────────────────────────
const DEMO_EXTERNAL_ID = "seed-legalwatch-demo-cdd"
const existing = await prisma.contract.findUnique({ where: { externalId: DEMO_EXTERNAL_ID } })
if (!existing) {
    await prisma.contract.create({
        data: {
            externalId: DEMO_EXTERNAL_ID,
            title: "CDD accroissement — Chargé de production (démo veille)",
            contractType: "CDD – Accroissement temporaire d'activité",
            counterpartyName: "Salarié démo",
            status: "ACTIVE",
            userId: TARGET_USER_ID,
        },
    })
    console.log(`✔ Contrat CDD de démo créé pour userId=${TARGET_USER_ID}`)
} else {
    console.log("✔ Contrat CDD de démo déjà présent")
}

// ── 1. Ingestion ─────────────────────────────────────────────────────────────
console.log("\n── Ingestion Judilibre ──")
const ingest = await svc.runIngest()
console.log(JSON.stringify(ingest, null, 2))

// ── 2. Enrichissement ────────────────────────────────────────────────────────
console.log("\n── Enrichissement LLM ──")
const enrich = await svc.runEnrich()
console.log(JSON.stringify(enrich, null, 2))

// ── 3. Publication + alertes ─────────────────────────────────────────────────
console.log("\n── Matching + publication ──")
const publish = await svc.runPublish()
console.log(JSON.stringify(publish, null, 2))

// ── 4. Idempotence : relance de l'ingestion → tout doit être skippé ──────────
console.log("\n── Ré-ingestion (idempotence) ──")
const reingest = await svc.runIngest()
console.log(`fetched=${reingest.fetched} inserted=${reingest.inserted} skipped=${reingest.skipped}`)
if (reingest.inserted > 0) {
    console.error("✗ ATTENTION : la ré-ingestion a créé des doublons !")
    process.exitCode = 1
} else {
    console.log("✔ Aucun doublon créé")
}

// ── 5. Lecture côté API ──────────────────────────────────────────────────────
console.log("\n── Alertes de l'utilisateur ──")
const alerts = await svc.listAlerts(TARGET_USER_ID)
for (const a of alerts.slice(0, 5)) {
    console.log(`• [${a.item.impactLevel ?? "?"}] ${a.item.title}`)
    console.log(`  ${a.item.summary?.slice(0, 140) ?? "(pas de résumé)"}`)
    console.log(`  concepts: ${a.item.concepts.join(", ")} — contrats: ${a.contracts.map((c) => c.title).join(" | ")}`)
}
console.log(`Total alertes: ${alerts.length}, non lues: ${await svc.unreadCount(TARGET_USER_ID)}`)

console.log("\n── Digest ──")
const digest = await svc.digest({ pageSize: 5 })
console.log(`Total items publiés: ${digest.total}`)
for (const item of digest.items) {
    console.log(`• [${item.impactLevel ?? "?"}] ${item.decisionDate?.slice(0, 10)} ${item.title} — ${item.legalDomain}`)
}

await prisma.$disconnect()
