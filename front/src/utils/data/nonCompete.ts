import { ClauseRecommendation } from '../../types';

export const NON_COMPETE_RECOMMENDATIONS: ClauseRecommendation[] = [
  {
    title: 'Non-concurrence limitée et compensée',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: 'Pendant 12 mois après la fin du contrat, moyennant une compensation mensuelle de X$, le client s\'interdit de solliciter directement les employés clés listés en annexe ayant participé au projet, dans un rayon de 50 km du lieu principal d\'exécution.',
    benefits: 'Durée conforme aux standards canadiens, compensation équitable, portée géographique justifiée, liste précise des personnes concernées.',
    legalBasis: 'Art. 2089 C.c.Q. - Respect des critères de validité (durée, territoire, activité raisonnables)',
    negotiationTips: [
      'Justifiez la durée par le temps nécessaire pour former des remplaçants qualifiés',
      'Limitez géographiquement à votre zone d\'activité commerciale réelle',
      'Négociez une compensation financière pour rendre la clause plus acceptable'
    ],
    fallbackOptions: [
      {
        title: 'Non-sollicitation simple',
        description: 'Interdiction de solliciter activement sans interdire la concurrence générale'
      },
      {
        title: 'Clause dégressive',
        description: 'Restriction de 18 mois avec compensation décroissante : 100%, 75%, 50%'
      }
    ]
  },
  {
    title: 'Non-sollicitation réciproque ciblée',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "Les parties s'interdisent mutuellement, pendant 18 mois, de solliciter ou d'embaucher les employés de l'autre partie ayant eu accès aux informations confidentielles du projet, sauf candidature spontanée documentée.",
    benefits: 'Réciprocité parfaite, durée modérée, lien logique avec la protection des informations, exception pour candidatures spontanées.',
    legalBasis: 'Principe d\'équité contractuelle et protection des investissements en formation',
    negotiationTips: [
      'Négociez une liste précise et mise à jour des employés concernés',
      'Prévoyez des exceptions pour les licenciements économiques',
      'Établissez des procédures claires pour les candidatures spontanées'
    ]
  }
];

export const NON_COMPETE_EMERGENCY = (years: number): ClauseRecommendation => ({
  title: `🚨 URGENCE - Restriction de ${years} an(s) excessive`,
  riskReduction: 'Risque critique réduit à 2/5',
  clauseText: `CLAUSE D'URGENCE : La restriction de non-concurrence est limitée à 12 mois maximum (au lieu de ${years} an(s)), dans un rayon géographique de 25 km, et uniquement pour les activités directement concurrentes. Une compensation financière équitable doit être prévue.`,
  benefits: `Réduit la durée excessive de ${years} an(s) à 12 mois conformément aux standards canadiens, ajoute une compensation équitable.`,
  legalBasis: 'Art. 2089 C.c.Q. - Test de raisonnabilité strict pour les clauses de non-concurrence',
  negotiationTips: [
    'Citez la jurisprudence canadienne sur les limites de 12 mois',
    'Proposez une compensation financière pour faciliter l\'acceptation',
    'Négociez une définition précise des "activités directement concurrentes"'
  ],
  fallbackOptions: [
    {
      title: 'Non-sollicitation uniquement',
      description: 'Remplacer par une simple interdiction de sollicitation des employés'
    },
    {
      title: 'Clause dégressive',
      description: `Réduction progressive de ${years} an(s) à 6 mois avec compensation`
    }
  ]
});