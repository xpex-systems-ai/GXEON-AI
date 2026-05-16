# 🌑 GXEON PREDATOR v4.0.0 - EXECUÇÃO MÁXIMA
# PowerShell Script para Deploy Imediato
# Credenciais já configuradas - 19 Abril 2026

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🌑 GXEON SOVEREIGN PROSPERITY v4.0.0" -ForegroundColor Yellow
Write-Host "   EXECUÇÃO MÁXIMA - FAMILY SUSTENANCE ENGINE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configurar variáveis de ambiente
Write-Host "🔧 Configurando credenciais..." -ForegroundColor Gray

$env:SUPABASE_PROJECT_URL = "https://telxvphgrsvsnxvmjkce.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbHh2cGhncnN2c254dm1qa2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNjMzMSwiZXhwIjoyMDkwMTAyMzMxfQ.297P1WLrSDqiRWtyUk5OuLoLvAU99zy53_HodleZQkA"
$env:ALCHEMY_WSS_URL_PRIMARY = "wss://arb-mainnet.g.alchemy.com/v2/E3msU5dEn_5jYSdYzwnAx"
$env:ALCHEMY_API_KEY = "E3msU5dEn_5jYSdYzwnAx"
$env:COMMANDER_WALLET_ADDRESS = "0x3955d559055DadB7067054cB6E6f974710345224"
$env:MIN_AI_CONFIDENCE = "0.85"
$env:MAX_GAS_PRICE_GWEI = "0.1"
$env:MIN_PROFIT_THRESHOLD = "0.005"
$env:FEE_PROTECTION_BUFFER = "0.15"
$env:EMERGENCY_KILL_SWITCH = "INACTIVE"
$env:AUDIT_MODE = "STRICT"
$env:PORT = "3000"
$env:NODE_ENV = "production"

Write-Host "✅ Credenciais configuradas:" -ForegroundColor Green
Write-Host "   • Supabase: telxvphgrsvsnxvmjkce.supabase.co" -ForegroundColor Gray
Write-Host "   • Alchemy: E3msU5dEn_5jYSdYzwnAx" -ForegroundColor Gray
Write-Host "   • Commander: 0x3955...4224" -ForegroundColor Gray
Write-Host ""

# Iniciar Deploy
Write-Host "🚀 Iniciando DEPLOY FINAL..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    npm run deploy:final
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌑 GXEON PREDATOR v4.0.0 OPERACIONAL" -ForegroundColor Cyan
    Write-Host "💰 Revenue Stream: 100% → Família Sena" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ ERRO NO DEPLOY: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}
