# ARCHITECT_REPORT_V6 — Backend-to-Frontend Mirroring
## GXEON AI Core Deep Reconnaissance
**Data:** 20/04/2026 | **Auditor:** Cascade AI | **Sistema:** GXeon AI Core v2.0-Sovereign

---

## 1. EXECUTIVE SUMMARY

### 1.1 System Architecture Overview
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND MIRROR TARGET                           │
│                    (Dashboard/UI Control Plane)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ RADAR        │ │ SWARM        │ │ FLASH        │ │ PROFIT       │   │
│  │ Control      │ │ Control      │ │ Sweeper      │ │ Claim        │   │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘   │
│         │                │                │                │          │
└─────────┼────────────────┼────────────────┼────────────────┼──────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND API GATEWAY (Express)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Middleware Stack:                                               │  │
│  │  • gxeonEnforcer (Billing/Auth)  • rateLimiter (Tier-based)       │  │
│  │  • gxeonAuthOnly (Key validation) • operationLimiter (Ops-based)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ /api/v1/    │ │ /api/v1/    │ │ /api/v1/    │ │ /api/v1/    │       │
│  │ radar       │ │ swarm       │ │ profit      │ │ sovereign-  │       │
│  │             │ │             │ │             │ │ data        │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ /api/task-  │ │ /api/       │ │ /api/       │ │ /api/config │       │
│  │ engine      │ │ agents      │ │ onchain     │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER (State Management)                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ radarShix    │ │ SwarmController│ │ FlashSweeper │ │ sovereignOracle│  │
│  │ (Singleton)  │ │ (Singleton)  │ │ (Singleton)  │ │ (Class)      │   │
│  │              │ │              │ │              │ │              │   │
│  │ State:       │ │ State:       │ │ State:       │ │ State:       │   │
│  │ • isRunning  │ │ • isRunning  │ │ • isRunning  │ │ • isConnected│   │
│  │ • blockCount │ │ • roiMetrics │ │ • execStats  │ │ • rateLimit  │   │
│  │ • telemetry  │ │ • agentPool  │ │ • poolPrices │ │ • provider   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATA LAYER                               │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐        │
│  │radar_liquidity│  swarm_cycles │ flash_sweeper│  gxeon_users │        │
│  │_pools        │               │ _executions  │              │        │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤        │
│  │radar_smart   │  rapidapi_    │ gari_dust_   │  payments    │        │
│  │_money_flows  │  conversions  │ opportunities│              │        │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤        │
│  │radar_liquidity│  swarm_errors │  external_   │  tasks       │        │
│  │_telemetry    │               │  tasks       │              │        │
│  └──────────────┴──────────────┴──────────────┴──────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. LOGIC MAPPING — Exported Functions Accepting Inputs

### 2.1 Radar Shix Service (`@/server/services/radarShix.js`)

| Função Exportada | Parâmetros de Entrada | Retorno | Controle Frontend |
|-------------------|----------------------|---------|-------------------|
| `radarShixService.start()` | Nenhum | `Promise<boolean>` | Botão START RADAR |
| `radarShixService.stop()` | Nenhum | `void` | Botão STOP RADAR |
| `radarShixService.triggerScan()` | Nenhum | `Promise<{success, status}>` | Botão SCAN NOW |
| `radarShixService.getOpportunities(limit)` | `limit: number (default 20)` | `Promise<Pool[]>` | Lista de oportunidades |
| `radarShixService.getStatus()` | Nenhum | `{isRunning, blockCount, opportunitiesFound, uptimeSeconds, trackedPools, smartMoneyConnected, scanIntervalMs}` | Status dashboard |
| `radarShixService.isActive()` | Nenhum | `boolean` | Indicador online/offline |
| `radarShixService.getUptime()` | Nenhum | `number (segundos)` | Display uptime |

**WebSocket Signal Provider (M2M Alpha Broadcast):**
```javascript
// SignalProviderClient — transmissão em tempo real
class SignalProviderClient {
  connect()                           // Inicia conexão WebSocket
  sendSignal(signalPacket)            // Envia sinal de oportunidade
  getStatus()                         // Status da conexão
}
```

### 2.2 Flash Sweeper Service (`@/server/services/flashSweeper.js`)

| Função Exportada | Parâmetros | Retorno | Controle Frontend |
|-------------------|-----------|---------|-------------------|
| `flashSweeper.start()` | Nenhum | `Promise<void>` | Botão START SWEEPER |
| `flashSweeper.stop()` | Nenhum | `Promise<void>` | Botão STOP SWEEPER |
| `flashSweeper.getStats()` | Nenhum | `{opportunitiesFound, simulationsRun, executionsAttempted, executionsSucceeded, totalProfitUsd, totalGasCost, queueLength, isRunning, lastBlock, poolsMonitored}` | Dashboard métricas |

**Configuração via Environment (input indireto):**
```javascript
FLASH_SWEEPER_CONFIG = {
  MIN_PROFIT_THRESHOLD_USD: process.env.MIN_PROFIT_USD || 5,     // Input: threshold
  MAX_GAS_PRICE_GWEI: 0.1,                                       // Input: max gas
  SIMULATION_MODE: process.env.FLASH_SIMULATION_MODE === 'true',   // Input: modo
  EMERGENCY_STOP: process.env.EMERGENCY_KILL_SWITCH === 'ACTIVE'  // Input: kill switch
}
```

### 2.3 Swarm Controller (`@/server/agents/swarm_controller.js`)

| Função | Parâmetros | Retorno | Controle Frontend |
|--------|-----------|---------|-------------------|
| `initializeSwarm(config)` | `{executionInterval, maxConcurrentAgents, profitThreshold, autoStart}` | `Promise<SwarmController>` | Configuração inicial |
| `start()` | Nenhum | `void` | Botão START SWARM |
| `stop()` | Nenhum | `void` | Botão STOP SWARM |
| `executeCycle()` | Nenhum | `Promise<void>` | Botão EXECUTE CYCLE |
| `forceExecution()` | Nenhum | `Promise<boolean>` | Botão FORCE EXECUTE |
| `getStatus()` | Nenhum | `{isRunning, executionCount, lastExecution, roi, scouter, infiltrator}` | Dashboard swarm |
| `updateConfig(newConfig)` | `{executionInterval, maxConcurrentAgents, profitThreshold}` | `void` | Form config |

### 2.4 Task Engine (`@/core/task_engine.js`)

| Função | Parâmetros | Retorno | Controle Frontend |
|--------|-----------|---------|-------------------|
| `taskEngine.start()` | Nenhum | `void` | Botão START ENGINE |
| `taskEngine.stop()` | Nenhum | `void` | Botão STOP ENGINE |
| `taskEngine.runPipeline()` | Nenhum | `Promise<{success, error}>` | Botão RUN ONCE |
| `taskEngine.getStats()` | Nenhum | `Promise<{agents, stats}>` | Dashboard tasks |
| `taskEngine.startWatchdog()` | Nenhum | `void` | Toggle watchdog |
| `taskEngine.stopWatchdog()` | Nenhum | `void` | Toggle watchdog |
| `taskEngine.getWatchdogStatus()` | Nenhum | `{running, health, stats}` | Status watchdog |

---

## 3. DATA ENDPOINTS — RADAR Real-time Signal Transmission

### 3.1 REST API Endpoints (Polling)

| Método | Endpoint | Autenticação | Custo (créditos) | Dados Retornados |
|--------|----------|--------------|------------------|------------------|
| GET | `/api/v1/radar/opportunities` | `x-gxeon-key` | 0.05 | Top 20 oportunidades de liquidez |
| GET | `/api/v1/radar/status` | `x-gxeon-key` | 0.05 | Status do serviço RADAR |
| POST | `/api/v1/radar/scan` | `x-gxeon-key` | 0.05 | Trigger scan manual |

### 3.2 WebSocket Real-time (M2M Alpha Broadcast)

```javascript
// Signal Server WebSocket URL
const SIGNAL_SERVER_URL = process.env.SIGNAL_SERVER_URL || 'ws://localhost:8765/ws/radar'

// Estrutura do Signal Packet transmitido:
{
  signal_id: "sig-0x7a2f...-timestamp",
  timestamp: "2026-04-20T12:00:00Z",
  source: "RADAR_SHIX",
  opportunity_type: "NEW_HIGH_LIQUIDITY_POOL",
  chain: "arbitrum",
  dex: "uniswap_v3",
  pool_address: "0x...",
  token_a: { address: "0x...", symbol: "WETH" },
  token_b: { address: "0x...", symbol: "USDC" },
  liquidity_usd: 150000,
  volume_24h: 50000,
  estimated_profit_usd: 12.50,
  confidence_score: 0.85,
  priority: "critical|high|normal|low",
  ttl_seconds: 300,
  beneficiary: "0x3955d559055DadB7067054cB6E6f974710345224"
}
```

### 3.3 Supabase Real-time (PostgreSQL LISTEN/NOTIFY)

**Tabelas com Change Data Capture:**
```sql
-- radar_liquidity_pools — nova pool detectada
-- radar_smart_money_flows — whale movement detectado
-- flash_sweeper_executions — execução completada
-- swarm_cycles — ciclo do swarm completado
```

**Frontend Subscription Pattern:**
```javascript
const subscription = supabase
  .from('radar_liquidity_pools')
  .on('INSERT', handleNewPool)
  .subscribe()
```

### 3.4 Alchemy WebSocket (Blockchain Events)

```javascript
// Provider Factory com failover automático
const providerFactory = new ProviderFactory([
  process.env.ALCHEMY_WSS_URL_PRIMARY,
  process.env.ALCHEMY_WSS_URL_BACKUP,
  `wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  'wss://arb1.arbitrum.io/ws' // fallback público
])

// Eventos monitorados:
// • 'block' — novo bloco na Arbitrum (~1s)
// • 'pending' — transação pendente no mempool
```

---

## 4. STATE MANAGEMENT — Status Storage & Mirroring

### 4.1 In-Memory State (Runtime)

| Serviço | Variável de Estado | Tipo | Frontend Mirror |
|---------|-------------------|------|-----------------|
| RadarShix | `isRunning` | `boolean` | Indicador online |
| RadarShix | `blockCount` | `number` | Contador de blocos |
| RadarShix | `opportunitiesFound` | `number` | Total pools |
| RadarShix | `telemetry` | `Object` | Gráficos real-time |
| SwarmController | `isRunning` | `boolean` | Status swarm |
| SwarmController | `roiMetrics` | `Object` | ROI dashboard |
| SwarmController | `executionCount` | `number` | Ciclos executados |
| FlashSweeper | `isRunning` | `boolean` | Status sweeper |
| FlashSweeper | `executionStats` | `Object` | Métricas de execução |
| FlashSweeper | `opportunityQueue` | `Array` | Fila de oportunidades |

### 4.2 Persistent State (Supabase)

| Tabela | Colunas de Estado | Propósito |
|--------|-------------------|-----------|
| `radar_liquidity_heartbeat` | `status, uptime_seconds, block_count, total_pools_detected, total_smart_money_events, high_liquidity_alerts` | Telemetria do RADAR |
| `radar_liquidity_pools` | `status, alert_triggered, detected_at` | Estado das pools |
| `swarm_cycles` | `roi_metrics, scan_results, outreach_results` | Histórico de execução |
| `flash_sweeper_executions` | `success, gas_used, estimated_profit` | Histórico de execução |
| `gxeon_users` | `tier, balance_credits, daily_calls_count` | Estado do usuário |

### 4.3 State Mirroring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MIRROR FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Backend State                                              │
│  ┌──────────────┐                                           │
│  │ Service      │──┐                                        │
│  │ (in-memory)  │  │                                        │
│  └──────────────┘  │  ┌──────────────┐  ┌──────────────┐   │
│                    ├──│ Supabase     │──│ PostgreSQL   │   │
│                    │  │ (persistent) │  │ (source of   │   │
│  ┌──────────────┐  │  └──────────────┘  │  truth)      │   │
│  │ WebSocket    │──┘                    └──────────────┘   │
│  │ (real-time)  │                                         │
│  └──────────────┘                                         │
│         │                                                   │
│         │ Real-time Broadcast                               │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────┐          │
│  │              FRONTEND MIRROR                  │          │
│  ├──────────────────────────────────────────────┤          │
│  │  • React/Vue State Management (Pinia/Redux)   │          │
│  │  • WebSocket Client (real-time updates)      │          │
│  │  • Supabase Realtime Subscriptions             │          │
│  │  • Local Cache (service workers)               │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. SECURITY AUDIT — Replit ↔ Supabase Communication Integrity

### 5.1 Authentication Layer

| Camada | Mecanismo | Implementação |
|--------|-----------|---------------|
| API Key | Header `x-gxeon-key` | `@/server/middleware/gxeonEnforcer.js` |
| Auth Only | Validação de chave | `@/server/middleware/gxeonEnforcer.js:125-177` |
| Rate Limit | Tier-based limiting | `@/server/middleware/rateLimiter.js:78-102` |
| Billing | Atomic credit deduction | Supabase RPC `deduct_credits_atomic` |

### 5.2 Credit Deduct Flow (Secure)

```javascript
// @/server/middleware/gxeonEnforcer.js:44-119
const gxeonEnforcer = (costConfig) => async (req, res, next) => {
  const apiKey = req.headers['x-gxeon-key'];
  
  // 1. Valida presença da chave
  if (!apiKey) return res.status(401).json({error: "GXEON_AUTH_REQUIRED"});
  
  // 2. Calcula custo da operação
  const operationCost = determineCost(req.path, costConfig);
  
  // 3. Dedução atômica via Supabase RPC
  const { data, error } = await supabase
    .rpc('deduct_credits_atomic', {
      p_api_key: apiKey,
      p_amount: operationCost,
      p_operation: req.path,
      p_request_id: req.id
    });
  
  // 4. Fallback para PostgreSQL direto se PostgREST falhar
  if (error?.message?.includes('schema cache')) {
    deductionResult = await deductCreditsAtomicDirect(apiKey, operationCost, ...);
  }
  
  // 5. Anexa billing info ao request
  req.billing = { operation, cost, remaining_balance, transaction_id };
  
  // 6. Intercepta resposta para refund em caso de erro
  res.json = function(data) {
    if (data?.error || data?.success === false) {
      supabase.rpc('refund_credits', { p_transaction_id, p_reason });
    }
    return originalJson(data);
  };
}
```

### 5.3 Database Connection Security

```javascript
// @/server/services/supabase.js
const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const SOVEREIGN_TOKEN = 'eyJhbGciOiJIUzI1NiIs...'; // Fallback JWT (emergency only)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SOVEREIGN_TOKEN;

// Security Assessment:
// ⚠️ SOVEREIGN_TOKEN é hardcoded — RISCO: token exposto no código
// ✅ Prioridade dada a variáveis de ambiente
// ✅ Service Role Key (não anon key) — acesso total ao banco
```

### 5.4 Rate Limiting Tiers

```javascript
// @/server/middleware/rateLimiter.js:58-65
const TIER_LIMITS = {
  free:       { windowMs: 15*60*1000, max: 10 },    // 10/15min
  basic:      { windowMs: 15*60*1000, max: 100 },   // 100/15min
  pro:        { windowMs: 15*60*1000, max: 500 },  // 500/15min
  enterprise: { windowMs: 15*60*1000, max: 2000 }, // 2000/15min
  internal:   { windowMs: 15*60*1000, max: 5000 }, // 5000/15min
  unlimited:  { windowMs: 15*60*1000, max: 999999 }
};

const OPERATION_LIMITS = {
  onchain: { windowMs: 60*60*1000, max: 10 },  // 10/hora
  llm:     { windowMs: 60*1000, max: 30 },     // 30/min
  agent:   { windowMs: 60*1000, max: 60 },     // 60/min
  radar:   { windowMs: 5*60*1000, max: 1 }     // 1/5min
};
```

### 5.5 WebSocket Error Handling (GXEON_SHIELD)

```javascript
// @/server/index.js:8-113 — Global Error Handlers
process.on('uncaughtException', (err) => {
  // Protocolo 429: NUNCA crasha em rate limit ou WebSocket
  if (errorMsg.includes('429') || 
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('ECONNRESET')) {
    console.log('[GXEON_SHIELD] Network error captured - SERVER CONTINUES ALIVE');
    return; // NÃO propaga erro
  }
});

// @/server/services/radarShix.js:133-168 — Provider Factory
class ProviderFactory {
  // Circuit breaker automático para rate limit 429
  handle429Error() {
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    this.retryCount++;
    if (this.retryCount < this.maxRetries) {
      setTimeout(() => this.createProvider(), this.cooldownMs);
    }
  }
}
```

### 5.6 Security Vulnerabilities Identified

| Severidade | Issue | Localização | Mitigação Recomendada |
|------------|-------|-------------|----------------------|
| 🔴 **HIGH** | SOVEREIGN_TOKEN hardcoded | `supabase.js:8` | Mover para env var obrigatória, remover fallback |
| 🟡 **MEDIUM** | API Key exposta em logs potencial | `gxeonEnforcer.js:55-60` | Sanitizar logs, nunca logar chave completa |
| 🟡 **MEDIUM** | CORS ultra-permissivo | `index.js:125-130` | Restringir origins em produção |
| 🟢 **LOW** | Rate limit em memória (não Redis) | `rateLimiter.js:136-148` | Implementar Redis para multi-instance |

---

## 6. FRONTIER MIRROR PLAN — Visual Components Required

### 6.1 RADAR Dashboard Components

```typescript
// Componentes necessários para espelhamento do RADAR

interface RadarControlPanelProps {
  isRunning: boolean;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onTriggerScan: () => Promise<void>;
}

// 1. RADAR_STATUS_WIDGET
// Exibe: isRunning, uptimeSeconds, blockCount, smartMoneyConnected
// Ações: start(), stop()

// 2. OPPORTUNITIES_FEED
// Exibe: Lista de pools (getOpportunities)
// Dados: pool_address, token symbols, liquidity_usd, confidence_score
// Real-time: WebSocket subscription

// 3. TELEMETRY_CHARTS
// Exibe: scansPerSecond, opportunitiesFound (histórico)
// Fonte: radar_liquidity_telemetry

// 4. SMART_MONEY_ALERTS
// Exibe: Transferências > 5 ETH (radar_smart_money_flows)
// Alertas: WHALE (>100k USD) com som/visual
```

### 6.2 Flash Sweeper Control Panel

```typescript
interface FlashSweeperControls {
  // Inputs mutáveis via environment/config API
  minProfitThreshold: number;      // Input: MIN_PROFIT_USD
  maxGasPriceGwei: number;          // Input: MAX_GAS_PRICE
  simulationMode: boolean;           // Input: SIMULATION_MODE
  emergencyStop: boolean;            // Input: EMERGENCY_KILL_SWITCH
  
  // Botões
  onStart: () => void;               // flashSweeper.start()
  onStop: () => void;                // flashSweeper.stop()
  
  // Display
  stats: {
    opportunitiesFound: number;
    executionsSucceeded: number;
    totalProfitUsd: number;
    queueLength: number;
  };
}
```

### 6.3 Swarm M2M Command Center

```typescript
interface SwarmCommandCenter {
  // Configurações ajustáveis
  executionInterval: number;         // ms entre ciclos (updateConfig)
  maxConcurrentAgents: number;       // Capacidade do swarm
  profitThreshold: number;            // ROI mínimo para otimização
  
  // Estado
  isRunning: boolean;
  executionCount: number;
  roi: {
    totalRevenue: number;
    conversions: number;
    roi: number;                       // múltiplo
    cac: number;                       // Customer Acquisition Cost
    ltv: number;                       // Lifetime Value
  };
  
  // Ações
  startSwarm: () => void;
  stopSwarm: () => void;
  forceCycle: () => void;              // forceExecution()
  updateConfig: (config: Partial<Config>) => void;
}
```

### 6.4 Task Engine Operations Room

```typescript
interface TaskEngineOperations {
  // Controles
  isRunning: boolean;
  watchdogRunning: boolean;
  
  // Pipeline
  onStart: () => void;
  onStop: () => void;
  onRunOnce: () => void;              // runPipeline()
  onToggleWatchdog: (enabled: boolean) => void;
  
  // Visualização
  stats: {
    tasksCaptured: number;
    tasksExecuting: number;
    tasksCompleted: number;
    tasksFailed: number;
  };
  
  // Lista de tabelas Supabase para monitoramento
  tables: [
    'external_tasks',
    'task_dashboard',
    'swarm_cycles'
  ];
}
```

### 6.5 Profit Claim Interface

```typescript
interface ProfitClaimInterface {
  // Dados do vault
  vaultBalance: number;               // /api/v1/profit/status
  availableProfit: number;           // 30% para commander
  gasEstimate: number;
  canClaim: boolean;                 // profit > 5x gas
  
  // Ações
  onClaim: (amount?: number) => void;  // claim() — 0 = all
  onEstimate: () => Promise<Estimate>;   // estimate endpoint
  
  // Histórico
  history: ProfitClaim[];             // /api/v1/profit/history
}
```

---

## 7. API ROUTE SUMMARY (Billing-Enabled)

| Rota | Método | Middleware | Custo | Propósito |
|------|--------|-----------|-------|-----------|
| `/health` | GET | — | Free | Railway healthcheck |
| `/api/health` | GET | — | Free | System status |
| `/api/v1/radar/opportunities` | GET | gxeonEnforcer | 0.05 | Lista oportunidades |
| `/api/v1/radar/status` | GET | gxeonEnforcer | 0.05 | Status RADAR |
| `/api/v1/radar/scan` | POST | gxeonEnforcer | 0.05 | Trigger scan |
| `/api/v1/swarm/status` | GET | gxeonAuthOnly | Free | Status swarm |
| `/api/v1/swarm/start` | POST | gxeonAuthOnly | Free | Inicia swarm |
| `/api/v1/swarm/stop` | POST | gxeonAuthOnly | Free | Para swarm |
| `/api/v1/swarm/config` | POST | gxeonAuthOnly | Free | Atualiza config |
| `/api/v1/profit/status` | GET | gxeonAuthOnly | Free | Status lucro |
| `/api/v1/profit/claim` | POST | gxeonAuthOnly | Free | Saca lucro |
| `/api/v1/profit/estimate` | POST | gxeonAuthOnly | Free | Estima gas/profit |
| `/api/task-engine/start` | POST | gxeonEnforcer | 0.002 | Start engine |
| `/api/task-engine/stop` | POST | gxeonEnforcer | 0.002 | Stop engine |
| `/api/task-engine/run-once` | POST | gxeonEnforcer | 0.002 | Executa pipeline |
| `/api/agents/orchestrator` | POST | gxeonEnforcer | 0.01 | Orquestra agentes |
| `/chat` | POST | gxeonEnforcer | 0.001 | Chat LLM |
| `/api/huggingface` | POST | gxeonEnforcer | 0.001 | HuggingFace AI |
| `/api/deepseek` | POST | gxeonEnforcer | 0.002 | DeepSeek AI |
| `/api/grok` | POST | gxeonEnforcer | 0.004 | Grok AI |
| `/api/chatgpt` | POST | gxeonEnforcer | 0.0025 | ChatGPT |
| `/api/onchain` | POST | operationLimiter + gxeonEnforcer | 0.015 | Operações blockchain |

---

## 8. RECOMMENDATIONS

### 8.1 Immediate Actions (High Priority)

1. **Remover SOVEREIGN_TOKEN hardcoded** — Substituir por variável de ambiente obrigatória
2. **Implementar Redis para rate limiting** — Garantir consistência em múltiplas instâncias
3. **Adicionar input validation** — Sanitizar todos os inputs dos endpoints de config
4. **Habilitar HTTPS-only** — Forçar TLS em todas as comunicações Supabase

### 8.2 Frontend Integration Pattern

```typescript
// Recomendado: React/Vue com Supabase Realtime
import { createClient } from '@supabase/supabase-js'
import { useWebSocket } from './composables/useWebSocket'

// 1. Inicializa Supabase
const supabase = createClient(url, key)

// 2. Subscribe a mudanças em tempo real
supabase
  .from('radar_liquidity_pools')
  .on('INSERT', (payload) => {
    // Atualiza UI com nova pool
    opportunities.value.unshift(payload.new)
  })
  .subscribe()

// 3. WebSocket para sinais MEV
const { signals } = useWebSocket('wss://signal-server.gxeon.ai/ws/radar')
```

---

## 9. APPENDIX: File Locations

| Componente | Arquivo Principal | Linhas Chave |
|------------|-------------------|--------------|
| Server Entry | `@/server/index.js` | 1-438 |
| Radar Service | `@/server/services/radarShix.js` | 1-1507 |
| Flash Sweeper | `@/server/services/flashSweeper.js` | 1-705 |
| Swarm Controller | `@/server/agents/swarm_controller.js` | 1-392 |
| Swarm Index | `@/server/agents/index.js` | 1-92 |
| Task Engine | `@/core/task_engine.js` | 1-843 |
| GXEON Enforcer | `@/server/middleware/gxeonEnforcer.js` | 1-241 |
| Rate Limiter | `@/server/middleware/rateLimiter.js` | 1-213 |
| Supabase Client | `@/server/services/supabase.js` | 1-23 |
| Radar Routes | `@/server/routes/radar.js` | 1-103 |
| Swarm Routes | `@/server/routes/swarm.js` | 1-164 |
| Profit Routes | `@/server/routes/profit.js` | 1-296 |
| Task Engine Routes | `@/server/routes/task_engine.js` | 1-747 |
| Config Routes | `@/server/routes/config.js` | 1-154 |
| Sovereign Data | `@/server/routes/sovereign-data.js` | 1-260 |
| Edge Functions | `@/server/edge-functions.js` | 1-319 |
| GXEON Config | `@/gxeon.config.js` | 1-159 |

---

**End of Report**
**Classification:** INTERNAL — Backend Architecture
**Version:** ARCHITECT_REPORT_V6
**Generated by:** Cascade AI Code Analysis
