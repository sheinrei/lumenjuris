import React from 'react';
import { useAppliedRecommendationsStore } from '../store/appliedRecommendationsStore';
import { useDocumentTextStore } from '../store/documentTextStore';
import { ClauseRisk } from '../types';
import { X } from 'lucide-react';

interface ModificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clauses: ClauseRisk[];
}

export const ModificationsPanel: React.FC<ModificationsPanelProps> = ({ isOpen, onClose, clauses }) => {
  const { appliedRecommendations, removeAppliedRecommendation } = useAppliedRecommendationsStore();
  const { patches, removePatch, resetAll } = useDocumentTextStore();

  const activePatches = patches.filter(p => p.active);
  const byKey = Object.fromEntries(activePatches.map(p => [p.recommendationKey, p]));

  const handleRemove = (clauseId: string, recommendationIndex: number) => {
    removeAppliedRecommendation(clauseId, recommendationIndex);
    const key = `${clauseId}:${recommendationIndex}`;
    removePatch(key);
  };

  const handleResetAll = () => {
    //clearAllAppliedRecommendations(); => Retiré géré dans le resetAll()
    resetAll();
    onClose();
  };

  const getClauseLabel = (clauseId: string) => {
    const c = clauses.find(cl => cl.id === clauseId);
    return c ? c.type : clauseId;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="bg-white w-full md:max-w-2xl max-h-[90vh] rounded-t-xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b bg-slate-800 text-white">
          <h3 className="text-base font-semibold">Modifications appliquées ({activePatches.length})</h3>
          <button onClick={onClose} className="hover:text-slate-200" title="Fermer"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {appliedRecommendations.length === 0 && (
            <div className="text-center text-slate-500 py-8">Aucune modification appliquée.</div>
          )}
          {appliedRecommendations.map((applied) => {
            const key = `${applied.clauseId}:${applied.recommendationIndex}`;
            const patch = byKey[key];
            return (
              <div key={key} className="border rounded-md p-3 bg-slate-50 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-800 text-sm">
                    {getClauseLabel(applied.clauseId)} – {applied.recommendation.title}
                  </div>
                  <button onClick={() => handleRemove(applied.clauseId, applied.recommendationIndex)} className="text-slate-500 hover:text-slate-700 text-xs">Retirer</button>
                </div>
                {patch && (
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Original</div>
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-white border rounded p-2 max-h-48 overflow-auto">{patch.originalSlice}</pre>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Remplacement</div>
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-white border rounded p-2 max-h-48 overflow-auto">{patch.newSlice}</pre>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mt-1">
                  <span>Ajoutée: {applied.appliedAt.toLocaleString('fr-FR')}</span>
                  {patch && <span>Plage: {patch.startOrig}–{patch.endOrig}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t px-5 py-3 flex items-center justify-between bg-slate-50">
          <button onClick={handleResetAll} className="text-red-600 text-sm font-medium hover:text-red-700 disabled:opacity-40" disabled={activePatches.length === 0}>Réinitialiser tout</button>
          <button onClick={onClose} className="text-slate-600 text-sm font-medium hover:text-slate-800">Fermer</button>
        </div>
      </div>
    </div>
  );
};
