@echo off
echo === Subiendo Pro Ventas Magic a Railway ===
cd /d "%~dp0"
git init
git add .
git commit -m "SQLite persistencia v1.0.5"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/ferdankio/Ventas_Pro.git
git push --force origin main
echo.
echo === Listo! Railway desplegara en 2 minutos ===
echo IMPORTANTE: Configura un volumen en Railway para persistir datos
pause
