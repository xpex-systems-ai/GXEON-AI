# Emergency Railway Deploy Fix - PowerShell Script
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    GXEON EMERGENCY DEPLOY FIX v4.0" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

# 1. Check git status
Write-Host "`n[1/6] Checking git status..." -ForegroundColor Yellow
$status = git status --short
Write-Host $status

# 2. Remove old Dockerfile from tracking if exists
Write-Host "`n[2/6] Cleaning Dockerfile tracking..." -ForegroundColor Yellow
git rm --cached Dockerfile 2>$null | Out-Null

# 3. Add all changes
Write-Host "`n[3/6] Adding all changes..." -ForegroundColor Yellow
git add -A

# 4. Commit
Write-Host "`n[4/6] Creating commit..." -ForegroundColor Yellow
git commit -m "Emergency fix: Production server v4.0, Railway optimized, WebSocket crash resolved"

# 5. Force push (with lease for safety)
Write-Host "`n[5/6] Pushing to origin..." -ForegroundColor Yellow
git push origin main --force-with-lease

# 6. Verify
Write-Host "`n[6/6] Verifying push..." -ForegroundColor Yellow
$log = git log --oneline -1
Write-Host "Latest commit: $log" -ForegroundColor Green

Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "    DEPLOY INITIATED!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. Check Railway dashboard for build status" -ForegroundColor White
Write-Host "2. If build fails again, manually redeploy with 'Clear Build Cache'" -ForegroundColor White
Write-Host "`nTreasury: 0x3955d559055DadB7067054cB6E6f974710345224" -ForegroundColor Cyan

Read-Host "`nPress Enter to exit"
