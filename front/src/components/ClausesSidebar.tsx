import React from 'react';
import { ClauseRisk } from '../types';
import { ClauseRiskCard } from './ClauseRiskCard';
import { TextPatch } from '../store/documentTextStore';

interface ClausesSidebarProps {
  clauses: ClauseRisk[];
  onClauseClick?: (clause: ClauseRisk, index: number) => void;
  isVisible: boolean;
  activeClauseId?: string | null;
  recommandationApplied?: TextPatch[];
}

export const ClausesSidebar: React.FC<ClausesSidebarProps> = ({
  clauses,
  onClauseClick,
  isVisible = true,
  recommandationApplied,
}) => {

  if (!isVisible || !clauses || clauses.length === 0) {
    return null;
  }



  const handleClauseClick = (clause: ClauseRisk, index: number) => {
    if (onClauseClick) {
      onClauseClick(clause, index);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-fit">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          ⚖️ Clauses détectées
          <span className="text-sm font-medium text-gray-500">({clauses.length})</span>
        </h3>
      </div>


      {/* Clauses List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {clauses.map((clause, index) => (
          <ClauseRiskCard
            key={clause.id}
            clause={clause}
            onClick={() => handleClauseClick(clause, index)}
            recommandationApplied={recommandationApplied}
          />
        ))}
      </div >
    </div >
  );
};

