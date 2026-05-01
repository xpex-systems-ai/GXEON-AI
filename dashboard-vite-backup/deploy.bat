@echo off
echo ==========================================
echo GXEON DASHBOARD - BUILD & DEPLOY
echo ==========================================
echo.

echo [1/3] Limpando dist anterior...
if exist dist rmdir /s /q dist

echo [2/3] Buildando para producao...
npm run build
if %ERRORLEVEL% neq 0 (
    echo ERRO no build!
    pause
    exit /b 1
)

echo.
echo [3/3] Deploy para Vercel...
npx vercel --prod --yes

echo.
echo ==========================================
echo DEPLOY CONCLUIDO!
echo ==========================================
pause
