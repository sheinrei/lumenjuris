import { describe, expect, it } from "vitest";
import { cleanEnumArtifacts } from "./cleanAiText";

describe("cleanEnumArtifacts", () => {
  it("convertit les énumérations parenthésées (i)/(ii)/(iii) en 1. 2. 3.", () => {
    expect(
      cleanEnumArtifacts("Le bailleur doit (i) notifier le preneur, (ii) motiver sa décision et (iii) respecter le préavis."),
    ).toBe("Le bailleur doit 1. notifier le preneur, 2. motiver sa décision et 3. respecter le préavis.");
  });

  it("convertit les énumérations romaines en début de ligne", () => {
    expect(cleanEnumArtifacts("i. Premier point\nii. Deuxième point\niii. Troisième point")).toBe(
      "1. Premier point\n2. Deuxième point\n3. Troisième point",
    );
  });

  it("ne touche pas aux chiffres romains employés comme mots", () => {
    const s = "Conformément au Livre III du Code civil et à l'article 1240.";
    expect(cleanEnumArtifacts(s)).toBe(s);
  });

  it("gère (iv), (v) et au-delà", () => {
    expect(cleanEnumArtifacts("(iv) quatrième et (v) cinquième")).toBe("4. quatrième et 5. cinquième");
  });

  it("laisse intact un texte sans énumération", () => {
    const s = "Clause de résiliation avec préavis de trois mois.";
    expect(cleanEnumArtifacts(s)).toBe(s);
  });

  it("tolère les chaînes vides", () => {
    expect(cleanEnumArtifacts("")).toBe("");
  });
});
