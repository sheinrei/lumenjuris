import React, { useState } from 'react';
import { Brain, TrendingUp, AlertCircle, Lightbulb, BarChart3, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIInsight {
  id: string;
  type: 'pattern' | 'benchmark' | 'prediction' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export const AIInsightsPanel: React.FC = () => {
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  const insights: AIInsight[] = [
    {
      id: '1',
      type: 'pattern',
      title: 'Déséquilibre contractuel détecté',
      description: 'Ce contrat présente un déséquilibre significatif en faveur du prestataire (ratio 3:1). 73% des obligations incombent au client.',
      confidence: 94,
      impact: 'high',
      actionable: true
    },
    {
      id: '2',
      type: 'benchmark',
      title: 'Clauses plus restrictives que la moyenne',
      description: 'Les clauses de résiliation sont 40% plus restrictives que les standards de l\'industrie IT au Canada.',
      confidence: 87,
      impact: 'medium',
      actionable: true
    },
    {
      id: '3',
      type: 'prediction',
      title: 'Risque de litige élevé',
      description: 'Basé sur l\'analyse de 10,000+ contrats similaires, ce contrat présente un risque de litige de 23% (moyenne: 8%).',
      confidence: 78,
      impact: 'high',
      actionable: true
    },
    {
      id: '4',
      type: 'optimization',
      title: 'Opportunité d\'optimisation fiscale',
      description: 'La structure actuelle pourrait bénéficier d\'une clause de répartition des coûts pour optimiser l\'impact fiscal.',
      confidence: 82,
      impact: 'medium',
      actionable: false
    }
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <BarChart3 className="w-5 h-5 text-purple-600" />;
      case 'benchmark':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'prediction':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'optimization':
        return <Target className="w-5 h-5 text-green-600" />;
      default:
        return <Brain className="w-5 h-5 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Insights IA</h2>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Analyse en temps réel</span>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
              selectedInsight === insight.id
                ? 'border-purple-300 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
            onClick={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getInsightIcon(insight.type)}
                <h3 className="font-medium text-gray-900">{insight.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(insight.impact)}`}>
                  {insight.impact === 'high' ? 'Élevé' : insight.impact === 'medium' ? 'Moyen' : 'Faible'}
                </span>
                {insight.actionable && (
                  <Lightbulb className="w-4 h-4 text-yellow-500" title="Action recommandée" />
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Confiance:</span>
                <div className="w-16 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${insight.confidence}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-purple-600">{insight.confidence}%</span>
              </div>
              
              {insight.actionable && (
                <button className="text-xs text-purple-600 hover:text-purple-800 font-medium">
                  Voir actions →
                </button>
              )}
            </div>

            {selectedInsight === insight.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Analyse détaillée:</h4>
                    <p className="text-sm text-gray-600">
                      Cette analyse est basée sur la comparaison avec notre base de données de 50,000+ contrats 
                      similaires et l'application d'algorithmes de machine learning spécialisés en droit contractuel.
                    </p>
                  </div>
                  
                  {insight.actionable && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Actions recommandées:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Réviser les clauses identifiées comme déséquilibrées</li>
                        <li>• Négocier des termes plus équitables avec la contrepartie</li>
                        <li>• Consulter un expert pour validation</li>
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <div className="flex items-center space-x-2 mb-2">
          <Brain className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">Apprentissage Continu</span>
        </div>
        <p className="text-sm text-purple-800">
          L'IA s'améliore avec chaque contrat analysé. Vos retours aident à affiner les recommandations 
          pour votre cabinet et l'ensemble de la communauté juridique.
        </p>
      </div>
    </div>
  );
};