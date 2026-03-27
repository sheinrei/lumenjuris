@echo off
echo 🚀 Installation des dépendances OCR rapides...
echo.

echo 📦 Installation EasyOCR (recommandé - le plus rapide)...
pip install easyocr
echo.

echo 📦 Installation PaddleOCR (alternative rapide)...
pip install paddleocr
echo.

echo 📦 Installation PDF2Image (requis pour OCR)...
pip install pdf2image
echo.

echo 📦 Installation Pillow (requis pour images)...
pip install Pillow
echo.

echo 📦 Installation Tesseract Python (fallback)...
pip install pytesseract
echo.

echo ⚠️ IMPORTANT pour Tesseract:
echo 1. Téléchargez Tesseract depuis: https://github.com/UB-Mannheim/tesseract/wiki
echo 2. Installez dans: C:\Program Files\Tesseract-OCR\
echo 3. Ajoutez au PATH Windows: C:\Program Files\Tesseract-OCR\
echo.

echo ⚠️ IMPORTANT pour Poppler (PDF2Image):
echo 1. Téléchargez depuis: https://github.com/oschwartz10612/poppler-windows/releases/
echo 2. Extrayez dans: C:\poppler\
echo 3. Ajoutez au PATH: C:\poppler\Library\bin\
echo.

echo ✅ Installation terminée!
echo 🔄 Redémarrez le serveur PDF après installation
echo.
pause
