@echo off
echo 🚀 Demarrage du serveur PDF...
echo.

REM Verifier si Python est installe
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python n'est pas installe ou pas dans le PATH
    pause
    exit /b 1
)

REM Installation des dependances
echo 📦 Installation des dependances...
pip install -r back\requirements.txt

echo 🔧 Demarrage du serveur sur le port 5678...
echo 📍 URL: http://localhost:5678
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

uvicorn back.app.main:app --host 0.0.0.0 --port 5678

pause 