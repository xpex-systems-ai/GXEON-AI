@echo off
REM GXEON Railway Deploy Fix Script
REM Execute este script para corrigir o deploy

echo [1/5] Removendo Dockerfile do Git...
git rm --cached Dockerfile 2>nul
del /f Dockerfile 2>nul

echo [2/5] Verificando railway.json...
type railway.json

echo [3/5] Adicionando mudancas...
git add railway.json package.json package-lock.json server/production.js scripts/test_production_server.js .env.template Dockerfile.backup

echo [4/5] Commit...
git commit -m "Fix Railway: remove Dockerfile, use nixpacks, production server v4.0"

echo [5/5] Push para deploy...
git push origin main

echo.
echo [OK] Deploy iniciado! Verifique o Railway dashboard.
pause
