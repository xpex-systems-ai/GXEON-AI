@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   🚀 GXEON DASHBOARD - DEPLOY VERCEL
echo ============================================
echo.

cd "C:\Users\P-c\Documents\xzeon-xpex-1\dashboard"

echo [1/5] Limpando cache...
if exist ".next" rmdir /s /q ".next"
if exist "dist" rmdir /s /q "dist"
echo ✅ Cache limpo
echo.

echo [2/5] Verificando dependências...
if not exist "node_modules" (
    echo Instalando dependências...
    call npm install
) else (
    echo ✅ node_modules existe
)
echo.

echo [3/5] Verificando Vercel CLI...
npx vercel --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Instalando Vercel CLI...
    npm install -g vercel
)
echo ✅ Vercel CLI pronto
echo.

echo [4/5] Build do projeto...
call npm run build 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ BUILD FALHOU
    echo Verifique os erros acima
    pause
    exit /b 1
)
echo ✅ Build concluído
echo.

echo [5/5] Deploy na Vercel...
echo.
echo Escolha o tipo de deploy:
echo 1. Production (site ao vivo)
echo 2. Preview (teste)
echo.
set /p choice="Digite 1 ou 2: "

if "%choice%"=="1" (
    echo.
    echo 🚀 Deploy PRODUCTION...
    npx vercel --prod
) else (
    echo.
    echo 🔍 Deploy PREVIEW...
    npx vercel
)

echo.
echo ============================================
echo   ✅ PROCESSO CONCLUÍDO
echo ============================================
echo.
pause
