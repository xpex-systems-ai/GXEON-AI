# ═══════════════════════════════════════════════════════════════════════════════
# GXEON LIGHTHOUSE SIGNAL STATION — Launch Script v3.0
# ═══════════════════════════════════════════════════════════════════════════════
# M2M Alpha Broadcast — Zero-Gas Architecture
# 
# Inicia toda a stack de signal provision:
# 1. FastAPI Signal Server (Python)
# 2. Radar SHIX (Node.js) — conecta via WebSocket
# 3. Ngrok Tunnel (opcional) — exposição pública
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$WithNgrok,
    [switch]$WithCloudflare,
    [switch]$RadarOnly,
    [switch]$ServerOnly,
    [int]$SignalServerPort = 8765
)

$ErrorActionPreference = "Stop"

# Cores para output (compatível PowerShell 5.1+)
$Green = "GREEN"
$Yellow = "YELLOW"  
$Red = "RED"
$Blue = "BLUE"
$Reset = "RESET"

function Write-ColorText {
    param([string]$Text, [string]$Color = "WHITE")
    switch ($Color) {
        "GREEN" { Write-Host $Text -ForegroundColor Green }
        "YELLOW" { Write-Host $Text -ForegroundColor Yellow }
        "RED" { Write-Host $Text -ForegroundColor Red }
        "BLUE" { Write-Host $Text -ForegroundColor Cyan }
        default { Write-Host $Text }
    }
}

function Write-Banner {
    param([string]$Text, [string]$Color = "GREEN")
    $width = 70
    $padding = [math]::Max(0, ($width - $Text.Length) / 2)
    $leftPad = " " * [math]::Floor($padding)
    $rightPad = " " * [math]::Ceiling($padding)
    
    $line1 = "+" + ("=" * $width) + "+"
    $line2 = "|" + $leftPad + $Text + $rightPad + "|"
    $line3 = "+" + ("=" * $width) + "+"
    
    Write-ColorText $line1 $Color
    Write-ColorText $line2 $Color
    Write-ColorText $line3 $Color
}

function Write-Step {
    param([string]$Message, [string]$Status = "INFO")
    $color = switch ($Status) {
        "OK" { "GREEN" }
        "WARN" { "YELLOW" }
        "ERROR" { "RED" }
        default { "BLUE" }
    }
    $prefix = switch ($Status) {
        "OK" { "[OK]" }
        "WARN" { "[WARN]" }
        "ERROR" { "[ERROR]" }
        default { "[INFO]" }
    }
    Write-ColorText "$prefix $Message" $color
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

Clear-Host
Write-Banner "GXEON LIGHTHOUSE SIGNAL STATION v3.0" "BLUE"
Write-ColorText "Protocol: M2M_ALPHA_BROADCAST | Gas: STRICT_ZERO_ETH" "YELLOW"
Write-ColorText "Beneficiary: 0x3955d559055DadB7067054cB6E6f974710345224" "YELLOW"
Write-Host ""

# Verifica dependências
Write-Step "Verificando dependências..."

# Python
$pythonOk = $null -ne (Get-Command python -ErrorAction SilentlyContinue)
if (-not $pythonOk) {
    Write-Step "Python não encontrado!" "ERROR"
    exit 1
}
Write-Step "Python OK" "OK"

# Node.js
$nodeOk = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
if (-not $nodeOk) {
    Write-Step "Node.js não encontrado!" "ERROR"
    exit 1
}
Write-Step "Node.js OK" "OK"

# Verifica .env
if (-not (Test-Path .env)) {
    Write-Step "Arquivo .env não encontrado!" "WARN"
    Write-Host "Crie .env baseado em .env.example"
}

# Cria diretório de logs
New-Item -ItemType Directory -Force -Path logs | Out-Null

# ═══════════════════════════════════════════════════════════════════════════════
# INICIA SIGNAL SERVER (FastAPI)
# ═══════════════════════════════════════════════════════════════════════════════

if (-not $RadarOnly) {
    Write-Host ""
    Write-Banner "INICIANDO SIGNAL SERVER" "GREEN"
    
    # Instala dependências Python se necessário
    Write-Step "Verificando dependências Python..."
    
    $pipList = python -m pip list 2>$null
    if ($pipList -notmatch "fastapi") {
        Write-Step "Instalando FastAPI..."
        python -m pip install fastapi uvicorn websockets -q
    }
    if ($pipList -notmatch "supabase") {
        Write-Step "Instalando Supabase..."
        python -m pip install supabase -q
    }
    
    Write-Step "Dependências Python OK" "OK"
    
    # Inicia Signal Server em background
    Write-Step "Iniciando Signal Server na porta $SignalServerPort..."
    
    $signalServerJob = Start-Job -ScriptBlock {
        param($Port, $WorkingDir)
        Set-Location $WorkingDir
        $env:PYTHONUNBUFFERED = "1"
        python server/services/signalServer.py 2>&1
    } -ArgumentList $SignalServerPort, (Get-Location)
    
    # Aguarda startup
    Write-Host "Aguardando Signal Server iniciar..."
    Start-Sleep -Seconds 3
    
    # Verifica se está rodando
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$SignalServerPort/health" -TimeoutSec 5
        Write-Step "Signal Server operacional!" "OK"
        Write-Step "Health: $($response.status) | Connections: $($response.active_connections)"
    }
    catch {
        Write-Step "Signal Server pode estar iniciando (aguardando)..." "WARN"
    }
    
    Write-Step "Endpoints:" "INFO"
    Write-Host "  WebSocket Signals: ws://localhost:$SignalServerPort/ws/signals"
    Write-Host "  Radar Input:       ws://localhost:$SignalServerPort/ws/radar"
    Write-Host "  Metrics:           http://localhost:$SignalServerPort/metrics"
    Write-Host "  Health:            http://localhost:$SignalServerPort/health"
}

# ═══════════════════════════════════════════════════════════════════════════════
# INICIA RADAR SHIX
# ═══════════════════════════════════════════════════════════════════════════════

if (-not $ServerOnly) {
    Write-Host ""
    Write-Banner "INICIANDO RADAR SHIX" "GREEN"
    
    Write-Step "Iniciando Radar SHIX em modo Signal Provider..."
    
    # Configura variáveis de ambiente
    $env:SIGNAL_SERVER_URL = "ws://localhost:$SignalServerPort/ws/radar"
    $env:SIGNAL_MODE = "broadcast"
    
    # Inicia Radar
    node server/services/radarShix.js start
}

# ═══════════════════════════════════════════════════════════════════════════════
# INICIA NGROK (opcional)
# ═══════════════════════════════════════════════════════════════════════════════

if ($WithNgrok) {
    Write-Host ""
    Write-Banner "INICIANDO NGROK TUNNEL" "YELLOW"
    
    $ngrokOk = $null -ne (Get-Command ngrok -ErrorAction SilentlyContinue)
    if (-not $ngrokOk) {
        Write-Step "ngrok não encontrado!" "ERROR"
        Write-Host "Instale: https://ngrok.com/download"
        Write-Host "Autentique: ngrok config add-authtoken YOUR_TOKEN"
    }
    else {
        Write-Step "Iniciando ngrok tunnel..."
        Start-Process ngrok -ArgumentList "start", "--all", "--config", "config/ngrok.yml" -WindowStyle Normal
        
        Write-Step "Aguardando URL pública (10s)..."
        Start-Sleep -Seconds 10
        
        # Tenta obter URL do ngrok API
        try {
            $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5
            foreach ($tunnel in $tunnels.tunnels) {
                Write-Step "Tunnel ativo: $($tunnel.public_url)" "OK"
            }
        }
        catch {
            Write-Step "Verifique o ngrok manualmente em http://localhost:4040" "WARN"
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# MONITORING
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Banner "SIGNAL STATION OPERACIONAL" "GREEN"
Write-Host ""
Write-ColorText "[OK] Zero-Gas Architecture Active" "GREEN"
Write-ColorText "[OK] M2M Alpha Broadcast Ready" "GREEN"
Write-ColorText "[OK] Billing Layer Configured" "GREEN"
Write-Host ""
Write-ColorText "Pressione Ctrl+C para parar todos os servicos" "YELLOW"

# Loop de monitoramento
try {
    while ($true) {
        Start-Sleep -Seconds 30
        
        # Mostra métricas
        try {
            $metrics = Invoke-RestMethod -Uri "http://localhost:$SignalServerPort/metrics" -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($metrics) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] " -NoNewline
                Write-Host "Sinais: $($metrics.total_signals_broadcast) | " -NoNewline
                Write-Host "Clientes: $($metrics.active_connections) | " -NoNewline
                Write-Host "Lucro Potencial: `$($($metrics.potential_profit_broadcast).ToString('F2'))" -ForegroundColor Green
            }
        }
        catch {
            # Silencioso
        }
    }
}
finally {
    Write-Host ""
    Write-Banner "PARANDO SERVICOS" "RED"
    
    if ($signalServerJob) {
        Stop-Job $signalServerJob -ErrorAction SilentlyContinue
        Remove-Job $signalServerJob -ErrorAction SilentlyContinue
        Write-Step "Signal Server parado"
    }
    
    Write-Step "Limpeza concluida"
}
