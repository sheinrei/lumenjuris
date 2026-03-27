import { ClauseRecommendation } from '../../types';

export const WARRANTY_RECOMMENDATIONS: ClauseRecommendation[] = [
  {
    title: 'Garanties équilibrées avec recours graduels',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "Le prestataire garantit la conformité des services pendant 12 mois. En cas de défaut : (i) correction gratuite sous 15 jours, (ii) si échec, réduction de prix proportionnelle, (iii) en dernier recours, résiliation partielle avec remboursement.",
    benefits: 'Garantie raisonnable, recours graduels permettant la correction, protection financière du client.',
    legalBasis: 'Art. 1726 et suivants C.c.Q. sur les garanties contractuelles',
    negotiationTips: [
      'Adaptez la durée de garantie à la nature des prestations',
      'Négociez des délais de correction réalistes',
      'Prévoyez des mécanismes de validation de la correction'
    ],
    fallbackOptions: [
      {
        title: 'Garantie limitée dans le temps',
        description: 'Garantie de 6 mois avec possibilité d\'extension moyennant supplément'
      },
      {
        title: 'Garantie par composants',
        description: 'Garanties différenciées selon les éléments : 24 mois pour matériel, 12 mois pour logiciel'
      }
    ]
  },
  {
    title: 'Garantie avec mécanisme de service',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "Garantie de 18 mois incluant : maintenance corrective gratuite, support technique 5j/7, temps de réponse garanti (4h pour critique, 24h pour majeur, 72h pour mineur), et remplacement sous 48h en cas de défaillance matérielle.",
    benefits: 'Service complet, temps de réponse garantis, couverture étendue, engagement de résultat.',
    legalBasis: 'Obligation de résultat et garantie de bon fonctionnement',
    negotiationTips: [
      'Négociez des niveaux de service adaptés à vos besoins critiques',
      'Prévoyez des pénalités en cas de non-respect des délais',
      'Établissez des procédures d\'escalade claire'
    ]
  },
  {
    title: 'Garantie réciproque et équilibrée',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "Les parties se garantissent mutuellement : (i) conformité aux spécifications, (ii) respect des délais convenus, (iii) qualité professionnelle des prestations. En cas de manquement, correction sous 10 jours ou compensation financière équitable.",
    benefits: 'Garanties réciproques, obligations équilibrées, mécanismes de compensation clairs.',
    legalBasis: 'Principe d\'équité contractuelle et d\'exécution de bonne foi',
    negotiationTips: [
      'Définissez précisément les critères de "qualité professionnelle"',
      'Négociez des mécanismes d\'évaluation objective',
      'Prévoyez des procédures de médiation en cas de désaccord'
    ]
  }
];