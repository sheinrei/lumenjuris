@echo off
REM Lance le serveur du complement Word Lumen Juris (https://localhost:3001)
REM Laisser cette fenetre OUVERTE pendant l'utilisation dans Word.
cd /d "%~dp0"
npm run dev-server
pause
