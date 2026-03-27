import { ClauseRecommendation } from '../../types';

export const TERMINATION_RECOMMENDATIONS: ClauseRecommendation[] = [
  {
    title: 'Clause de résiliation équitable et progressive',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "Chaque partie peut résilier le contrat moyennant un préavis écrit de 30 jours. En cas de manquement grave défini à l'annexe A, la résiliation peut intervenir après mise en demeure détaillée restée sans effet pendant 15 jours ouvrables.",
    benefits: 'Délais raisonnables, possibilité de correction, réciprocité des droits, définitions claires des manquements.',
    legalBasis: 'Art. 1604 C.c.Q. sur la résolution pour inexécution et obligation de bonne foi (art. 1375)',
    negotiationTips: [
      'Adaptez le délai de préavis à la complexité des prestations (15-60 jours)',
      'Créez une annexe définissant précisément les "manquements graves"',
      'Prévoyez des modalités de transition pour protéger les deux parties'
    ],
    fallbackOptions: [
      {
        title: 'Préavis graduel selon durée',
        description: '15 jours pour contrats < 1 an, 30 jours pour 1-3 ans, 60 jours pour > 3 ans'
      },
      {
        title: 'Résiliation pour convenance',
        description: 'Préavis de 90 jours sans motif, 30 jours avec motif légitime, sans pénalité'
      }
    ]
  },
  {
    title: 'Résiliation avec plan de transition obligatoire',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "Toute résiliation doit être accompagnée d'un plan de transition de 30 jours minimum incluant : transfert des dossiers, formation des équipes, restitution des accès et données. Les coûts de transition sont partagés équitablement.",
    benefits: 'Continuité des services, protection des intérêts des deux parties, transition professionnelle.',
    legalBasis: 'Principe de bonne foi dans l\'exécution et la fin des contrats',
    negotiationTips: [
      'Négociez des modèles de plan de transition standardisés',
      'Prévoyez des pénalités en cas de non-respect du plan',
      'Établissez des critères de validation de la transition'
    ]
  },
  {
    title: 'Résiliation avec clause de sauvegarde',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "En cas de résiliation pour manquement, la partie défaillante dispose d'un délai de grâce de 30 jours pour remédier au manquement après mise en demeure. Si le manquement est corrigé, le contrat se poursuit normalement.",
    benefits: 'Évite les résiliations abusives, encourage la correction des problèmes, maintient la relation contractuelle.',
    legalBasis: 'Principe de proportionnalité et de bonne foi contractuelle',
    negotiationTips: [
      'Définissez clairement les manquements "non remédiables"',
      'Prévoyez des pénalités réduites en cas de correction rapide',
      'Négociez des mécanismes de surveillance post-correction'
    ]
  }
];