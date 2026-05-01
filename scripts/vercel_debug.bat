@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   🔧 GXEON DASHBOARD - VERCEL DEBUG
echo ============================================
echo.

cd "C:\Users\P-c\Documents\xzeon-xpex-1\dashboard"

echo [1/4] Checking Node.js version...
node --version
echo.

echo [2/4] Checking npm version...
npm --version
echo.

echo [3/4] Installing dependencies (if needed)...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
) else (
    echo node_modules exists, skipping install
)
echo.

echo [4/4] Building project...
call npm run build 2>&1
echo.

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================
    echo   ❌ BUILD FAILED
    echo ============================================
    echo Check the errors above
) else (
    echo.
    echo ============================================
    echo   ✅ BUILD SUCCESSFUL
    echo ============================================
    echo.
    echo To deploy to Vercel, run:
    echo   npx vercel --prod
)

echo.
pause
