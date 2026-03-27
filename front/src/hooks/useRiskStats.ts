/* hooks/useRiskStats.ts
 * Hook pour le calcul des statistiques de risque
 * Extrait la logique de calcul complexe de App.tsx
 */

import { useMemo } from 'react';
import { ContractAnalysis, RiskStats, ClauseRisk } from '../types';

interface UseRiskStatsReturn {
  riskStats: RiskStats;
  clausesForStats: ClauseRisk[];
  sortedClauses: ClauseRisk[];
}

// Fonction pour obtenir le niveau de risque
export const getRiskLevel = (riskScore: number): 'critical' | 'medium' | 'low' => {
  if (riskScore === 5) return 'critical';
  if (riskScore >= 3) return 'medium';
  return 'low';
};

// Fonction pour trier les clauses par niveau de risque (critique en premier)
export const sortClausesByRisk = (clauses: ClauseRisk[]): ClauseRisk[] => {
  return [...clauses].sort((a, b) => {
    // Tri par riskScore décroissant (5 = critique en premier)
    if (b.riskScore !== a.riskScore) {
      return b.riskScore - a.riskScore;
    }
    // Si même score, tri alphabétique par type
    return a.type.localeCompare(b.type);
  });
};

export const useRiskStats = (contract: ContractAnalysis | null): UseRiskStatsReturn => {
  const clausesForStats = useMemo(() => {
    if (!contract) return [];
    console.log('📊 Utilisation directe des clauses du contrat pour les statistiques');
    return contract.clauses;
  }, [contract]);

  // Clauses triées par niveau de risque
  const sortedClauses = useMemo(() => {
    return sortClausesByRisk(clausesForStats);
  }, [clausesForStats]);

  const riskStats: RiskStats = useMemo(() => {
    if (!contract) {
      return {
        totalClauses: 0,
        criticalRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        criticalIssues: 0,
        byCategory: [],
        complianceScore: 0,
      };
    }

    const categoryStats = [
      {
        category: 'Responsabilité',
        categoryKey: 'responsibility',
        averageRisk: 4.0,
      },
      {
        category: 'Résiliation',
        categoryKey: 'termination',
        averageRisk: 3.0,
      },
      {
        category: 'Confidentialité',
        categoryKey: 'confidentiality',
        averageRisk: 2.0,
      },
      {
        category: 'Pénalités',
        categoryKey: 'penalty',
        averageRisk: 3.5,
      },
      {
        category: 'Non-concurrence',
        categoryKey: 'nonCompete',
        averageRisk: 4.5,
      },
    ].map(({ category, categoryKey, averageRisk }) => ({
      category,
      count: clausesForStats.filter((c: any) => c.category === categoryKey).length,
      averageRisk,
      criticalCount: clausesForStats.filter((c: any) => c.category === categoryKey && c.riskScore === 5).length,
    })).filter((cat) => cat.count > 0);

    return {
      totalClauses: clausesForStats.length,
      criticalRisk: clausesForStats.filter((c: any) => c.riskScore === 5).length,
      mediumRisk: clausesForStats.filter((c: any) => c.riskScore >= 3 && c.riskScore < 5).length,
      lowRisk: clausesForStats.filter((c: any) => c.riskScore < 3).length,
      criticalIssues: clausesForStats.filter((c: any) => c.riskScore === 5).length,
      byCategory: categoryStats,
      complianceScore: Math.max(20, 95 - contract.overallRiskScore * 15),
    };
  }, [contract, clausesForStats]);

  return {
    riskStats,
    clausesForStats,
    sortedClauses,
  };
};
