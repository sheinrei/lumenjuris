/* hooks/useShareUrl.ts
 * Hook pour la gestion des URLs de partage
 * Extrait la logique de partage de App.tsx
 */

import { useState, useEffect } from 'react';
import { ContractAnalysis } from '../types';

interface UseShareUrlReturn {
  shareUrl: string;
  handleShareReport: () => void;
  loadSharedData: () => void;
  notification: {
    message: string;
    type: "success" | "error"
  } | null;
  clearNotification: () => void;
}

export const useShareUrl = (
  contract: ContractAnalysis | null,
  reviewedClauses: Set<string>,
  onDataLoaded: (contract: ContractAnalysis, reviewedClauses: string[]) => void
): UseShareUrlReturn => {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [notification, setNotification] = useState<{message: string; type: "success" | "error"} |null>(null);

  // Génération de l'URL de partage
  useEffect(() => {
    if (contract) {
      try {
        const contractData = {
          contract,
          reviewedClauses: Array.from(reviewedClauses),
          timestamp: Date.now(),
        };
        const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(contractData))));
        const currentUrl = window.location.origin + window.location.pathname;
        setShareUrl(`${currentUrl}?shared=${encodedData}`);
      } catch (error) {
        console.error('Erreur génération URL de partage:', error);
        setShareUrl('');
      }
    }
  }, [contract, reviewedClauses]);

  // Chargement des données partagées
  const loadSharedData = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('shared');

    if (sharedData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
        onDataLoaded(decodedData.contract, decodedData.reviewedClauses || []);
      } catch (error) {
        console.error('Erreur lors du chargement des données partagées:', error);
      }
    }
  };

  const handleShareReport = () => {
    if (shareUrl) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          setNotification({message:"Lien de partage copié dans le presse-papiers !", type: "success"});
        })
        .catch(() => {
          // Fallback pour les navigateurs anciens
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setNotification({message: "Lien de partage copié !", type: "success"});
        });
    }
  };

  return {
    shareUrl,
    handleShareReport,
    loadSharedData,
    notification,
    clearNotification: () => setNotification(null),
  };
};
