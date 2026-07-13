import express from "express"
import type { Request, Response, Router, NextFunction } from "express"
import { prisma } from "../../prisma/singletonPrisma.js"
import { authMiddleware } from "../middleware/authMiddleware.js"

const router: Router = express.Router()

const VALID_ROLES = new Set(["ADMIN", "JURISTE", "USER", "LECTEUR"])

/**
 * Réserve l'accès aux administrateurs.
 * Le rôle est vérifié EN BASE (et non depuis le token JWT) : un changement de
 * rôle prend effet immédiatement, sans attendre une reconnexion, et un token
 * périmé ne peut pas être utilisé pour une élévation de privilèges.
 */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await prisma.user.findUnique({
            where: { idUser: Number(req.idUser) },
            select: { role: true },
        })
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({ success: false, message: "Action réservée aux administrateurs." })
        }
        next()
    } catch (err) {
        console.error("[admin] requireAdmin error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
}

/** GET /admin/users — liste tous les utilisateurs (mono-entreprise). */
router.get("/users", authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: { idUser: true, email: true, nom: true, prenom: true, role: true, isVerified: true, isBanned: true },
            orderBy: { idUser: "asc" },
        })
        return res.json({ success: true, data: users })
    } catch (err) {
        console.error("[admin] list users error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

/** PATCH /admin/users/:idUser/role — change le rôle d'un utilisateur. */
router.patch("/users/:idUser/role", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
    try {
        const targetId = Number(req.params["idUser"])
        const { role } = req.body as { role?: string }
        if (!role || !VALID_ROLES.has(role)) {
            return res.status(400).json({ success: false, message: "Rôle invalide." })
        }
        // Garde-fou : un admin ne peut pas se rétrograder lui-même (évite de perdre le dernier admin).
        if (targetId === Number(req.idUser) && role !== "ADMIN") {
            return res.status(400).json({ success: false, message: "Vous ne pouvez pas modifier votre propre rôle d'administrateur." })
        }
        const target = await prisma.user.findUnique({ where: { idUser: targetId }, select: { idUser: true } })
        if (!target) return res.status(404).json({ success: false, message: "Utilisateur introuvable." })

        await prisma.user.update({ where: { idUser: targetId }, data: { role: role as "ADMIN" | "JURISTE" | "USER" | "LECTEUR" } })
        return res.json({ success: true })
    } catch (err) {
        console.error("[admin] update role error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

/** GET /admin/revenue — vue d'ensemble des revenus (abonnements + factures). */
router.get("/revenue", authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const subscriptions = await prisma.subscription.findMany({
            include: {
                user: { select: { idUser: true, email: true, nom: true, prenom: true } },
                plan: true,
                facture: { orderBy: { createdAt: "desc" } },
            },
            orderBy: { startAt: "desc" },
        })

        const totalRevenue = await prisma.facture.aggregate({ _sum: { price: true } })

        const activeCount = await prisma.subscription.count({ where: { status: "ACTIVE" } })

        // Revenus groupés par nom de plan
        const revenueByPlan: Record<string, { count: number; revenue: number }> = {}
        for (const sub of subscriptions) {
            const planName = sub.plan.name
            if (!revenueByPlan[planName]) revenueByPlan[planName] = { count: 0, revenue: 0 }
            if (sub.status === "ACTIVE") revenueByPlan[planName].count++
            revenueByPlan[planName].revenue += sub.facture.reduce((s, f) => s + f.price, 0)
        }

        // Dernières factures (30 dernières)
        const recentFactures = await prisma.facture.findMany({
            take: 30,
            orderBy: { createdAt: "desc" },
            include: {
                subscription: {
                    include: {
                        user: { select: { email: true, nom: true, prenom: true } },
                        plan: { select: { name: true } },
                    },
                },
            },
        })

        return res.json({
            success: true,
            data: {
                subscriptions,
                totalRevenue: Number(totalRevenue._sum.price ?? 0),
                activeCount,
                revenueByPlan,
                recentFactures,
            },
        })
    } catch (err) {
        console.error("[admin] revenue error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

/** PATCH /admin/users/:idUser/ban — bannit ou débannit un utilisateur. */
router.patch("/users/:idUser/ban", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
    try {
        const targetId = Number(req.params["idUser"])
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ success: false, message: "ID invalide." })
        }
        if (targetId === Number(req.idUser)) {
            return res.status(400).json({ success: false, message: "Vous ne pouvez pas vous bannir vous-même." })
        }
        const { banned } = req.body as { banned?: unknown }
        if (typeof banned !== "boolean") {
            return res.status(400).json({ success: false, message: "Le champ banned doit être un booléen." })
        }
        const target = await prisma.user.findUnique({ where: { idUser: targetId }, select: { idUser: true } })
        if (!target) return res.status(404).json({ success: false, message: "Utilisateur introuvable." })

        await prisma.user.update({ where: { idUser: targetId }, data: { isBanned: banned } })
        return res.json({ success: true, isBanned: banned })
    } catch (err) {
        console.error("[admin] ban user error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

/** GET /admin/feature-usage — statistiques d'usage des fonctionnalités par période. */
router.get("/feature-usage", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
    try {
        const days = Math.min(Math.max(Number(req.query["days"]) || 30, 1), 1825)
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        // 1. Résumé par feature
        const featureCounts = await prisma.featureUsage.groupBy({
            by: ["feature"],
            where: { createdAt: { gte: since } },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
        })
        const summary = featureCounts.map((f) => ({ feature: f.feature, count: f._count.id }))

        // 2. Timeline brute (agrégation JS par jour)
        const events = await prisma.featureUsage.findMany({
            where: { createdAt: { gte: since } },
            select: { feature: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        })
        const byDay: Record<string, Record<string, number>> = {}
        for (const e of events) {
            const day = e.createdAt.toISOString().slice(0, 10)
            if (!byDay[day]) byDay[day] = {}
            byDay[day][e.feature] = (byDay[day][e.feature] ?? 0) + 1
        }
        const timeline = Object.entries(byDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, counts]) => ({ date, ...counts }))

        // 3. Top 10 utilisateurs
        const userGroups = await prisma.featureUsage.groupBy({
            by: ["userId"],
            where: { createdAt: { gte: since }, userId: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
            take: 10,
        })
        const userIds = userGroups.map((g) => g.userId!).filter(Boolean)
        const [users, userFeatures] = await Promise.all([
            prisma.user.findMany({
                where: { idUser: { in: userIds } },
                select: { idUser: true, email: true, nom: true, prenom: true },
            }),
            userIds.length > 0
                ? prisma.featureUsage.groupBy({
                    by: ["userId", "feature"],
                    where: { createdAt: { gte: since }, userId: { in: userIds } },
                    _count: { id: true },
                })
                : Promise.resolve([]),
        ])
        const topUsers = userGroups.map((g) => {
            const user = users.find((u) => u.idUser === g.userId)
            const byFeature = (userFeatures as { userId: number | null; feature: string; _count: { id: number } }[])
                .filter((f) => f.userId === g.userId)
                .reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.feature]: f._count.id }), {})
            return {
                userId: g.userId!,
                email: user?.email ?? "?",
                nom: user?.nom ?? null,
                prenom: user?.prenom ?? null,
                total: g._count.id,
                byFeature,
            }
        })

        return res.json({ success: true, data: { summary, timeline, topUsers, days } })
    } catch (err) {
        console.error("[admin] feature-usage error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

/** GET /admin/users/:idUser/details — profil complet d'un utilisateur. */
router.get("/users/:idUser/details", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
    try {
        const targetId = Number(req.params["idUser"])
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ success: false, message: "ID invalide." })
        }
        const user = await prisma.user.findUnique({
            where: { idUser: targetId },
            select: {
                idUser: true,
                email: true,
                nom: true,
                prenom: true,
                role: true,
                isVerified: true,
                twoFactorEnabled: true,
                isBanned: true,
                subscription: {
                    select: {
                        status: true,
                        startAt: true,
                        expiresAt: true,
                        plan: { select: { name: true, price: true, interval: true, creditIncluded: true } },
                        facture: { select: { price: true } },
                    },
                },
                enterprise: {
                    select: {
                        name: true,
                        siren: true,
                        statusJuridique: true,
                        address: { select: { address: true, codePostal: true, pays: true } },
                    },
                },
                userCredit: { select: { creditIncluded: true, creditAdded: true } },
                _count: {
                    select: { contracts: true, signatureEnvelopes: true, contractHistory: true },
                },
            },
        })
        if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." })

        const totalPaid = user.subscription?.facture.reduce((s, f) => s + f.price, 0) ?? 0
        const invoiceCount = user.subscription?.facture.length ?? 0

        return res.json({
            success: true,
            data: {
                ...user,
                subscription: user.subscription
                    ? { ...user.subscription, totalPaid, invoiceCount, facture: undefined }
                    : null,
            },
        })
    } catch (err) {
        console.error("[admin] user details error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

/** GET /admin/overview — vue d'ensemble : utilisateurs actifs, conversion, alertes coût, crédits. */
router.get("/overview", authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const d1 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const [
            totalUsers,
            verifiedUsers,
            activeD1,
            activeD7,
            activeD30,
            activeSubs,
            todayCost,
            creditRows,
        ] = await Promise.all([
            // Counts utilisateurs
            prisma.user.count(),
            prisma.user.count({ where: { isVerified: true } }),

            // Utilisateurs actifs (FeatureUsage comme proxy)
            prisma.featureUsage.findMany({
                where: { createdAt: { gte: d1 }, userId: { not: null } },
                select: { userId: true },
                distinct: ["userId"],
            }).then((r) => r.length),
            prisma.featureUsage.findMany({
                where: { createdAt: { gte: d7 }, userId: { not: null } },
                select: { userId: true },
                distinct: ["userId"],
            }).then((r) => r.length),
            prisma.featureUsage.findMany({
                where: { createdAt: { gte: d30 }, userId: { not: null } },
                select: { userId: true },
                distinct: ["userId"],
            }).then((r) => r.length),

            // Abonnements actifs
            prisma.subscription.count({ where: { status: "ACTIVE" } }),

            // Coût LLM aujourd'hui
            prisma.llmUsage.aggregate({
                where: { startAt: { gte: startOfToday } },
                _sum: { totalCostUsd: true },
            }).then((r) => Number(r._sum.totalCostUsd ?? 0)),

            // Crédits restants par utilisateur (avec infos user + plan)
            prisma.userCredit.findMany({
                include: {
                    user: {
                        select: {
                            idUser: true,
                            email: true,
                            nom: true,
                            prenom: true,
                            subscription: {
                                select: { plan: { select: { creditIncluded: true } } },
                            },
                        },
                    },
                },
                orderBy: [{ creditIncluded: "asc" }, { creditAdded: "asc" }],
            }),
        ])

        const threshold = Number(process.env.COST_ALERT_USD ?? 2)

        const credits = creditRows.map((c) => ({
            userId: c.user.idUser,
            email: c.user.email,
            nom: c.user.nom,
            prenom: c.user.prenom,
            creditIncluded: c.creditIncluded,
            creditAdded: c.creditAdded,
            total: c.creditIncluded + c.creditAdded,
            planCredit: c.user.subscription?.plan.creditIncluded ?? 0,
        }))

        return res.json({
            success: true,
            data: {
                users: { total: totalUsers, verified: verifiedUsers, active: { d1: activeD1, d7: activeD7, d30: activeD30 } },
                conversion: { withActiveSub: activeSubs, total: totalUsers, rate: totalUsers > 0 ? Math.round((activeSubs / totalUsers) * 1000) / 10 : 0 },
                costAlert: { todayUsd: todayCost, threshold, exceeded: todayCost > threshold },
                credits,
            },
        })
    } catch (err) {
        console.error("[admin] overview error:", err)
        return res.status(500).json({ success: false, message: "Erreur serveur." })
    }
})

export default router
