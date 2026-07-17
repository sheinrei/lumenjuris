import React, { useState } from "react";
import {
  MarketAnalysisResult,
  MissingClause,
} from "../../utils/marketAnalysis";
import { useDocumentTextStore } from "../../store/documentTextStore";

interface MarketComparisonProps {
  analysisResult: MarketAnalysisResult;
  isLoading?: boolean;
  onAppendClause: (clause: MissingClause) => void;
}

export const MarketComparison: React.FC<MarketComparisonProps> = ({
  analysisResult,
  isLoading = false,
  onAppendClause,
}) => {
  const addedClauseNames = useDocumentTextStore(
    (state) => state.addedClauses || [],
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mr-3"></div>
          <span className="text-lg text-gray-600">
            Analyse des clauses suggérées en cours...
          </span>
        </div>
      </div>
    );
  }

  const allClauses = analysisResult?.clausesManquantes || [];
  const clausesManquantes = allClauses.filter(
    (clause) => !addedClauseNames.includes(clause.nom),
  );

  const PRIORITY_ORDER: Record<string, number> = {
    critique: 0,
    important: 1,
    mineur: 2,
  };

  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case "critique":
        return {
          card: "bg-red-200/70 border-red-300/80",
          badge: "bg-red-100/80 border-red-500 text-red-700",
          border: "border-b border-red-300",
        };
      case "important":
        return {
          card: "bg-orange-200/70 border-orange-300/80",
          badge: "bg-orange-100/80 border-orange-500 text-orange-700",
          border: "border-b border-orange-300",
        };
      case "mineur":
        return {
          card: "bg-green-200/70 border-green-300/80",
          badge: "bg-green-200/80 border-green-500 text-green-700",
          border: "border-b border-green-300",
        };
      default:
        return {
          card: "bg-gray-50 border-gray-200",
          badge: "bg-gray-100 border-gray-300 text-gray-700",
          border: "border-b border-gray-300",
        };
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 bg-gray-50">
        {clausesManquantes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune clause manquante critique détectée
          </div>
        ) : (
          <div className="space-y-5">
            {clausesManquantes
              .sort((a, b) => {
                const priorityA = PRIORITY_ORDER[a.priorite];
                const priorityB = PRIORITY_ORDER[b.priorite];
                return priorityA - priorityB;
              })
              .map((clause, index) => {
                const colors = getPriorityColor(clause.priorite);
                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 transition-colors ${colors.card}`}
                  >
                    <div
                      className={`flex items-start justify-between mb-2 pb-2 ${colors.border}`}
                    >
                      <h4 className="font-semibold text-gray-800">
                        {clause.nom}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border uppercase ${colors.badge}`}
                      >
                        {clause.importance?.toUpperCase() ||
                          clause.priorite?.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm mb-1 mt-3 text-gray-800">
                      <strong>Problème:</strong> {clause.explicationAbsence}
                    </p>

                    <div className=" p-3 ">
                      <p className="text-sm text-gray-800">
                        <strong>Standard du marché:</strong>{" "}
                        {clause.standardMarche}
                      </p>
                    </div>

                    <div className="p-3">
                      <p className="text-sm text-gray-800">
                        <strong>Suggestion:</strong> {clause.titreSuggestion}
                      </p>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                        {clause.corpsSuggestion}
                      </p>
                    </div>

                    <button
                      onClick={() => onAppendClause(clause)}
                      className={`mt-4 w-full inline-flex justify-center bg-sky-600 hover:bg-sky-800 text-white items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    >
                      Ajouter
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
