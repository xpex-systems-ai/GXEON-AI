cd c:\Users\P-c\Documents\xzeon-xpex-1
Write-Host "[1/6] Adicionando package-lock.json..."
git add package-lock.json
Write-Host "[2/6] Commitando..."
git commit -m "fix: sync package-lock.json for railway deploy"
Write-Host "[3/6] Push para runtime-hardening..."
git push origin runtime-hardening
Write-Host "[4/6] Checkout main..."
git checkout main
Write-Host "[5/6] Merge runtime-hardening..."
git merge runtime-hardening --no-ff -m "deploy: merge runtime-hardening fixes for railway"
Write-Host "[6/6] Push para main..."
git push origin main
Write-Host ""
Write-Host "✅ CONCLUIDO! Railway vai detectar e fazer deploy automaticamente."
Read-Host "Pressione Enter para continuar"
