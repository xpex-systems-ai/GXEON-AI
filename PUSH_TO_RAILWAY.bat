@echo off
REM GXEON Push to Railway Script
REM Execute este script para fazer push e deploy

echo ==========================================
echo    GXEON PUSH TO RAILWAY
echo ==========================================
echo.

echo [1/3] Verificando status...
git status --short

echo.
echo [2/3] Fazendo push para origin main...
git push origin main

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERRO] Push falhou. Tentando com force...
  git push origin main --force-with-lease
)

echo.
echo [3/3] Verificando log...
git log --oneline -3

echo.
echo ==========================================
echo    PUSH COMPLETADO
echo ==========================================
echo.
echo Proximos passos:
echo 1. Acesse https://railway.app/dashboard
echo 2. Verifique se o deploy iniciou
echo 3. Se falhar, use: railway up
echo.
pause
