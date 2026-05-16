#!/usr/bin/env powershell
# GXEON APEX-TITAN v12 - CAÇA DE QUINTA GERAÇÃO
# CORRIGIDO - Sem emojis problematicos

$ErrorActionPreference = "Stop"

Write-Host "=== GXEON APEX-TITAN v12 - DEPLOYMENT ===" -ForegroundColor Cyan
Write-Host ""

# Credenciais via env vars
$env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$env:GRAFANA_CLOUD_TOKEN = $env:GRAFANA_CLOUD_TOKEN

# URL CORRETA DO GRAFANA (verifique no seu dashboard)
Write-Host "Qual sua URL do Grafana Cloud?" -ForegroundColor Yellow
Write-Host "Exemplo: pdc-gxeonai.grafana.net (SEM https://)" -ForegroundColor Gray
$grafanaUrl = Read-Host "Grafana URL"
$env:GRAFANA_INSTANCE_ID = $grafanaUrl.Replace("https://", "").Replace(".grafana.net", "")

# Senha do banco
$dbPassword = Read-Host "Senha do banco Supabase (postgres)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
$env:SUPABASE_DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Target: https://$env:GRAFANA_INSTANCE_ID.grafana.net" -ForegroundColor Green
Write-Host ""

# Executar
npm run grafana:apex

Write-Host ""
Write-Host "=== DEPLOYMENT CONCLUIDO ===" -ForegroundColor Cyan
