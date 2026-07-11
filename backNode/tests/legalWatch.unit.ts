/**
 * Tests unitaires de la veille juridique (sans serveur, sans appel réseau).
 *
 * Couvre :
 *  - la déduplication par hash SHA-256 (déterminisme, sensibilité au contenu)
 *  - la fonction de matching par type de modèle (normalisation, patterns,
 *    résolution concepts → clés de modèles)
 *
 * Lancement : npm run test:legalwatch
 */
import "dotenv/config"
import assert from "assert"
import { sha256 } from "../src/services/legalWatch/classLegalWatch"
import {
    contractTypeMatchesKeys,
    normalizeContractType,
    resolveContractTypeKeys,
} from "../src/services/legalWatch/matching"

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
    try {
        await fn()
        passed++
        console.log(`  ✓ ${name}`)
    } catch (e) {
        console.error(`  ✗ ${name}`)
        console.error(`    ${(e as Error).message}`)
        process.exitCode = 1
    }
}

console.log("Tests unitaires veille juridique")

// ── Déduplication par hash ────────────────────────────────────────────────────

await check("sha256 : déterministe pour un même texte", () => {
    const text = "LA COUR DE CASSATION, CHAMBRE SOCIALE, a rendu l'arrêt suivant…"
    assert.equal(sha256(text), sha256(text))
})

await check("sha256 : sensible au moindre changement de contenu", () => {
    assert.notEqual(sha256("texte de la décision"), sha256("texte de la décision "))
})

await check("sha256 : format hex 64 caractères (colonne contentHash)", () => {
    assert.match(sha256("abc"), /^[0-9a-f]{64}$/)
})

await check("sha256 : stable sur les accents/unicode (utf8)", () => {
    assert.equal(
        sha256("délai de carence — indemnité"),
        sha256("délai de carence — indemnité"),
    )
})

// ── Normalisation ─────────────────────────────────────────────────────────────

await check("normalize : accents, casse et espaces multiples", () => {
    assert.equal(
        normalizeContractType("  CDD – Accroissement   Temporaire d'Activité "),
        "cdd – accroissement temporaire d'activite",
    )
})

// ── Matching par type de modèle ───────────────────────────────────────────────

await check("match : label complet du générateur CDD", () => {
    assert.ok(contractTypeMatchesKeys("CDD – Accroissement temporaire d'activité", ["cdd_accroissement"]))
})

await check("match : valeur libre « CDD » saisie à l'import", () => {
    assert.ok(contractTypeMatchesKeys("CDD", ["cdd_accroissement"]))
})

await check("match : « Contrat à durée déterminée » en toutes lettres", () => {
    assert.ok(contractTypeMatchesKeys("Contrat à durée déterminée", ["cdd_accroissement"]))
})

await check("non-match : NDA, Prestation de services, Bail commercial", () => {
    for (const type of ["NDA", "Prestation de services", "Bail commercial"]) {
        assert.ok(!contractTypeMatchesKeys(type, ["cdd_accroissement"]), `"${type}" ne doit pas matcher`)
    }
})

await check("non-match : « cddx » ne matche pas (frontière de mot)", () => {
    assert.ok(!contractTypeMatchesKeys("cddx", ["cdd_accroissement"]))
})

await check("non-match : contractType null ou clé inconnue", () => {
    assert.ok(!contractTypeMatchesKeys(null, ["cdd_accroissement"]))
    assert.ok(!contractTypeMatchesKeys("CDD", ["type_inconnu"]))
})

// ── Résolution concepts → clés de modèles ────────────────────────────────────

const MAPPINGS = [
    { concept: "delai_de_carence", contractTypes: ["cdd_accroissement"] },
    { concept: "requalification_cdi", contractTypes: ["cdd_accroissement"] },
    { concept: "clause_non_concurrence", contractTypes: ["cdi_standard"] },
]

await check("resolve : concepts détectés → clés dédupliquées", () => {
    const keys = resolveContractTypeKeys(["delai_de_carence", "requalification_cdi"], MAPPINGS)
    assert.deepEqual(keys, ["cdd_accroissement"])
})

await check("resolve : concept absent de la taxonomie → aucune clé", () => {
    assert.deepEqual(resolveContractTypeKeys(["concept_inconnu"], MAPPINGS), [])
})

await check("resolve : contractTypes non-tableau toléré (Json)", () => {
    const keys = resolveContractTypeKeys(
        ["delai_de_carence"],
        [{ concept: "delai_de_carence", contractTypes: "pas-un-tableau" }],
    )
    assert.deepEqual(keys, [])
})

console.log(`\n${passed} réussis${process.exitCode ? ", des échecs ci-dessus" : ", 0 échoué"}`)
process.exit(process.exitCode ?? 0)
