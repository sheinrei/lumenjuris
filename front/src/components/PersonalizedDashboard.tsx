import React from 'react';
import { ContextualAnalysisResult } from '../types/contextualAnalysis';
import { AlertTriangle, CheckCircle, TrendingUp, DollarSign, Clock, Shield } from 'lucide-react';

interface PersonalizedDashboardProps {
  analysis: ContextualAnalysisResult;
  context: any;
}

export const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({ analysis, context }) => {
  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      'acheteur': '🛒',
      'vendeur': '💼',
      'employe': '👤',
      'employeur': '🏢',
      'locataire': '🔑',
      'proprietaire': '🏠',
      'franchiseur': '🏪',
      'franchise': '🍕',
      'partenaire': '🤝'
    };
    return icons[role] || '📋';
  };

  const getRiskColor = (score: number) => {
    if (score >= 4) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 3) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return 'text-green-600 bg-green-100';
      case 'moyenne': return 'text-orange-600 bg-orange-100';
      case 'difficile': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête personnalisé */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              {getRoleIcon(context.userRole)} Analyse personnalisée
            </h2>
            <p className="text-blue-100 mt-1">
              Contrat {context.contractType} • Votre rôle : {context.userRole} • Secteur : {context.industry || 'Non spécifié'}
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getRiskColor(analysis.risk_score_personnalise || 3)}`}>
              Risque personnalisé : {analysis.risk_score_personnalise || 3}/5
            </div>
          </div>
        </div>
      </div>

      {/* Résumé exécutif */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          📋 Résumé exécutif pour vous
        </h3>
        <p className="text-gray-700 leading-relaxed">{analysis.resume_executif}</p>
      </div>

      {/* Alertes critiques */}
      {analysis.alertes_critiques && analysis.alertes_critiques.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={24} />
            Alertes critiques
          </h3>
          <div className="space-y-4">
            {analysis.alertes_critiques.map((alert, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {alert.type === 'financial' && <DollarSign className="text-red-600" size={20} />}
                    {alert.type === 'legal' && <Shield className="text-red-600" size={20} />}
                    {alert.type === 'temporal' && <Clock className="text-red-600" size={20} />}
                    {alert.type === 'operational' && <TrendingUp className="text-red-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900">{alert.titre}</h4>
                    <p className="text-red-700 mt-1 text-sm">{alert.description}</p>
                    <div className="mt-3 p-3 bg-red-100 rounded-lg">
                      <p className="text-red-800 font-medium text-sm">
                        🎯 Action immédiate : {alert.action_immediate}
                      </p>
                      <p className="text-red-700 text-sm mt-1">
                        ⚠️ Si ignoré : {alert.consequence_si_ignore}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clauses prioritaires */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          🎯 Clauses prioritaires pour votre situation
        </h3>
        <div className="space-y-4">
          {analysis.clauses_prioritaires?.slice(0, 8).map((clause, index) => (
            <div key={clause.id || index} className={`border rounded-lg p-4 ${getPriorityColor(clause.priority)}`}>
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{clause.type}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(clause.priority)}`}>
                  {clause.priority === 'critical' ? 'CRITIQUE' : 
                   clause.priority === 'high' ? 'ÉLEVÉ' : 
                   clause.priority === 'medium' ? 'MOYEN' : 'FAIBLE'}
                </span>
              </div>
              <p className="text-sm mb-3 font-mono bg-white bg-opacity-50 p-2 rounded">
                "{clause.text.substring(0, 200)}..."
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Impact pour vous :</strong> {clause.impact_pour_utilisateur}
                </p>
                <p className="text-sm">
                  <strong>Conseil :</strong> {clause.conseil_specifique}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Réponses aux questions */}
      {analysis.reponses_questions && Object.keys(analysis.reponses_questions).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            ❓ Réponses à vos questions
          </h3>
          <div className="space-y-4">
            {Object.entries(analysis.reponses_questions).map(([question, reponse], index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="font-medium text-gray-900 mb-2">Q: {question}</p>
                <p className="text-gray-700">R: {reponse}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points de négociation */}
      {analysis.points_negociation && analysis.points_negociation.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            💪 Points de négociation recommandés
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.points_negociation.map((point, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{point.titre}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(point.difficulte)}`}>
                    {point.difficulte}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{point.description}</p>
                <div className="space-y-2 text-sm">
                  <p><strong>💡 Conseil :</strong> {point.conseil}</p>
                  {point.impact_financier && (
                    <p><strong>💰 Impact :</strong> {point.impact_financier}</p>
                  )}
                  {point.alternative_suggeree && (
                    <p><strong>🔄 Alternative :</strong> {point.alternative_suggeree}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommandations personnalisées */}
      {analysis.recommandations_personnalisees && analysis.recommandations_personnalisees.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={24} />
            Plan d'action personnalisé
          </h3>
          <div className="space-y-3">
            {analysis.recommandations_personnalisees.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <p className="text-green-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Prochaines étapes</h3>
        <div className="flex flex-wrap gap-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            📄 Exporter le rapport
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            📞 Contacter un avocat
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            🔄 Nouvelle analyse
          </button>
        </div>
      </div>
    </div>
  );
};
