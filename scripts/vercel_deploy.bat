@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   🚀 GXEON DASHBOARD - VERCEL DEPLOY
echo ============================================
echo.

cd "C:\Users\P-c\Documents\xzeon-xpex-1\dashboard"

echo [1/3] Installing dependencies...
call npm install
echo.

echo [2/3] Building Next.js project...
call npm run build
echo.

echo [3/3] Deploying to Vercel...
call npx vercel --prod
echo.

echo ============================================
echo   ✅ DEPLOY COMPLETE!
echo ============================================
echo.
echo Check your dashboard at:
echo https://gxeon-ai-7jao.vercel.app
echo.
pause
