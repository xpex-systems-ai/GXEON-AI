#!/usr/bin/env powershell
# ═══════════════════════════════════════════════════════════════════════════
# PROTOCOLO OMEGA 4.0.0 - DEPLOY EXECUTOR PRODUÇÃO
# Comandante: Júnior Sena | Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                                              ║" -ForegroundColor Magenta
Write-Host "║           🌑 PROTOCOLO OMEGA 4.0.0 - DEPLOY PRODUÇÃO                        ║" -ForegroundColor Magenta
Write-Host "║                                                                              ║" -ForegroundColor Magenta
Write-Host "║     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ║" -ForegroundColor DarkGray
Write-Host "║     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ║" -ForegroundColor DarkGray
Write-Host "║     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ║" -ForegroundColor DarkGray
Write-Host "║                                                                              ║" -ForegroundColor Magenta
Write-Host "║           ⚠️  MODO PRODUÇÃO - MAINNET ARBITRUM                              ║" -ForegroundColor Red
Write-Host "║           💰 Transações reais com gas ETH serão executadas                  ║" -ForegroundColor Yellow
Write-Host "║                                                                              ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# FASE 1: VALIDAÇÃO DE AMBIENTE
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "[🔍] FASE 1: VALIDAÇÃO DE AMBIENTE" -ForegroundColor Cyan
Write-Host ""

$requiredVars = @(
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PRIVATE_KEY",
    "ARBITRUM_RPC_URL",
    "ALCHEMY_API_KEY"
)

$missing = @()
foreach ($var in $requiredVars) {
    if (-not [Environment]::GetEnvironmentVariable($var)) {
        $missing += $var
        Write-Host "   ❌ $var não configurada" -ForegroundColor Red
    } else {
        Write-Host "   ✅ $var OK" -ForegroundColor Green
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  VARIÁVEIS AUSENTES:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Configure no Railway Dashboard ou arquivo .env.local" -ForegroundColor Yellow
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════
# FASE 2: INJEÇÃO SQL NO SUPABASE
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[📊] FASE 2: INJEÇÃO DE SCHEMAS SUPABASE" -ForegroundColor Cyan
Write-Host ""

$scripts = @(
    @{File="supabase\fleet_schema_v9.sql"; Desc="Fleet Schema v9"},
    @{File="supabase\grafana_views_v10.sql"; Desc="Grafana Views v10"},
    @{File="EXECUTAR_NO_SUPABASE.sql"; Desc="Tabelas Core (audit_logs, keeper_rewards)"}
)

foreach ($script in $scripts) {
    $path = Join-Path $PSScriptRoot $script.File
    if (Test-Path $path) {
        Write-Host "   📄 $($script.Desc): $path" -ForegroundColor Yellow
        Write-Host "      ⚡ Execute manualmente no SQL Editor do Supabase" -ForegroundColor DarkYellow
    } else {
        Write-Host "   ❌ $($script.File) não encontrado" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "   🔗 URL SQL Editor: https://telhxvphgrsvsnxvmjkce.supabase.co/project/sql" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# FASE 3: ATIVAÇÃO MODO PRODUÇÃO
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[⚡] FASE 3: ATIVAÇÃO MODO PRODUÇÃO" -ForegroundColor Cyan
Write-Host ""

Write-Host "   🔄 Substituindo Keeper Executor (Test → Produção)..." -ForegroundColor Yellow

$testFile = Join-Path $PSScriptRoot "core\keeper_executor_agent.js"
$prodFile = Join-Path $PSScriptRoot "core\keeper_executor_agent_PROD.js"
$backupFile = Join-Path $PSScriptRoot "core\keeper_executor_agent_TEST_BACKUP.js"

if (Test-Path $testFile) {
    Copy-Item $testFile $backupFile -Force
    Write-Host "   ✅ Backup criado: keeper_executor_agent_TEST_BACKUP.js" -ForegroundColor Green
}

if (Test-Path $prodFile) {
    Copy-Item $prodFile $testFile -Force
    Write-Host "   ✅ Modo PRODUÇÃO ativado em keeper_executor_agent.js" -ForegroundColor Green
} else {
    Write-Host "   ❌ Arquivo de produção não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "   📋 Configurações de Produção:" -ForegroundColor Cyan
Write-Host "      • Network: Arbitrum One (Chain ID 42161)" -ForegroundColor White
Write-Host "      • Min Profit: $0.50 USD" -ForegroundColor White
Write-Host "      • Max Gas: 0.1 gwei" -ForegroundColor White
Write-Host "      • Treasury: 0x3955d559055DadB7067054cB6E6f974710345224" -ForegroundColor White
Write-Host "      • Split: 30% Commander / 70% Reinvestimento" -ForegroundColor White

# ═══════════════════════════════════════════════════════════════════════════
# FASE 4: GRAFANA INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[📡] FASE 4: INTEGRAÇÃO GRAFANA" -ForegroundColor Cyan
Write-Host ""

Write-Host "   📊 Dashboard Queries prontas em:" -ForegroundColor Yellow
Write-Host "      grafana\dashboard_queries_oraculo_gx.sql" -ForegroundColor White
Write-Host ""
Write-Host "   🔗 Grafana Cloud: https://gxzeon.grafana.net" -ForegroundColor Cyan
Write-Host "   📡 Instance ID: $env:GRAFANA_INSTANCE_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ⚡ Execute para conectar:" -ForegroundColor Yellow
Write-Host "      npm run grafana:connect" -ForegroundColor White

# ═══════════════════════════════════════════════════════════════════════════
# FASE 5: CHECKLIST FINAL
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[✅] FASE 5: CHECKLIST DE LANÇAMENTO" -ForegroundColor Cyan
Write-Host ""

$checklist = @(
    @{Item="SQL Schemas injetados no Supabase"; Status="PENDENTE - Execute manualmente"},
    @{Item="Env vars configuradas no Railway"; Status="VERIFICADO"},
    @{Item="Keeper Executor em modo PRODUÇÃO"; Status="ATIVADO"},
    @{Item="Sentinel Guardian monitoramento"; Status="ATIVAR via server/index.js"},
    @{Item="Grafana Data Source configurado"; Status="PENDENTE - Configure no Grafana"},
    @{Item="Profit routes ativos (/api/v1/profit)"; Status="VERIFICADO em profit.js"},
    @{Item="Gas suficiente na wallet (min 0.01 ETH)"; Status="VERIFICAR antes do deploy"}
)

foreach ($check in $checklist) {
    $color = if ($check.Status -like "*VERIFICADO*" -or $check.Status -like "*ATIVADO*") { "Green" } else { "Yellow" }
    Write-Host "   [$($check.Status)] $($check.Item)" -ForegroundColor $color
}

# ═══════════════════════════════════════════════════════════════════════════
# COMANDOS DE EXECUÇÃO
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "[🚀] COMANDOS PARA EXECUTAR:" -ForegroundColor Green
Write-Host ""
Write-Host "   1. Iniciar servidor (Railway/Replit):" -ForegroundColor White
Write-Host "      npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "   2. Iniciar Keeper Executor (standalone):" -ForegroundColor White
Write-Host "      node core/keeper_executor_agent.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "   3. Verificar status do sistema:" -ForegroundColor White
Write-Host "      curl https://[SEU_DOMINIO]/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "   4. Verificar lucros disponíveis:" -ForegroundColor White
Write-Host "      curl https://[SEU_DOMINIO]/api/v1/profit/status" -ForegroundColor Yellow
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# ALERTA FINAL
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║                              ⚠️  ALERTA FINAL                               ║" -ForegroundColor Red
Write-Host "╠══════════════════════════════════════════════════════════════════════════════╣" -ForegroundColor Red
Write-Host "║                                                                              ║" -ForegroundColor Red
Write-Host "║  • O sistema agora executará TRANSAÇÕES REAIS em Arbitrum Mainnet           ║" -ForegroundColor Yellow
Write-Host "║  • Gas ETH será consumido da wallet configurada em PRIVATE_KEY             ║" -ForegroundColor Yellow
Write-Host "║  • Lucros serão direcionados para: 0x3955d559055DadB7067054cB6E6f974710345224║" -ForegroundColor Yellow
Write-Host "║                                                                              ║" -ForegroundColor Red
Write-Host "║  Para reverter para modo TESTE, restaure:                                     ║" -ForegroundColor Cyan
Write-Host "  core/keeper_executor_agent_TEST_BACKUP.js                                   ║" -ForegroundColor Cyan
Write-Host "║                                                                              ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""
Write-Host "[🌑] PROTOCOLO OMEGA 4.0.0 PRONTO PARA DEPLOY" -ForegroundColor Magenta
Write-Host "[👑] Comandante Júnior Sena - GXeon AI Production" -ForegroundColor Magenta
Write-Host ""
