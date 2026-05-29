/**
 * Convertit une date ISO 8601 en libellé long au format français.
 *
 * @example
 * ```ts
 * formatDate("2025-05-29") // → "29 mai 2025"
 * formatDate("2025-01-01") // → "1 janvier 2025"
 * ```
 *
 * @param iso Chaîne de date parsable par `new Date()` (ISO 8601, ex : `"2025-05-29"` ou `"2025-05-29T10:30:00Z"`).
 * @returns   Libellé localisé en français, ex : `"29 mai 2025"`.
 */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
