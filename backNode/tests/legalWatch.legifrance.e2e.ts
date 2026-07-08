/**
 * Vérification ciblée de la source Légifrance (vraie API PISTE + OpenAI).
 * Active Légifrance, lance ingest+enrich (plafonné), rapporte les items
 * Légifrance obtenus, puis remet la source dans son état initial.
 *
 * Lancement (Python sur 5679 avec le code à jour) :
 *   $env:PYTHON_URL="http://127.0.0.1:5679"; $env:LEGAL_WATCH_MAX_DECISIONS="3"
 *   npx tsx tests/legalWatch.legifrance.e2e.ts
 */
import "dotenv/config"

process.env.LEGAL_WATCH_MAX_DECISIONS = process.env.LEGAL_WATCH_MAX_DECISIONS || "3"

const { prisma } = await import("../prisma/singletonPrisma")
const { LegalWatchService } = await import("../src/services/legalWatch/classLegalWatch")
const svc = new LegalWatchService()

const before = await prisma.legalWatchSource.findUnique({ where: { name: "legifrance" } })
const wasActive = before?.isActive ?? false

await prisma.legalWatchSource.update({ where: { name: "legifrance" }, data: { isActive: true } })
console.log("Légifrance activée pour le test.\n")

console.log("── Ingestion (sources actives) ──")
console.log(JSON.stringify(await svc.runIngest(), null, 2))

console.log("\n── Enrichissement ──")
console.log(JSON.stringify(await svc.runEnrich(), null, 2))

// Compte les items provenant de Légifrance.
const legiSource = await prisma.legalWatchSource.findUnique({ where: { name: "legifrance" } })
const legiItems = await prisma.legalWatchItem.findMany({
    where: { sourceId: legiSource!.idSource },
    orderBy: { createdAt: "desc" },
    take: 6,
})
console.log(`\n── Items Légifrance en base : ${legiItems.length} ──`)
for (const it of legiItems) {
    console.log(`• [${it.status}] ${it.jurisdiction ?? "?"} | ${it.title.slice(0, 70)}`)
    if (it.summary) console.log(`  → ${it.summary.slice(0, 130)}`)
}

// Restaure l'état initial (l'utilisateur active Légifrance depuis l'UI).
await prisma.legalWatchSource.update({ where: { name: "legifrance" }, data: { isActive: wasActive } })
console.log(`\nLégifrance remise à isActive=${wasActive} (état initial).`)

await prisma.$disconnect()
