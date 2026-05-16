#!/usr/bin/env powershell
# ═══════════════════════════════════════════════════════════════════════════
# GXEON SYNC - EXECUÇÃO AUTOMÁTICA v11
# General Júnior Sena - Última Geração Ativada
# ═══════════════════════════════════════════════════════════════════════════

$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbHh2cGhncnN2c254dm1qa2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNjMzMSwiZXhwIjoyMDkwMTAyMzMxfQ.297P1WLrSDqiRWtyUk5OuLoLvAU99zy53_HodleZQkA"
$env:GRAFANA_CLOUD_TOKEN = "glc_eyJvIjoiMTczNjgwNCIsIm4iOiJwZGMtZ3hlb25haS1kZWZhdWx0LWd4emVvbiIsImsiOiIyc2FYN3V6RjRpN2kxazd6UjRvTjQ1aDAiLCJtIjp7InIiOiJwcm9kLXNhLWVhc3QtMSJ9fQ"
$env:GRAFANA_INSTANCE_ID = "ddefb2f3-adc1-4edb-9324-ea05979238f6"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🌑 GXEON SYNC - ÚLTIMA GERAÇÃO ATIVADA                 ║" -ForegroundColor Cyan
Write-Host "║              General Júnior Sena                              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "[⚡] Credenciais carregadas automaticamente" -ForegroundColor Green
Write-Host "[🔑] Supabase Key: $($env:SUPABASE_SERVICE_ROLE_KEY.Substring(0,20))..." -ForegroundColor Yellow
Write-Host "[📡] Grafana Instance: $env:GRAFANA_INSTANCE_ID" -ForegroundColor Yellow
Write-Host ""

npm run grafana:connect
