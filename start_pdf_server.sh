#!/bin/bash

echo "========================================"
echo "   DÉMARRAGE SERVEUR PDF EXTRACTOR"
echo "========================================"
echo

# Vérification de Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 n'est pas installé"
    echo "📦 Installez Python3 avec votre gestionnaire de paquets"
    exit 1
fi

echo "✅ Python3 détecté"

# Installation des dépendances si nécessaire
echo "📦 Vérification des dépendances..."
pip3 install -r back/requirements.txt

echo
echo "🚀 Démarrage du serveur PDF..."
echo "🌐 Le serveur sera accessible sur http://localhost:5678"
echo "⚠️  Gardez ce terminal ouvert pour maintenir le serveur actif"
echo

# Démarrage du serveur FastAPI
python3 -m uvicorn back.app.main:app --host 0.0.0.0 --port 5678

echo
echo "⚠️  Le serveur s'est arrêté"
read -p "Appuyez sur Entrée pour continuer..."