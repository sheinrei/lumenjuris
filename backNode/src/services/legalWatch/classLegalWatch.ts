import crypto from "crypto"
import { prisma } from "../../../prisma/singletonPrisma"
import { matchContractsForItem } from "./matching"

/**
 * Service métier de la veille juridique.
 *
 * Pipeline (idempotent à chaque étape, relançable sans doublon) :
 *   1. runIngest()  — Judilibre via microservice Python (stateless), dédup SHA-256
 *   2. runEnrich()  — enrichissement LLM par batch (Python), statuts stricts
 *   3. runPublish() — matching par type de modèle → alertes (unique itemId+userId)
 *
 * Le microservice Python n'accède JAMAIS à la base : ce service porte toute
 * la persistance (convention du projet).
 *
 * Positionnement produit : la veille détecte et priorise, elle ne constitue
 * jamais un avis juridique — chaque alerte porte la mention de validation.
 */

const PYTHON_URL = process.env.PYTHON_URL || "http://localhost:5678"
const SOURCE_JUDILIBRE = "judilibre"
/** Chevauchement de la fenêtre glissante : 2 jours pour ne rien rater. */
const OVERLAP_DAYS = 2
/** Fenêtre par défaut au premier run (source jamais exécutée). */
const FIRST_RUN_DAYS = 90
const ENRICH_BATCH_SIZE = Number(process.env.LEGAL_WATCH_ENRICH_BATCH || 10)
const ENRICH_MAX_PER_RUN = Number(process.env.LEGAL_WATCH_ENRICH_MAX || 100)
const MAX_DECISIONS_PER_RUN = Number(process.env.LEGAL_WATCH_MAX_DECISIONS || 50)

function pythonHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
    }
}

function toDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10)
}

export function sha256(text: string): string {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex")
}

// ── DTO ──────────────────────────────────────────────────────────────────────

export interface IngestReport {
    windowStart: string
    fetched: number
    inserted: number
    skipped: number
    errors: string[]
}

export interface EnrichReport {
    processed: number
    enriched: number
    discarded: number
    failed: number
    batches: number
}

export interface PublishReport {
    published: number
    alertsCreated: number
    usersAlerted: number
}

export interface AlertDTO {
    id: string
    status: "UNREAD" | "READ" | "DISMISSED"
    createdAt: string
    item: DigestItemDTO
    contracts: Array<{ id: string; title: string; contractType: string | null }>
}

export interface DigestItemDTO {
    id: string
    title: string
    jurisdiction: string | null
    decisionDate: string | null
    sourceUrl: string
    summary: string | null
    legalDomain: string | null
    concepts: string[]
    impactLevel: "HAUT" | "MOYEN" | "FAIBLE" | null
    isEvolution: boolean | null
}

// ── Service ──────────────────────────────────────────────────────────────────

export class LegalWatchService {

    // ── 1. Ingestion (toutes les sources actives) ─────────────────────────────

    /** Assure l'existence de la source Judilibre (seed minimal au premier run). */
    private async ensureJudilibre(): Promise<void> {
        await prisma.legalWatchSource.upsert({
            where: { name: SOURCE_JUDILIBRE },
            update: {},
            create: { name: SOURCE_JUDILIBRE, isActive: true },
        })
    }

    /** Requêtes textuelles issues des keywords de la taxonomie active. */
    private async buildQueries(): Promise<string[]> {
        const mappings = await prisma.legalConceptMapping.findMany({ where: { isActive: true } })
        return [...new Set(
            mappings.flatMap((m) =>
                (Array.isArray(m.keywords) ? m.keywords : [])
                    .filter((k): k is string => typeof k === "string")
                    .slice(0, 2),
            ),
        )].slice(0, 20)
    }

    /** Ingère une source active. Retourne fetched/inserted/skipped + erreurs. */
    private async ingestSource(
        source: { idSource: number; name: string; lastRunAt: Date | null },
        queries: string[],
    ): Promise<IngestReport> {
        // Fenêtre glissante depuis lastRunAt, avec chevauchement de 2 jours.
        const start = source.lastRunAt
            ? new Date(source.lastRunAt.getTime() - OVERLAP_DAYS * 86_400_000)
            : new Date(Date.now() - FIRST_RUN_DAYS * 86_400_000)
        const runStartedAt = new Date()

        const r = await fetch(`${PYTHON_URL}/legal-watch/fetch`, {
            method: "POST",
            headers: pythonHeaders(),
            body: JSON.stringify({
                queries,
                source: source.name,
                date_start: toDateOnly(start),
                chamber: "soc",
                max_decisions: MAX_DECISIONS_PER_RUN,
            }),
        })
        if (!r.ok) {
            const detail = await r.text().catch(() => "")
            throw new Error(`Python /legal-watch/fetch (${source.name}) → ${r.status} ${detail.slice(0, 200)}`)
        }
        const data = await r.json() as {
            decisions: Array<{
                providerId: string
                title: string
                jurisdiction: string | null
                decisionDate: string | null
                sourceUrl: string
                rawText: string
            }>
            report: { errors: string[] }
        }

        let inserted = 0
        let skipped = 0
        const errors = [...(data.report?.errors ?? [])]

        for (const dec of data.decisions) {
            const contentHash = sha256(dec.rawText)
            const existing = await prisma.legalWatchItem.findFirst({
                where: {
                    OR: [
                        { contentHash },
                        { sourceId: source.idSource, providerId: dec.providerId },
                    ],
                },
                select: { idItem: true },
            })
            if (existing) {
                skipped++
                continue
            }
            try {
                await prisma.legalWatchItem.create({
                    data: {
                        externalId: crypto.randomUUID(),
                        providerId: dec.providerId,
                        contentHash,
                        title: dec.title,
                        jurisdiction: dec.jurisdiction,
                        decisionDate: dec.decisionDate ? new Date(dec.decisionDate) : null,
                        sourceUrl: dec.sourceUrl,
                        rawText: dec.rawText,
                        sourceId: source.idSource,
                    },
                })
                inserted++
            } catch (err) {
                // Course éventuelle sur la contrainte unique : on skip, sans crash.
                skipped++
                errors.push(`insert ${dec.providerId}: ${(err as Error).message.slice(0, 120)}`)
            }
        }

        await prisma.legalWatchSource.update({
            where: { idSource: source.idSource },
            data: { lastRunAt: runStartedAt },
        })

        console.log(
            `[legal-watch] ingest ${source.name}: fenêtre ${toDateOnly(start)} → ` +
            `${data.decisions.length} récupérés, ${inserted} insérés, ${skipped} skippés, ${errors.length} erreurs`,
        )
        return { windowStart: toDateOnly(start), fetched: data.decisions.length, inserted, skipped, errors }
    }

    /** Ingère toutes les sources actives (Judilibre, Légifrance…) et agrège. */
    async runIngest(): Promise<IngestReport> {
        await this.ensureJudilibre()
        const sources = await prisma.legalWatchSource.findMany({ where: { isActive: true } })
        if (sources.length === 0) {
            return { windowStart: "", fetched: 0, inserted: 0, skipped: 0, errors: ["aucune source active"] }
        }
        const queries = await this.buildQueries()

        const agg: IngestReport = { windowStart: "", fetched: 0, inserted: 0, skipped: 0, errors: [] }
        for (const source of sources) {
            try {
                const rep = await this.ingestSource(source, queries)
                agg.fetched += rep.fetched
                agg.inserted += rep.inserted
                agg.skipped += rep.skipped
                agg.errors.push(...rep.errors.map((e) => `[${source.name}] ${e}`))
                agg.windowStart = agg.windowStart || rep.windowStart
            } catch (err) {
                // Une source en échec (API indisponible) ne bloque pas les autres.
                agg.errors.push(`[${source.name}] ${(err as Error).message}`)
                console.error(`[legal-watch] ingest ${source.name} échec:`, err)
            }
        }
        return agg
    }

    // ── 2. Enrichissement LLM ────────────────────────────────────────────────

    async runEnrich(batchSize = ENRICH_BATCH_SIZE): Promise<EnrichReport> {
        const mappings = await prisma.legalConceptMapping.findMany({ where: { isActive: true } })
        const concepts = mappings.map((m) => ({
            concept: m.concept,
            label: m.label,
            legalDomain: m.legalDomain,
            keywords: Array.isArray(m.keywords) ? m.keywords : [],
        }))

        const report: EnrichReport = { processed: 0, enriched: 0, discarded: 0, failed: 0, batches: 0 }

        while (report.processed < ENRICH_MAX_PER_RUN) {
            const items = await prisma.legalWatchItem.findMany({
                where: { status: "INGESTED" },
                orderBy: { decisionDate: "desc" },
                take: Math.min(batchSize, ENRICH_MAX_PER_RUN - report.processed),
            })
            if (items.length === 0) break
            report.batches++

            const r = await fetch(`${PYTHON_URL}/legal-watch/enrich`, {
                method: "POST",
                headers: pythonHeaders(),
                body: JSON.stringify({
                    items: items.map((i) => ({
                        externalId: i.externalId,
                        title: i.title,
                        jurisdiction: i.jurisdiction,
                        decisionDate: i.decisionDate ? toDateOnly(i.decisionDate) : null,
                        rawText: i.rawText,
                    })),
                    concepts,
                }),
            })
            if (!r.ok) {
                const detail = await r.text().catch(() => "")
                throw new Error(`Python /legal-watch/enrich → ${r.status} ${detail.slice(0, 200)}`)
            }
            const data = await r.json() as {
                results: Array<{
                    externalId: string
                    status: "enriched" | "discarded" | "error"
                    error?: string | null
                    data?: {
                        summary: string
                        legalDomain: string
                        concepts: string[]
                        impactLevel: "haut" | "moyen" | "faible"
                        isEvolution: boolean
                        confidence: number
                    } | null
                }>
            }

            for (const result of data.results) {
                report.processed++
                if (result.status === "error" || !result.data) {
                    report.failed++
                    await prisma.legalWatchItem.update({
                        where: { externalId: result.externalId },
                        data: { status: "ERROR", enrichError: result.error ?? "sortie LLM invalide" },
                    })
                    continue
                }
                const enrichedData = {
                    summary: result.data.summary,
                    legalDomain: result.data.legalDomain,
                    concepts: result.data.concepts,
                    impactLevel: result.data.impactLevel.toUpperCase() as "HAUT" | "MOYEN" | "FAIBLE",
                    isEvolution: result.data.isEvolution,
                    confidence: result.data.confidence,
                    enrichedAt: new Date(),
                    enrichError: null,
                }
                if (result.status === "discarded") {
                    report.discarded++
                    await prisma.legalWatchItem.update({
                        where: { externalId: result.externalId },
                        data: { ...enrichedData, status: "DISCARDED" },
                    })
                } else {
                    report.enriched++
                    await prisma.legalWatchItem.update({
                        where: { externalId: result.externalId },
                        data: { ...enrichedData, status: "ENRICHED" },
                    })
                }
            }
        }

        console.log(
            `[legal-watch] enrich: ${report.processed} traités en ${report.batches} batch(s) — ` +
            `${report.enriched} enrichis, ${report.discarded} hors périmètre, ${report.failed} en erreur`,
        )
        return report
    }

    // ── 3. Matching + alertes + publication ──────────────────────────────────

    async runPublish(): Promise<PublishReport> {
        const mappings = await prisma.legalConceptMapping.findMany({ where: { isActive: true } })
        const items = await prisma.legalWatchItem.findMany({ where: { status: "ENRICHED" } })

        const report: PublishReport = { published: 0, alertsCreated: 0, usersAlerted: 0 }
        const alertedUsers = new Set<number>()

        for (const item of items) {
            const byUser = await matchContractsForItem(item, mappings)

            for (const [userId, contracts] of byUser) {
                // Idempotence : contrainte unique (itemId, userId) — un rerun ne
                // crée pas de double alerte et ne réveille pas une alerte traitée.
                await prisma.legalWatchAlert.upsert({
                    where: { itemId_userId: { itemId: item.idItem, userId } },
                    update: { contractIds: contracts.map((c) => c.externalId) },
                    create: {
                        externalId: crypto.randomUUID(),
                        userId,
                        itemId: item.idItem,
                        contractIds: contracts.map((c) => c.externalId),
                    },
                })
                report.alertsCreated++
                alertedUsers.add(userId)
            }

            // L'item alimente le digest même sans contrat concerné.
            await prisma.legalWatchItem.update({
                where: { idItem: item.idItem },
                data: { status: "PUBLISHED" },
            })
            report.published++
        }

        report.usersAlerted = alertedUsers.size
        console.log(
            `[legal-watch] publish: ${report.published} items publiés, ` +
            `${report.alertsCreated} alertes pour ${report.usersAlerted} utilisateur(s)`,
        )
        return report
    }

    // ── Requêtes côté API ────────────────────────────────────────────────────

    private toDigestDTO(item: {
        externalId: string; title: string; jurisdiction: string | null
        decisionDate: Date | null; sourceUrl: string; summary: string | null
        legalDomain: string | null; concepts: unknown; impactLevel: string | null
        isEvolution: boolean | null
    }): DigestItemDTO {
        return {
            id: item.externalId,
            title: item.title,
            jurisdiction: item.jurisdiction,
            decisionDate: item.decisionDate ? item.decisionDate.toISOString() : null,
            sourceUrl: item.sourceUrl,
            summary: item.summary,
            legalDomain: item.legalDomain,
            concepts: Array.isArray(item.concepts)
                ? item.concepts.filter((c): c is string => typeof c === "string")
                : [],
            impactLevel: (item.impactLevel as DigestItemDTO["impactLevel"]) ?? null,
            isEvolution: item.isEvolution,
        }
    }

    async listAlerts(userId: number, status?: "UNREAD" | "READ" | "DISMISSED"): Promise<AlertDTO[]> {
        const alerts = await prisma.legalWatchAlert.findMany({
            where: { userId, ...(status ? { status } : {}) },
            include: { item: true },
            orderBy: { createdAt: "desc" },
        })

        // Résolution des contrats concernés (id + titre) en une seule requête.
        const allContractIds = [...new Set(alerts.flatMap((a) =>
            Array.isArray(a.contractIds)
                ? a.contractIds.filter((c): c is string => typeof c === "string")
                : [],
        ))]
        const contracts = allContractIds.length > 0
            ? await prisma.contract.findMany({
                where: { externalId: { in: allContractIds }, userId },
                select: { externalId: true, title: true, contractType: true },
            })
            : []
        const contractByExternalId = new Map(contracts.map((c) => [c.externalId, c]))

        return alerts.map((alert) => ({
            id: alert.externalId,
            status: alert.status,
            createdAt: alert.createdAt.toISOString(),
            item: this.toDigestDTO(alert.item),
            contracts: (Array.isArray(alert.contractIds) ? alert.contractIds : [])
                .filter((c): c is string => typeof c === "string")
                .map((externalId) => contractByExternalId.get(externalId))
                .filter((c): c is NonNullable<typeof c> => c !== undefined)
                .map((c) => ({ id: c.externalId, title: c.title, contractType: c.contractType })),
        }))
    }

    async updateAlertStatus(
        userId: number,
        alertExternalId: string,
        status: "UNREAD" | "READ" | "DISMISSED",
    ): Promise<boolean> {
        const { count } = await prisma.legalWatchAlert.updateMany({
            where: { externalId: alertExternalId, userId },
            data: { status },
        })
        return count > 0
    }

    async unreadCount(userId: number): Promise<number> {
        return prisma.legalWatchAlert.count({ where: { userId, status: "UNREAD" } })
    }

    /** État de la veille — alimente le bandeau compact de l'interface. */
    async status(): Promise<{
        lastRunAt: string | null
        isActive: boolean
        activeConceptCount: number
        publishedCount: number
    }> {
        const [source, activeConceptCount, publishedCount] = await Promise.all([
            prisma.legalWatchSource.findUnique({ where: { name: SOURCE_JUDILIBRE } }),
            prisma.legalConceptMapping.count({ where: { isActive: true } }),
            prisma.legalWatchItem.count({ where: { status: "PUBLISHED" } }),
        ])
        return {
            lastRunAt: source?.lastRunAt ? source.lastRunAt.toISOString() : null,
            isActive: source?.isActive ?? false,
            activeConceptCount,
            publishedCount,
        }
    }

    /** Configuration paramétrable : sources + thèmes juridiques surveillés. */
    async config(): Promise<{
        sources: Array<{ name: string; isActive: boolean; lastRunAt: string | null }>
        concepts: Array<{ concept: string; label: string; legalDomain: string; isActive: boolean }>
    }> {
        const [sources, concepts] = await Promise.all([
            prisma.legalWatchSource.findMany({ orderBy: { idSource: "asc" } }),
            prisma.legalConceptMapping.findMany({ orderBy: { label: "asc" } }),
        ])
        return {
            sources: sources.map((s) => ({
                name: s.name,
                isActive: s.isActive,
                lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
            })),
            concepts: concepts.map((c) => ({
                concept: c.concept,
                label: c.label,
                legalDomain: c.legalDomain,
                isActive: c.isActive,
            })),
        }
    }

    /** Active/désactive une source (ex. couper Judilibre). Renvoie false si absente. */
    async setSourceActive(name: string, isActive: boolean): Promise<boolean> {
        const { count } = await prisma.legalWatchSource.updateMany({ where: { name }, data: { isActive } })
        return count > 0
    }

    /** Active/désactive un thème juridique surveillé. Renvoie false si absent. */
    async setConceptActive(concept: string, isActive: boolean): Promise<boolean> {
        const { count } = await prisma.legalConceptMapping.updateMany({ where: { concept }, data: { isActive } })
        return count > 0
    }

    async digest(filters: {
        legalDomain?: string
        impactLevel?: "HAUT" | "MOYEN" | "FAIBLE"
        page?: number
        pageSize?: number
    }): Promise<{ items: DigestItemDTO[]; total: number; page: number; pageSize: number }> {
        const page = Math.max(1, filters.page ?? 1)
        const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20))
        const where = {
            status: "PUBLISHED" as const,
            ...(filters.legalDomain ? { legalDomain: filters.legalDomain } : {}),
            ...(filters.impactLevel ? { impactLevel: filters.impactLevel } : {}),
        }
        const [items, total] = await Promise.all([
            prisma.legalWatchItem.findMany({
                where,
                orderBy: [{ decisionDate: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.legalWatchItem.count({ where }),
        ])
        return { items: items.map((i) => this.toDigestDTO(i)), total, page, pageSize }
    }
}
