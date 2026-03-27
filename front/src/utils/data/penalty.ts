import { ClauseRecommendation } from '../../types';

export const PENALTY_RECOMMENDATIONS: ClauseRecommendation[] = [
  {
    title: 'Clause pénale proportionnée et justifiée',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "En cas de résiliation anticipée sans motif valable, la partie défaillante versera une indemnité égale à 15% du montant restant à exécuter, correspondant aux frais administratifs, de restructuration et de recherche de remplacement documentés dans l'annexe tarifaire.",
    benefits: 'Montant raisonnable selon les standards canadiens, justification économique détaillée, respect de la jurisprudence sur les clauses pénales.',
    legalBasis: 'Art. 1623 C.c.Q. - Les tribunaux peuvent réduire les pénalités excessives (jurisprudence constante)',
    negotiationTips: [
      'Documentez précisément les coûts réels justifiant le pourcentage choisi',
      'Proposez une échelle dégressive selon la durée restante du contrat',
      'Négociez des exceptions claires pour cas de force majeure'
    ],
    fallbackOptions: [
      {
        title: 'Indemnité forfaitaire plafonnée',
        description: 'Montant fixe de 2-3 mois de prestations, plus prévisible et facile à budgétiser'
      },
      {
        title: 'Échelle progressive temporelle',
        description: '25% la 1ère année, 15% la 2ème année, 10% la 3ème année et suivantes'
      }
    ]
  },
  {
    title: 'Indemnité basée sur les coûts réels',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "L'indemnité de résiliation correspond aux coûts réels et documentés engagés par la partie non-défaillante : frais de recrutement, formation, restructuration, dans la limite de 10% du montant total du contrat.",
    benefits: 'Approche équitable basée sur les coûts réels, plafond protecteur, transparence financière.',
    legalBasis: 'Principe de réparation intégrale sans enrichissement injustifié',
    negotiationTips: [
      'Négociez des modalités de justification des coûts (factures, devis)',
      'Prévoyez un délai de présentation des justificatifs (30-60 jours)',
      'Établissez une procédure de contestation des coûts'
    ]
  }
];

export const PENALTY_EMERGENCY = (percentage: number): ClauseRecommendation => ({
  title: `🚨 URGENCE - Pénalité excessive de ${percentage}% détectée`,
  riskReduction: 'Risque critique réduit à 2/5',
  clauseText: `CLAUSE D'URGENCE : L'indemnité de résiliation est plafonnée à 20% du montant restant du contrat (au lieu de ${percentage}%), correspondant aux coûts réels de restructuration. Tout montant supérieur nécessite une justification détaillée et documentée des préjudices subis.`,
  benefits: `Réduit drastiquement la pénalité de ${percentage}% à 20%, conforme aux standards canadiens, maintient une compensation équitable.`,
  legalBasis: 'Art. 1623 C.c.Q. - Pouvoir du tribunal de réduire les pénalités excessives',
  negotiationTips: [
    'Présentez les statistiques judiciaires sur les réductions de pénalités',
    'Proposez une médiation pour évaluer les coûts réels',
    'Négociez une clause d\'indexation plutôt qu\'un pourcentage fixe'
  ],
  fallbackOptions: [
    {
      title: 'Compromis à 25%',
      description: `Réduction progressive de ${percentage}% à 25% avec justification des coûts`
    },
    {
      title: 'Plafond absolu',
      description: 'Montant maximum équivalent à 6 mois de prestations'
    }
  ]
});