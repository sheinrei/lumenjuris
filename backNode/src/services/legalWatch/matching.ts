import { prisma } from "../../../prisma/singletonPrisma"

/**
 * Matching veille juridique — phase 1 : par TYPE DE MODÈLE.
 *
 * La taxonomie (LegalConceptMapping.contractTypes) référence des CLÉS de
 * modèles du moteur de génération (ex. "cdd_accroissement"). Les contrats de
 * la contrathèque portent un contractType en texte libre (ex. le label
 * "CDD – Accroissement temporaire d'activité" écrit par SmartCddEditor, ou
 * une valeur saisie à l'import). CONTRACT_TYPE_PATTERNS fait le pont.
 *
 * Phase 2 (matching par clause) : remplacer `matchContractsForItem` par une
 * implémentation analysant les clauses — la signature (item → Map userId →
 * contrats) est le seul contrat avec le reste du pipeline.
 */

/** Clé de modèle → motifs reconnus dans Contract.contractType (normalisé). */
export const CONTRACT_TYPE_PATTERNS: Record<string, RegExp[]> = {
    cdd_accroissement: [
        /\bcdd\b/,
        /contrat\s+a\s+duree\s+determinee/,
        /accroissement\s+temporaire/,
    ],
}

/** Normalise pour comparaison : minuscules, sans accents, espaces réduits. */
export function normalizeContractType(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
}

/** Un contractType (texte libre) correspond-il à l'une des clés de modèle ? */
export function contractTypeMatchesKeys(contractType: string | null | undefined, keys: string[]): boolean {
    if (!contractType) return false
    const normalized = normalizeContractType(contractType)
    return keys.some((key) =>
        (CONTRACT_TYPE_PATTERNS[key] ?? []).some((pattern) => pattern.test(normalized)),
    )
}

/** Résout les concepts détectés sur un item → clés de modèles concernées. */
export function resolveContractTypeKeys(
    itemConcepts: string[],
    mappings: Array<{ concept: string; contractTypes: unknown }>,
): string[] {
    const keys = new Set<string>()
    for (const mapping of mappings) {
        if (!itemConcepts.includes(mapping.concept)) continue
        const types = Array.isArray(mapping.contractTypes) ? mapping.contractTypes : []
        for (const t of types) {
            if (typeof t === "string") keys.add(t)
        }
    }
    return [...keys]
}

/** Statuts considérés comme "contrat vivant" pour le déclenchement d'alertes. */
const ALERTABLE_STATUSES = ["ACTIVE", "TACIT_RENEWAL", "IN_NEGOTIATION", "DRAFT"] as const

export interface MatchedContract {
    externalId: string
    title: string
    contractType: string | null
}

/**
 * Pour un item enrichi, renvoie les contrats concernés groupés par userId.
 * Phase 1 : correspondance grossière par type de modèle (voir en-tête).
 */
export async function matchContractsForItem(
    item: { concepts: unknown },
    mappings: Array<{ concept: string; contractTypes: unknown }>,
): Promise<Map<number, MatchedContract[]>> {
    const itemConcepts = Array.isArray(item.concepts)
        ? item.concepts.filter((c): c is string => typeof c === "string")
        : []
    const keys = resolveContractTypeKeys(itemConcepts, mappings)
    const byUser = new Map<number, MatchedContract[]>()
    if (keys.length === 0) return byUser

    // Filtre grossier en base (candidats non archivés, statut vivant), puis
    // matching précis en mémoire via les patterns.
    const candidates = await prisma.contract.findMany({
        where: {
            isArchived: false,
            status: { in: [...ALERTABLE_STATUSES] },
            contractType: { not: null },
        },
        select: { userId: true, externalId: true, title: true, contractType: true },
    })

    for (const contract of candidates) {
        if (!contractTypeMatchesKeys(contract.contractType, keys)) continue
        const list = byUser.get(contract.userId) ?? []
        list.push({
            externalId: contract.externalId,
            title: contract.title,
            contractType: contract.contractType,
        })
        byUser.set(contract.userId, list)
    }
    return byUser
}
