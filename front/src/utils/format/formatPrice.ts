/**
 * Formate un montant exprimé en **centimes** en chaîne monétaire euros
 * au format français (séparateur de milliers espace, virgule décimale, symbole `€`).
 *
 * Le montant est divisé par 100 avant formatage — les valeurs passées à cette
 * fonction doivent donc toujours être en centimes, conformément à la convention
 * Stripe utilisée dans l'application.
 *
 * @example
 * ```ts
 * formatPrice(2900)  // → "29,00 €"
 * formatPrice(500)   // → "5,00 €"
 * formatPrice(19900) // → "199,00 €"
 * ```
 *
 * @param cents Montant en centimes d'euro (entier). Ex : `2900` pour 29,00 €.
 * @returns     Chaîne formatée, ex : `"29,00 €"`.
 */
export function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
