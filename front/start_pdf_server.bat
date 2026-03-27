@echo off
title Serveur PDF Extractor Mistral - Justiclause
color 0A
echo ========================================
echo   SERVEUR PDF MISTRAL - JUSTICLAUSE
echo ========================================
echo.

REM Vérification de Python
echo 🔍 Vérification de Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python n'est pas installé ou pas dans le PATH
    echo.
    echo 📦 Solutions :
    echo    1. Installez Python depuis https://python.org
    echo    2. Cochez "Add Python to PATH" lors de l'installation
    echo    3. Redémarrez votre ordinateur après installation
    echo.
    pause
    exit /b 1
)

python --version
echo ✅ Python détecté

echo.
echo 📦 Installation/vérification des dépendances...
pip install -r back\requirements.txt

if errorlevel 1 (
    echo ⚠️ Erreur installation, tentative avec pip3...
    pip3 install -r back\requirements.txt
)

echo.
echo 🔑 Vérification configuration Mistral...
if not exist .env (
    echo ❌ ERREUR: Fichier .env manquant !
    echo.
    echo 📝 Créez un fichier .env avec :
    echo    MISTRAL_API_KEY=votre_cle_mistral_ici
    echo.
    echo 🌐 Obtenez votre clé sur : https://console.mistral.ai/
    echo.
    pause
    exit /b 1
)

echo.
echo 🚀 Démarrage du serveur PDF Mistral...
echo 🌐 Serveur accessible sur : http://localhost:5678
echo 🔗 Endpoint extraction : http://localhost:5678/extract-pdf-text
echo.
echo ⚠️  IMPORTANT : Gardez cette fenêtre ouverte !
echo    Le serveur doit rester actif pour que Justiclause fonctionne
echo.
echo 📊 Statut : Démarrage en cours...

REM Démarrage du serveur avec gestion d'erreur
python -m uvicorn back.app.main:app --host 0.0.0.0 --port 5678

if errorlevel 1 (
    echo.
    echo ❌ Erreur de démarrage du serveur
    echo.
    echo 🛠️ Solutions possibles :
    echo    1. Port 5678 déjà utilisé - redémarrez votre ordinateur
    echo    2. Dépendances manquantes - réinstallez Python
    echo    3. Permissions insuffisantes - exécutez en tant qu'administrateur
    echo.
)

echo.
echo ⚠️ Le serveur s'est arrêté
echo Appuyez sur une touche pour fermer...
pause >nul