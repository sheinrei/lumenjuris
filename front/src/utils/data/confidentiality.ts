import { ClauseRecommendation } from '../../types';

export const CONFIDENTIALITY_RECOMMENDATIONS: ClauseRecommendation[] = [
  {
    title: 'Confidentialité réciproque et graduée',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "Les parties s'engagent mutuellement à préserver la confidentialité des informations échangées selon trois niveaux : (i) Secrets commerciaux : 5 ans, (ii) Informations techniques : 3 ans, (iii) Données opérationnelles : 2 ans après expiration du contrat.",
    benefits: 'Protection mutuelle équitable, durée adaptée au type d\'information, classification claire évitant les conflits.',
    legalBasis: 'Équilibre contractuel et protection des secrets commerciaux (Loi sur la concurrence fédérale)',
    negotiationTips: [
      'Définissez précisément chaque catégorie d\'information confidentielle',
      'Négociez des exceptions pour les obligations légales de divulgation',
      'Prévoyez des modalités de marquage et de restitution des documents'
    ],
    fallbackOptions: [
      {
        title: 'Confidentialité sectorielle standard',
        description: 'Durée unique de 3 ans pour toutes informations, plus simple à gérer'
      },
      {
        title: 'Confidentialité avec notification',
        description: 'Obligation de notification 15 jours avant toute divulgation légale forcée'
      }
    ]
  },
  {
    title: 'Confidentialité avec procédures de sécurité',
    riskReduction: 'Risque réduit à 1/5',
    clauseText: "Chaque partie met en place des mesures de sécurité appropriées (accès restreint, chiffrement, audit trail) et certifie annuellement le respect des obligations de confidentialité. Toute violation doit être notifiée sous 48h.",
    benefits: 'Sécurité renforcée, traçabilité des accès, procédures de notification rapide, conformité RGPD.',
    legalBasis: 'Lois sur la protection des renseignements personnels et conformité réglementaire',
    negotiationTips: [
      'Négociez des standards de sécurité adaptés à votre secteur',
      'Prévoyez des audits de sécurité périodiques',
      'Établissez des procédures d\'incident et de notification'
    ]
  },
  {
    title: 'Confidentialité équilibrée avec exceptions',
    riskReduction: 'Risque réduit à 2/5',
    clauseText: "Les obligations de confidentialité sont réciproques et limitées à 3 ans, avec exceptions pour : (i) informations publiques, (ii) développements indépendants, (iii) obligations légales de divulgation avec préavis de 15 jours.",
    benefits: 'Réciprocité parfaite, durée raisonnable, exceptions claires et équitables.',
    legalBasis: 'Principes d\'équité contractuelle et liberté d\'information',
    negotiationTips: [
      'Négociez une définition précise des "développements indépendants"',
      'Prévoyez des procédures de contestation des divulgations',
      'Établissez des mécanismes de résolution des conflits de confidentialité'
    ]
  }
];