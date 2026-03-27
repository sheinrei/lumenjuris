import React from 'react';
import { X, Download, Mail, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { ClauseRisk } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clauses: ClauseRisk[];
  overallRiskScore: number;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, clauses, overallRiskScore }) => {
  if (!isOpen) return null;

  const highRiskClauses = clauses.filter(c => c.riskScore >= 4);
  const mediumRiskClauses = clauses.filter(c => c.riskScore === 3);
  const lowRiskClauses = clauses.filter(c => c.riskScore < 3);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Rapport d'Analyse Contractuelle</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Executive Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Résumé Exécutif</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{overallRiskScore.toFixed(1)}</div>
                <div className="text-sm text-blue-800">Score Global</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{highRiskClauses.length}</div>
                <div className="text-sm text-red-800">Clauses Critiques</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{mediumRiskClauses.length}</div>
                <div className="text-sm text-orange-800">Clauses à Surveiller</div>
              </div>
            </div>
          </div>

          {/* High Risk Clauses */}
          {highRiskClauses.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                Clauses à Risque Élevé ({highRiskClauses.length})
              </h3>
              <div className="space-y-3">
                {highRiskClauses.map((clause) => (
                  <div key={clause.id} className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-red-900">{clause.type}</h4>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">{clause.riskScore}/5</span>
                    </div>
                    <p className="text-sm text-red-800 mb-2">{clause.justification}</p>
                    <div className="bg-red-100 p-2 rounded text-sm text-red-700">
                      <strong>Recommandation:</strong> {clause.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medium Risk Clauses */}
          {mediumRiskClauses.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                Clauses à Risque Moyen ({mediumRiskClauses.length})
              </h3>
              <div className="space-y-3">
                {mediumRiskClauses.map((clause) => (
                  <div key={clause.id} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-orange-900">{clause.type}</h4>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">{clause.riskScore}/5</span>
                    </div>
                    <p className="text-sm text-orange-800 mb-2">{clause.justification}</p>
                    <div className="bg-orange-100 p-2 rounded text-sm text-orange-700">
                      <strong>Recommandation:</strong> {clause.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Risk Clauses */}
          {lowRiskClauses.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                Clauses à Risque Faible ({lowRiskClauses.length})
              </h3>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  Ces clauses présentent un risque minimal et sont conformes aux standards usuels.
                </p>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Recommandations Générales</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Prioriser la révision des clauses à risque élevé avant signature</li>
              <li>• Négocier des termes plus équilibrés pour les clauses de limitation de responsabilité</li>
              <li>• Envisager l'ajout de clauses de sauvegarde pour les obligations critiques</li>
              <li>• Réviser périodiquement le contrat pour s'assurer de sa conformité</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center">
            <div className="text-sm text-gray-600">
              Généré le {new Date().toLocaleDateString('fr-FR')} par ClauseCraft-CA
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};