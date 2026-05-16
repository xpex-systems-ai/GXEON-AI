#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════════
# 🔥 PHOENIX-SENTINEL v22 — Railway Deploy Package Generator
# Cria ZIP pronto para upload no Railway (bypass GitHub push block)
# ═══════════════════════════════════════════════════════════════════════════

param(
    [string]$OutputPath = "..\phoenix-sentinel-v22-deploy.zip"
)

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔥 GXEON PHOENIX-SENTINEL v22 — Deploy Package Generator" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Diretório do script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")
$TempDir = Join-Path $env:TEMP "gxeon-deploy-$(Get-Random)"

Write-Host "📁 Source: $RootDir" -ForegroundColor Gray
Write-Host "📦 Output: $(Resolve-Path (Join-Path $RootDir $OutputPath) -ErrorAction SilentlyContinue)" -ForegroundColor Gray
Write-Host ""

# Criar diretório temporário
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Arquivos essenciais para deploy
$EssentialFiles = @(
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "railway.json",
    "server\index.js",
    "server\agents\sentinel_guardian.js",
    "core\multichain_parallel_processor.js",
    "core\sentinel_nexus_bridge.js",
    "gxeon.config.js",
    "README.md"
)

# Diretórios completos
$EssentialDirs = @(
    "server\routes",
    "server\services",
    "server\middleware",
    "server\database",
    "config",
    "contracts",
    "scripts"
)

Write-Host "📋 Copying essential files..." -ForegroundColor Yellow

# Copiar arquivos essenciais
foreach ($file in $EssentialFiles) {
    $source = Join-Path $RootDir $file
    $dest = Join-Path $TempDir $file
    if (Test-Path $source) {
        $dir = Split-Path -Parent $dest
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        Copy-Item -Path $source -Destination $dest -Force
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Missing: $file" -ForegroundColor DarkYellow
    }
}

# Copiar diretórios
Write-Host ""
Write-Host "📁 Copying directories..." -ForegroundColor Yellow

foreach ($dir in $EssentialDirs) {
    $source = Join-Path $RootDir $dir
    $dest = Join-Path $TempDir $dir
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Recurse -Force
        $fileCount = (Get-ChildItem -Path $dest -Recurse -File).Count
        Write-Host "  ✅ $dir ($fileCount files)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Missing: $dir" -ForegroundColor DarkYellow
    }
}

# Criar arquivo de instruções
$Instructions = @"
# 🔥 PHOENIX-SENTINEL v22 — Deploy Instructions

## Upload no Railway

1. Acesse: https://railway.app/dashboard
2. Selecione o projeto: gxeon-ia-production
3. Vá em: Deployments → Upload from ZIP
4. Selecione este arquivo ZIP
5. Aguarde o build (2-3 minutos)

## Configurar Variáveis de Ambiente

No Railway Dashboard, configure:

- SUPABASE_PROJECT_URL=https://your-project.supabase.co
- SUPABASE_SERVICE_ROLE_KEY=your-jwt-token
- ALCHEMY_API_KEY=your-alchemy-key
- PRIVATE_KEY=your-private-key
- COMMANDER_WALLET_ADDRESS=0x3955d559055DadB7067054cB6E6f974710345224

## Verificar Deploy

- Health Check: https://your-app.up.railway.app/api/health
- Status: https://your-app.up.railway.app/oracle/status

## 🔥 Phoenix-Sentinel v22 Features
- Node.js 22 Alpine
- Sentinel Guardian v1.0
- Auto-restart em falhas
- Monitoramento 24/7

Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
"@

$Instructions | Out-File -FilePath (Join-Path $TempDir "DEPLOY_INSTRUCTIONS.txt") -Encoding utf8

# Compactar
Write-Host ""
Write-Host "📦 Creating ZIP archive..." -ForegroundColor Yellow

$outputFullPath = Join-Path $RootDir $OutputPath
if (Test-Path $outputFullPath) {
    Remove-Item $outputFullPath -Force
}

Compress-Archive -Path "$TempDir\*" -DestinationPath $outputFullPath -Force

# Limpar temporários
Remove-Item $TempDir -Recurse -Force

# Estatísticas
$zipSize = (Get-Item $outputFullPath).Length / 1MB

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Deploy Package Created Successfully!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 File: $OutputPath" -ForegroundColor White
Write-Host "📊 Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "🔥 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Upload to Railway: https://railway.app/dashboard" -ForegroundColor Gray
Write-Host "   2. Or use Railway CLI: railway up" -ForegroundColor Gray
Write-Host "   3. Configure environment variables" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
