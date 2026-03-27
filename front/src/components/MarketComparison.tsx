import React, { useState, useMemo } from 'react';
import { MarketAnalysisResult } from '../utils/marketAnalysis';

interface MarketComparisonProps {
  analysisResult: MarketAnalysisResult;
  onQuestionClick: (question: string) => void;
  isLoading?: boolean;
}

export const MarketComparison: React.FC<MarketComparisonProps> = ({
  analysisResult,
  onQuestionClick,
  isLoading = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'manques' | 'ecarts' | 'questions'>('ecarts');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mr-3"></div>
          <span className="text-lg text-gray-600">Analyse comparative en cours...</span>
        </div>
      </div>
    );
  }

  const { clausesManquantes, ecartAuxStandards, questionsProposees, scoreConformite } = analysisResult;

  // Trier les écarts pour afficher les plus défavorables en premier
  const sortedEcarts = useMemo(() => {
    const impactOrder = { 'élevé': 3, 'moyen': 2, 'faible': 1 };
    const ecartOrder = { 'défavorable': 3, 'neutre': 2, 'favorable': 1 };

    return [...ecartAuxStandards].sort((a, b) => {
      if (a.ecart !== b.ecart) {
        return ecartOrder[b.ecart] - ecartOrder[a.ecart];
      }
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }, [ecartAuxStandards]);


  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'critique': return 'bg-red-50 border-red-200';
      case 'important': return 'bg-orange-50 border-orange-200';
      case 'mineur': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getEcartColor = (ecart: string) => {
    switch (ecart) {
      case 'favorable': return 'bg-green-50 border-green-200';
      case 'défavorable': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const getUrgenceColor = (urgence: string) => {
    switch (urgence) {
      case 'haute': return 'bg-blue-50 border-blue-200';
      case 'moyenne': return 'bg-gray-50 border-gray-200';
      case 'basse': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'élevé': return '🔴';
      case 'moyen': return '🟠';
      case 'faible': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header avec score de conformité */}
      <div className="bg-gray-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Analyse Comparative & Standards</h2>
            <p className="text-gray-500 mt-1">Comparaison de votre contrat aux pratiques du marché.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-700">{scoreConformite}%</div>
            <div className="text-sm text-gray-500">Score de conformité</div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Conformité au marché</span>
            <span>{scoreConformite}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${scoreConformite}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex">
           <button
            onClick={() => setSelectedCategory('ecarts')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedCategory === 'ecarts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Écarts Standards ({ecartAuxStandards.length})
          </button>
          <button
            onClick={() => setSelectedCategory('manques')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedCategory === 'manques'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Clauses Manquantes ({clausesManquantes.length})
          </button>
          <button
            onClick={() => setSelectedCategory('questions')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedCategory === 'questions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Questions ({questionsProposees.length})
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="p-6 bg-gray-50">
        {selectedCategory === 'manques' && (
          <div className="space-y-4">
            {clausesManquantes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ✅ Aucune clause manquante critique détectée
              </div>
            ) : (
              <div className="space-y-3">
                {clausesManquantes.map((clause, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getPriorityColor(clause.priorite)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">{clause.nom}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 text-gray-700">
                        {clause.importance.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm mb-3 text-gray-700">
                      <strong>Problème:</strong> {clause.explicationAbsence}
                    </p>

                    <div className="bg-white bg-opacity-60 rounded p-3 mb-3">
                      <p className="text-sm text-gray-800">
                        <strong>Standard du marché:</strong> {clause.standardMarche}
                      </p>
                    </div>

                    <div className="bg-white bg-opacity-60 rounded p-3">
                      <p className="text-sm text-gray-800">
                        <strong>Suggestion:</strong> {clause.suggestionAjout}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedCategory === 'ecarts' && (
          <div className="space-y-4">
            {sortedEcarts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ✅ Contrat conforme aux standards du marché
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEcarts.map((ecart, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getEcartColor(ecart.ecart)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">{ecart.clause}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 text-gray-700">
                          {ecart.ecart.toUpperCase()}
                        </span>
                        <span className="text-sm">{getImpactIcon(ecart.impact)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white bg-opacity-60 rounded p-3">
                        <p className="text-xs text-gray-500 mb-1">VOTRE CONTRAT</p>
                        <p className="text-sm text-gray-800">{ecart.votreContrat}</p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-3">
                        <p className="text-xs text-gray-500 mb-1">STANDARD MARCHÉ</p>
                        <p className="text-sm text-gray-800">{ecart.standard}</p>
                      </div>
                    </div>

                    <div className="bg-white bg-opacity-60 rounded p-3">
                      <p className="text-sm text-gray-800">
                        <strong>💡 Recommandation:</strong> {ecart.recommandation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedCategory === 'questions' && (
          <div className="space-y-4">
            {questionsProposees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune question contextuelle générée
              </div>
            ) : (
              <div className="space-y-3">
                {questionsProposees.map((question, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getUrgenceColor(question.urgence)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <button
                        onClick={() => onQuestionClick(question.question)}
                        className="text-left flex-1 hover:text-blue-600"
                      >
                        <h4 className="font-medium text-gray-800">{question.question}</h4>
                      </button>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 text-gray-700">
                          {question.urgence.toUpperCase()}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 text-gray-700">
                          {question.categorie}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600">
                      {question.contexte}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};