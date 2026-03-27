import React from 'react';
import { AlertTriangle, Shield, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { RiskStats } from '../types';

interface RiskDashboardProps {
  /** Statistiques globales remontées par l'analyse IA */
  stats: RiskStats;
  /** Nom du fichier analysé (affiché en haut à droite) */
  fileName: string;
  /** Callback pour faire défiler vers la section des clauses */
  onScrollToClauses?: () => void;
  /** Callback pour faire défiler vers un niveau de risque spécifique */
  
  /**
   * Afficher (ou pas) la ventilation par catégorie.
   * Si tu le laisses à `false`, seuls les compteurs globaux s'affichent
   * et on ne voit plus les blocs "Responsabilité / Risque moyen" etc.
   */
  showCategoryBreakdown?: boolean;
}

/**
 * Tableau de bord synthétique des risques.
 * 🔄 2025‑07‑06 : la ventilation par catégorie est désormais optionnelle (masquée par défaut)
 */
export const RiskDashboard: React.FC<RiskDashboardProps> = ({
  stats,
  fileName,
  onScrollToClauses,
  showCategoryBreakdown = false, // <-- par défaut on NE l'affiche plus
}) => {

  // Fonction pour faire défiler vers la section des clauses
  const handleScrollToClauses = () => {
    if (onScrollToClauses) {
      onScrollToClauses();
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ─── Titre ─── */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Tableau de Bord des Risques
        </h2>
      </div>

      {/* ─── Compteurs globaux (critique → moyen → modéré) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Risque Critique (score 5) */}
        <Card
          color="red"
          label="Risque Critique"
          icon={<AlertCircle className="w-8 h-8 text-red-600" />}
          value={stats.criticalRisk}
          onClick={undefined}
          clickable={false}
        />
        
        {/* Risque Moyen (score 3-4) */}
        <Card
          color="orange"
          label="Risque Moyen"
          icon={<AlertTriangle className="w-8 h-8 text-orange-600" />}
          value={stats.mediumRisk}
          onClick={undefined}
          clickable={false}
        />
        
        {/* Risque Modéré (score < 3) */}
        <Card
          color="green"
          label="Risque Modéré"
          icon={<Shield className="w-8 h-8 text-green-600" />}
          value={stats.lowRisk}
          onClick={undefined}
          clickable={false}
        />
      </div>

      {/* ─── (Optionnel) Détail par catégorie ─── */}
      {showCategoryBreakdown && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.byCategory.map((cat, i) => (
            <div key={i} className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-1">
                {cat.category}
              </div>
              <div className="text-lg font-bold text-blue-600">{cat.count}</div>
              <div className="text-xs text-gray-600">
                Risque moyen : {cat.averageRisk.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────── */
interface CardProps {
  color: 'green' | 'orange' | 'red';
  label: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
  clickable?: boolean;
}

const Card: React.FC<CardProps> = ({ color, label, value, icon, onClick, clickable }) => {
  const colors: Record<CardProps['color'], { bg: string; txt: string }> = {
    green: { bg: 'bg-green-50', txt: 'text-green-600' },
    orange: { bg: 'bg-orange-50', txt: 'text-orange-600' },
    red: { bg: 'bg-red-50', txt: 'text-red-600' },
  };

  const handleClick = () => {
    if (onClick && clickable) {
      onClick();
    }
  };

  return (
    <div
      className={`${colors[color].bg} p-4 rounded-lg ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={colors[color].txt}>{icon}</div>
      </div>
    </div>
  );
};
