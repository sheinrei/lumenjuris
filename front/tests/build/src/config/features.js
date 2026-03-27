// Feature flags pour contrôler les nouvelles fonctionnalités
export var FEATURE_FLAGS = {
    // Sidebar avec liste des clauses détectées
    ENABLE_CLAUSES_SIDEBAR: true,
    // Mode debug pour le développement
    DEBUG_MODE: process.env.NODE_ENV === 'development',
    // Autres features futures
    ENABLE_ADVANCED_HIGHLIGHTING: false,
    ENABLE_REAL_TIME_ANALYSIS: false,
    // Nettoyage léger (déchets) post-extraction sans restructuration
    ENABLE_LIGHT_SANITIZE: true,
    // Persistance des patches (localStorage) liée au hash du texte original
    ENABLE_PATCH_PERSISTENCE: true,
    // Vérifications d'intégrité (hash slice + contrôle mismatch rebuild)
    ENABLE_PATCH_INTEGRITY_CHECKS: true,
    // Calcul des segments de diff (lecture seule) pour future visualisation
    ENABLE_PATCH_DIFF_COMPUTE: false,
};
// Helper pour vérifier si une feature est activée
export var isFeatureEnabled = function (feature) {
    return FEATURE_FLAGS[feature];
};
export default FEATURE_FLAGS;
