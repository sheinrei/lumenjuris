/**
 * Nettoyage des artefacts d'énumération produits par les modèles IA dans les
 * textes juridiques : « (i) », « (ii) », « (iii) », « iii. », etc. Ces marqueurs
 * donnent l'impression d'un dysfonctionnement à l'écran — on les convertit en
 * numérotation arabe lisible (1., 2., 3.) sans toucher au reste du texte.
 */

const ROMAN_TO_INT: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
};

/** Convertit un petit chiffre romain (i–x, casse indifférente) en entier, sinon null. */
function romanToInt(s: string): number | null {
  return ROMAN_TO_INT[s.toLowerCase()] ?? null;
}

/**
 * Remplace les énumérations romaines par une numérotation arabe :
 *  - « (i) », « (ii) », « (iii) »            → « 1. », « 2. », « 3. »
 *  - « i. », « ii. », « iii. » en début de ligne → « 1. », « 2. », « 3. »
 * Les chiffres romains employés comme mots (ex. « Chapitre II du Code ») ne
 * sont pas touchés : seule la forme parenthésée ou en tête de ligne l'est.
 */
export function cleanEnumArtifacts(text: string): string {
  if (!text) return text;
  return text
    // (i) / (ii) / (iii)… n'importe où dans le texte
    .replace(/\((i{1,3}|iv|vi{0,3}|ix|x)\)\s*/gi, (m, roman: string) => {
      const n = romanToInt(roman);
      return n === null ? m : `${n}. `;
    })
    // i. / ii. / iii.… uniquement en début de ligne (énumération verticale)
    .replace(/^(\s*)(i{1,3}|iv|vi{0,3}|ix|x)\.\s+/gim, (m, indent: string, roman: string) => {
      const n = romanToInt(roman);
      return n === null ? m : `${indent}${n}. `;
    });
}
