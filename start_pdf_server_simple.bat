@echo off
echo Demarrage du serveur PDF...
echo.

REM Verifier Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python n'est pas installe ou pas dans le PATH.
    pause
    exit /b 1
)

echo Installation des dependances...
python -m pip install -r back\requirements.txt

echo.
echo URL: http://localhost:5678
echo Appuyez sur Ctrl+C pour arreter
echo.

python -m uvicorn back.app.main:app --host 0.0.0.0 --port 5678

pause