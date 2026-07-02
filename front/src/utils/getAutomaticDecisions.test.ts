import { describe, expect, it } from "vitest";
import {
  buildJurisprudenceQueries,
  buildJurisprudenceContext,
} from "./getAutomaticDecisions";
import type { ClauseRisk } from "../types";

function clause(overrides: Partial<ClauseRisk> = {}): ClauseRisk {
  return {
    id: "c1",
    type: "Résiliation",
    content: "Le bailleur peut résilier le contrat sans préavis ni indemnité.",
    riskScore: 4,
    justification:
      "L'absence de préavis crée un déséquilibre significatif au détriment du preneur.",
    suggestion: "",
    category: "termination",
    keywords: ["préavis", "indemnité", "déséquilibre"],
    ...overrides,
  };
}

describe("buildJurisprudenceQueries", () => {
  it("construit jusqu'à 3 requêtes complémentaires", () => {
    const qs = buildJurisprudenceQueries(clause());
    expect(qs.length).toBeGreaterThanOrEqual(2);
    expect(qs.length).toBeLessThanOrEqual(3);
    // 1. type + mots-clés
    expect(qs[0]).toBe("Résiliation préavis indemnité");
    // 3. type + termes significatifs de la justification
    expect(qs[qs.length - 1]).toContain("Résiliation");
    expect(qs[qs.length - 1]).toContain("préavis");
  });

  it("fonctionne sans mots-clés (requête depuis la justification)", () => {
    const qs = buildJurisprudenceQueries(clause({ keywords: [] }));
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.some((q) => q.includes("déséquilibre"))).toBe(true);
  });

  it("écarte les mots vides et les doublons", () => {
    const qs = buildJurisprudenceQueries(
      clause({ justification: "Le la les de des un une pour clause contrat" }),
    );
    for (const q of qs) {
      expect(q).not.toMatch(/\bles?\b/);
    }
    expect(new Set(qs).size).toBe(qs.length);
  });
});

describe("buildJurisprudenceContext", () => {
  it("assemble type, problème, références et clause", () => {
    const ctx = buildJurisprudenceContext(
      clause({ legalReference: ["L1231-1", "1171 C. civ."] }),
    );
    expect(ctx).toContain("Type de clause : Résiliation.");
    expect(ctx).toContain("Problème juridique identifié");
    expect(ctx).toContain("L1231-1, 1171 C. civ.");
    expect(ctx).toContain("Le bailleur peut résilier");
  });

  it("tronque la clause à 800 caractères", () => {
    const ctx = buildJurisprudenceContext(clause({ content: "x".repeat(2000) }));
    expect(ctx.length).toBeLessThan(1200);
  });
});
