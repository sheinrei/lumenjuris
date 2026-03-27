import { ClauseRecommendation } from '../../types';

export const DEFAULT_RECOMMENDATIONS: ClauseRecommendation[] = [
  {
    title: 'Clause équilibrée recommandée',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "Cette clause doit être révisée pour assurer un équilibre entre les droits et obligations des parties, en conformité avec les principes du droit contractuel canadien et les bonnes pratiques de votre secteur d'activité.",
    benefits: 'Équilibre contractuel, réduction du risque de litige, conformité légale, protection mutuelle des intérêts.',
    legalBasis: 'Principes généraux du droit contractuel canadien et québécois',
    negotiationTips: [
      'Analysez les clauses similaires dans votre secteur d\'activité',
      'Consultez un avocat spécialisé pour les clauses complexes ou atypiques',
      'Négociez des clauses de révision périodique pour adaptation'
    ],
    fallbackOptions: [
      {
        title: 'Clause standard sectorielle',
        description: 'Utiliser les modèles reconnus de votre association professionnelle ou chambre de commerce'
      },
      {
        title: 'Médiation préalable obligatoire',
        description: 'Ajouter une clause de médiation obligatoire avant tout recours judiciaire'
      }
    ]
  },
  {
    title: 'Clause de sauvegarde générale',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "En cas d'ambiguïté ou de conflit d'interprétation, les parties privilégient une résolution amiable par médiation. Toute clause jugée abusive ou contraire à l'ordre public est réputée non écrite sans affecter la validité du reste du contrat.",
    benefits: 'Protection contre les clauses abusives, mécanisme de résolution des conflits, préservation du contrat.',
    legalBasis: 'Art. 1437 C.c.Q. sur les clauses abusives et principe de conservation des contrats',
    negotiationTips: [
      'Négociez des mécanismes de révision en cas de changement législatif',
      'Prévoyez des clauses de hardship pour les changements de circonstances',
      'Établissez des procédures de notification et de consultation'
    ]
  },
  {
    title: 'Clause d\'adaptation et de révision',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "Les parties conviennent de réviser annuellement les termes du contrat pour s'assurer de leur adéquation avec l'évolution des besoins, de la réglementation et des pratiques du secteur. Toute modification doit faire l'objet d'un avenant écrit signé par les deux parties.",
    benefits: 'Adaptation continue, prévention des conflits, évolution avec les besoins, formalisme protecteur.',
    legalBasis: 'Principe d\'exécution de bonne foi et d\'adaptation des contrats',
    negotiationTips: [
      'Négociez des critères objectifs de révision (indices, benchmarks)',
      'Prévoyez des mécanismes de résolution en cas de désaccord sur les modifications',
      'Établissez un calendrier de révision adapté à la durée du contrat'
    ]
  }
];