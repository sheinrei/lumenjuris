@echo off
echo 🚀 Demarrage du serveur Mistral PDF...
echo.

REM Verifier si Python est installe
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python n'est pas installe ou pas dans le PATH
    pause
    exit /b 1
)

REM Verifier les dependances
echo 📦 Verification des dependances Mistral...
pip show mistralai >nul 2>&1
if errorlevel 1 (
    echo 📥 Installation des dependances...
    pip install flask flask-cors mistralai python-dotenv
)

REM Verifier la cle API
if not exist .env (
    echo ❌ Fichier .env manquant
    echo 💡 Creez un fichier .env avec MISTRAL_API_KEY=votre_cle
    pause
    exit /b 1
)

echo 🔧 Demarrage du serveur Mistral sur le port 5678...
echo 📍 URL: http://localhost:5678
echo 🔑 Utilise la cle API Mistral pour OCR avance
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

python pdf_extractor_server.py

pause 