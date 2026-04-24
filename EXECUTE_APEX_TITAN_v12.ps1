#!/usr/bin/env powershell
# ═══════════════════════════════════════════════════════════════════════════
# GXEON APEX-TITAN v12 - CAÇA DE QUINTA GERAÇÃO
# Auto-Deploy Dashboard Sovereign Console via Grafana HTTP API
# 
# General Júnior Sena - Execute para transformar seu monitor
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════════════════
# CREDENCIAIS DO SISTEMA APEX
# ═══════════════════════════════════════════════════════════════════════════
# Credenciais via env vars ou input
$env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$env:GRAFANA_CLOUD_TOKEN = $env:GRAFANA_CLOUD_TOKEN
$env:GRAFANA_INSTANCE_ID = $env:GRAFANA_INSTANCE_ID
$env:SUPABASE_DB_PASSWORD = Read-Host -Prompt "🔑 Digite a senha do banco Supabase (postgres)" -AsSecureString

# Converter secure string para texto (necessário para o script)
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:SUPABASE_DB_PASSWORD)
$env:SUPABASE_DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                                               ║" -ForegroundColor Magenta
Write-Host "║           🌑 GXEON APEX-TITAN v12 - CAÇA DE QUINTA GERAÇÃO                    ║" -ForegroundColor Magenta
Write-Host "║                   🏎️ Ferrari Edition - Sovereign Console                        ║" -ForegroundColor Magenta
Write-Host "║                                                                               ║" -ForegroundColor Magenta
Write-Host "║              Modo: DIRECT_API_INJECTION - AUTO-DEPLOY                           ║" -ForegroundColor Magenta
Write-Host "║              Telemetry: Supabase Pooler (aws-0-sa-east-1)                       ║" -ForegroundColor Magenta
Write-Host "║                                                                               ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "[⚡] Iniciando reconstrução atômica do Dashboard..." -ForegroundColor Cyan
Write-Host "[📡] Target: https://$env:GRAFANA_INSTANCE_ID.grafana.net" -ForegroundColor Yellow
Write-Host "[🔌] Pooler: aws-0-sa-east-1.pooler.supabase.com:6543" -ForegroundColor Yellow
Write-Host ""

# Verificar Node.js
Write-Host "[🔍] Verificando Node.js..." -ForegroundColor Gray
try {
    $nodeVersion = node --version
    Write-Host "    ✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "    ❌ Node.js não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[🚀] Executando deployment APEX-TITAN v12..." -ForegroundColor Cyan
Write-Host ""

# Executar o deployer
npm run grafana:apex

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Magenta

# Perguntar se quer abrir o Grafana
$openGrafana = Read-Host -Prompt "🌐 Deseja abrir o Dashboard no navegador? (S/n)"
if ($openGrafana -eq "" -or $openGrafana -eq "S" -or $openGrafana -eq "s") {
    Start-Process "https://$env:GRAFANA_INSTANCE_ID.grafana.net/d/gxeon-apex-001"
}

Write-Host ""
Write-Host "👑 APEX-TITAN v12 - Operação Concluída" -ForegroundColor Magenta
Write-Host ""
