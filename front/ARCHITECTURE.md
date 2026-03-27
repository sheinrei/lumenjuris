# 🔧 ARCHITECTURE TECHNIQUE - JustiClause

## 📋 Composants Principaux

### Frontend (React/TypeScript)

#### Core Components
- **App.tsx** : Composant racine, orchestration des états
- **TextViewer.tsx** : Interface principale d'affichage du texte
- **SmartTextViewer.tsx** : Moteur de surlignage intelligent -> edit du 15/01/26 suppression du fichier gérer par ModernHighlight
- **EnhancedClauseDetail.tsx** : Détail enrichi des clauses

#### Business Logic
- **useContractAnalysis.ts** : Hook principal pour l'analyse
- **aiAnalyzer.ts** : Interface avec les API d'IA
- **stableMatching.ts** : Algorithme de correspondance texte/DOM

### Backend (Python)

#### Serveur PDF
- **pdf_extractor_server.py** : Serveur Flask d'extraction PDF
- Support OCR : EasyOCR, PaddleOCR, Tesseract
- Correction automatique des artefacts OCR


## 🔄 Flux de Données

```
1. Upload PDF/Texte
   ↓
2. Extraction (Serveur Python OU PDF.js)
   ↓
3. Analyse IA (OpenAI GPT-4 OU Mistral OU Local)
   ↓
4. Matching & Highlighting (DOM stable)
   ↓
5. Interface Utilisateur (React)
```

## 🎨 Système de Highlighting

### Algorithme StableMatching
1. **Préparation DOM** : Rendu HTML propre
2. **Tokenisation** : Séquences de mots français
3. **Correspondance** : Recherche fuzzy avec tolérance
4. **Application** : Highlights DOM avec métadonnées

### Types de Risques
- **Critique (4-5)** : Rouge - Clauses dangereuses
- **Élevé (3)** : Orange - Attention requise  
- **Modéré (1-2)** : Jaune - Surveillance

## 🤖 Intelligence Artificielle

### Prompts Contextuels
- Variables dynamiques selon le rôle utilisateur
- Adaptation secteur/juridiction
- Personnalisation des recommandations

### Analyse Multi-niveaux
1. **Standard** : Détection générale des clauses
2. **Contextuelle** : Adaptation au contexte métier
3. **Recommandations** : Alternatives personnalisées

## 🛡️ Gestion d'Erreurs

### Fallbacks Automatiques
- PDF.js si serveur Python indisponible  
- Analyse locale si API IA échoue
- Highlighting approximatif si matching parfait impossible

### Logging
- Suivi des performances en console
- Détection automatique des problèmes
- Messages d'aide contextuels

## ⚡ Optimisations

### Performance
- Mémorisation des résultats d'analyse
- Rendu conditionnel React
- Debouncing des interactions utilisateur

### Sécurité
- Validation des entrées
- Sanitisation du contenu
- Chiffrement des communications

## 🔧 Configuration

### Variables d'Environnement
```env
VITE_OPENAI_API_KEY=sk-xxx    # Clé OpenAI (optionnelle)
VITE_PDF_SERVER_URL=http://localhost:5678  # Serveur local
```

### Ports
- **Frontend** : 5173 (Vite dev)
- **PDF Server** : 5678 (Flask)

---

**💡 Cette architecture garantit robustesse, performance et facilité de maintenance.**
