import type { NextFunction, Request, Response, Router } from "express"
import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { LegalWatchService } from "../services/legalWatch/classLegalWatch.js"

/**
 * Routes de la veille juridique.
 *
 * Jobs du pipeline (ingest / enrich / publish / run) : réservés aux rôles
 * ADMIN et JURISTE, ou à un appel interne (cron) porteur du header
 * `x-internal-api-key`.
 *
 * Consultation (alerts / digest / unread-count) : tout utilisateur authentifié.
 */

const routerLegalWatch: Router = express.Router()
const svc = new LegalWatchService()

/** Garde des jobs : rôle éditeur OU clé interne (cron). */
function jobGuard(req: Request, res: Response, next: NextFunction) {
    const internalKey = req.headers["x-internal-api-key"] as string | undefined
    if (process.env.INTERNAL_API_KEY && internalKey === process.env.INTERNAL_API_KEY) {
        req.idUser = req.idUser ?? "0"
        return next()
    }
    return authMiddleware(req, res, () => {
        if (req.role !== "ADMIN" && req.role !== "JURISTE") {
            return res.status(403).json({ success: false, message: "Action réservée aux éditeurs." })
        }
        return next()
    })
}

// ── Jobs du pipeline ─────────────────────────────────────────────────────────

routerLegalWatch.post("/ingest", jobGuard, async (_req: Request, res: Response) => {
    try {
        const report = await svc.runIngest()
        return res.json({ success: true, data: report })
    } catch (err) {
        console.error("[legal-watch] ingest error:", err)
        return res.status(502).json({ success: false, message: "Ingestion Judilibre en échec." })
    }
})

routerLegalWatch.post("/enrich", jobGuard, async (req: Request, res: Response) => {
    try {
        const batchSize = req.body?.batchSize ? Number(req.body.batchSize) : undefined
        const report = await svc.runEnrich(batchSize)
        return res.json({ success: true, data: report })
    } catch (err) {
        console.error("[legal-watch] enrich error:", err)
        return res.status(502).json({ success: false, message: "Enrichissement LLM en échec." })
    }
})

routerLegalWatch.post("/publish", jobGuard, async (_req: Request, res: Response) => {
    try {
        const report = await svc.runPublish()
        return res.json({ success: true, data: report })
    } catch (err) {
        console.error("[legal-watch] publish error:", err)
        return res.status(500).json({ success: false, message: "Publication des alertes en échec." })
    }
})

/** Enchaîne ingest → enrich → publish (cron quotidien ou déclenchement manuel). */
routerLegalWatch.post("/run", jobGuard, async (_req: Request, res: Response) => {
    try {
        const ingest = await svc.runIngest()
        const enrich = await svc.runEnrich()
        const publish = await svc.runPublish()
        return res.json({ success: true, data: { ingest, enrich, publish } })
    } catch (err) {
        console.error("[legal-watch] run error:", err)
        return res.status(502).json({ success: false, message: "Pipeline de veille en échec." })
    }
})

// ── Consultation ─────────────────────────────────────────────────────────────

routerLegalWatch.get("/alerts", authMiddleware, async (req: Request, res: Response) => {
    try {
        const rawStatus = (req.query.status as string | undefined)?.toUpperCase()
        const status = rawStatus === "UNREAD" || rawStatus === "READ" || rawStatus === "DISMISSED"
            ? rawStatus
            : undefined
        const data = await svc.listAlerts(Number(req.idUser), status)
        return res.json({ success: true, data })
    } catch (err) {
        console.error("[legal-watch] alerts error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

routerLegalWatch.patch("/alerts/:externalId", authMiddleware, async (req: Request, res: Response) => {
    try {
        const status = (req.body?.status as string | undefined)?.toUpperCase()
        if (status !== "UNREAD" && status !== "READ" && status !== "DISMISSED") {
            return res.status(400).json({ success: false, message: "status invalide (unread|read|dismissed)." })
        }
        const ok = await svc.updateAlertStatus(
            Number(req.idUser),
            String(req.params.externalId),
            status,
        )
        if (!ok) {
            return res.status(404).json({ success: false, message: "Alerte introuvable." })
        }
        return res.json({ success: true })
    } catch (err) {
        console.error("[legal-watch] alert patch error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

routerLegalWatch.get("/digest", authMiddleware, async (req: Request, res: Response) => {
    try {
        const rawImpact = (req.query.impactLevel as string | undefined)?.toUpperCase()
        const impactLevel = rawImpact === "HAUT" || rawImpact === "MOYEN" || rawImpact === "FAIBLE"
            ? rawImpact
            : undefined
        const data = await svc.digest({
            legalDomain: req.query.legalDomain as string | undefined,
            impactLevel,
            page: req.query.page ? Number(req.query.page) : undefined,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        })
        return res.json({ success: true, data })
    } catch (err) {
        console.error("[legal-watch] digest error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

routerLegalWatch.get("/status", authMiddleware, async (_req: Request, res: Response) => {
    try {
        const data = await svc.status()
        return res.json({ success: true, data })
    } catch (err) {
        console.error("[legal-watch] status error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

// ── Configuration : sources + thèmes surveillés ──────────────────────────────

routerLegalWatch.get("/config", authMiddleware, async (_req: Request, res: Response) => {
    try {
        const data = await svc.config()
        return res.json({ success: true, data })
    } catch (err) {
        console.error("[legal-watch] config error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

routerLegalWatch.patch("/sources/:name", jobGuard, async (req: Request, res: Response) => {
    try {
        if (typeof req.body?.isActive !== "boolean") {
            return res.status(400).json({ success: false, message: "isActive (booléen) requis." })
        }
        const ok = await svc.setSourceActive(String(req.params.name), req.body.isActive)
        if (!ok) return res.status(404).json({ success: false, message: "Source introuvable." })
        return res.json({ success: true })
    } catch (err) {
        console.error("[legal-watch] source patch error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

routerLegalWatch.patch("/concepts/:concept", jobGuard, async (req: Request, res: Response) => {
    try {
        if (typeof req.body?.isActive !== "boolean") {
            return res.status(400).json({ success: false, message: "isActive (booléen) requis." })
        }
        const ok = await svc.setConceptActive(String(req.params.concept), req.body.isActive)
        if (!ok) return res.status(404).json({ success: false, message: "Thème introuvable." })
        return res.json({ success: true })
    } catch (err) {
        console.error("[legal-watch] concept patch error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

routerLegalWatch.get("/unread-count", authMiddleware, async (req: Request, res: Response) => {
    try {
        const count = await svc.unreadCount(Number(req.idUser))
        return res.json({ success: true, data: { count } })
    } catch (err) {
        console.error("[legal-watch] unread-count error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

export default routerLegalWatch
