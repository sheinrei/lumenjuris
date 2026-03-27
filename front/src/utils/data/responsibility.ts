import { ClauseRecommendation } from '../../types';

export const RESPONSIBILITY_RECOMMENDATIONS: ClauseRecommendation[] = [
  {
    title: 'Clause de responsabilité équilibrée',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "Chaque partie limite sa responsabilité aux dommages directs prévisibles dans la limite du montant du contrat, à l'exception des cas de faute lourde, intentionnelle ou de violation des obligations essentielles du présent contrat.",
    benefits: 'Équilibre les responsabilités, protège contre les fautes graves, limite l\'exposition financière tout en maintenant une protection contre les manquements critiques.',
    legalBasis: 'Art. 1474 C.c.Q. – Conforme à la jurisprudence Tercon c. Colombie-Britannique (2010 SCC 4)',
    negotiationTips: [
      'Proposez une limitation réciproque pour faciliter l\'acceptation',
      'Justifiez les exceptions par la protection des intérêts essentiels',
      'Suggérez un plafond basé sur la valeur du contrat ou les primes d\'assurance RC'
    ],
    fallbackOptions: [
      {
        title: 'Option modérée',
        description: 'Limitation à 2× le montant du contrat avec exceptions pour faute intentionnelle uniquement'
      },
      {
        title: 'Option conservative',
        description: 'Limitation aux seuls dommages directs, sans plafond monétaire mais avec exceptions claires'
      }
    ]
  },
  {
    title: 'Clause avec exceptions spécifiques sectorielles',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "La responsabilité du prestataire est limitée aux dommages directs, excluant les dommages indirects sauf en cas de : (i) violation des obligations de confidentialité, (ii) atteinte aux droits de propriété intellectuelle, (iii) faute intentionnelle ou négligence grave caractérisée.",
    benefits: 'Protège les intérêts critiques spécifiques au secteur tout en limitant la responsabilité générale, approche ciblée et professionnelle.',
    legalBasis: 'Art. 1623 C.c.Q. sur les clauses pénales et limitations de responsabilité',
    negotiationTips: [
      'Adaptez les exceptions aux risques spécifiques de votre secteur d\'activité',
      'Négociez des définitions précises de "négligence grave caractérisée"',
      'Prévoyez des obligations d\'assurance pour couvrir les risques exclus'
    ],
    fallbackOptions: [
      {
        title: 'Approche par seuils',
        description: 'Limitation progressive : 100% pour faute intentionnelle, 50% pour négligence grave, 25% pour manquements mineurs'
      }
    ]
  },
  {
    title: 'Responsabilité avec mécanisme d\'assurance',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "Chaque partie maintient une assurance responsabilité civile professionnelle d'au moins 2M$ et limite sa responsabilité au montant de cette couverture, sauf faute intentionnelle. Les parties se transmettent mutuellement leurs attestations d'assurance.",
    benefits: 'Protection financière réelle, partage équitable des risques, couverture professionnelle adaptée.',
    legalBasis: 'Bonnes pratiques contractuelles et gestion des risques professionnels',
    negotiationTips: [
      'Adaptez le montant de couverture à la valeur et aux risques du contrat',
      'Négociez des clauses de notification en cas de sinistre',
      'Prévoyez des mécanismes de renouvellement automatique des polices'
    ]
  }
];

export const RESPONSIBILITY_EMERGENCY: ClauseRecommendation = {
  title: '🚨 URGENCE - Exclusion absolue détectée',
  riskReduction: 'Risque critique réduit à 2/5',
  clauseText: "CLAUSE D'URGENCE : Nonobstant toute autre disposition, chaque partie demeure responsable en cas de faute intentionnelle, négligence grave, violation des obligations de confidentialité et manquement aux obligations essentielles définies à l'annexe A. Cette responsabilité ne peut être limitée ou exclue.",
  benefits: 'Rétablit un équilibre contractuel minimal, protège contre les exclusions abusives, maintient la responsabilité pour les fautes graves.',
  legalBasis: 'Art. 1474 C.c.Q. - Impossibilité d\'exclure la responsabilité pour faute intentionnelle',
  negotiationTips: [
    'Présentez cette clause comme une exigence légale non négociable',
    'Définissez précisément les "obligations essentielles" en annexe',
    'Proposez une médiation obligatoire avant tout recours judiciaire'
  ],
  fallbackOptions: [
    {
      title: 'Compromis minimal',
      description: 'Maintenir au minimum la responsabilité pour faute intentionnelle et violation de confidentialité'
    }
  ]
};