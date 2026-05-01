@echo off
chcp 65001 >nul
cd /d "c:\Users\P-c\Documents\xzeon-xpex-1"

cls
echo 🌑 ═══════════════════════════════════════════════════════════════
echo    GXEON DNA ACTIVATION CHECK
echo ════════════════════════════════════════════════════════════════════
echo.

node scripts/dna_activation_check.js

echo.
echo Pressione qualquer tecla para sair...
pause >nul
