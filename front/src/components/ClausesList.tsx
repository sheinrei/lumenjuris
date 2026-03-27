import React from 'react';
import { AlertTriangle, Shield, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { ClauseRisk } from '../types';

interface ClausesListProps {
  clauses: ClauseRisk[];
  selectedClause: string | null;
  onClauseSelect: (clauseId: string) => void;
}

export const ClausesList: React.FC<ClausesListProps> = ({ clauses, selectedClause, onClauseSelect }) => {
  const getRiskIcon = (score: number) => {
    if (score >= 4) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (score >= 3) return <TrendingUp className="w-4 h-4 text-orange-600" />;
    return <Shield className="w-4 h-4 text-green-600" />;
  };

  const getRiskColor = (score: number) => {
    if (score >= 4) return 'border-red-200 bg-red-50';
    if (score >= 3) return 'border-orange-200 bg-orange-50';
    return 'border-green-200 bg-green-50';
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 4) return 'bg-red-100 text-red-800';
    if (score >= 3) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Clauses Identifiées</h2>
        <p className="text-sm text-gray-600">{clauses.length} clauses analysées</p>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto max-h-96">
        {clauses.map((clause, index) => (
          <motion.div
            key={clause.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedClause === clause.id
                ? 'border-blue-500 bg-blue-50'
                : `${getRiskColor(clause.riskScore)} hover:shadow-md`
            }`}
            onClick={() => onClauseSelect(clause.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getRiskIcon(clause.riskScore)}
                <h3 className="font-medium text-gray-900">{clause.type}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(clause.riskScore)}`}>
                  {clause.riskScore}/5
                </span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {clause.justification}
            </p>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Catégorie: {clause.category}</span>
              <span className="capitalize">{clause.category}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};