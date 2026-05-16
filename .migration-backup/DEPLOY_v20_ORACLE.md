# 🚀 GXEON SOVEREIGN ORACLE v20.0 — Deployment Guide

## Arquitetura: AUTONOMOUS_ORACLE_PROVIDER

### Componentes Criados

```
server/
├── services/
│   └── sovereignOracle.js      # Core Oracle Engine
├── middleware/
│   └── agentAuth.js            # X-Agent-Key Authentication
├── gateway/
│   └── a2aGateway.js           # WebSocket A2A Server
├── routes/
│   └── a2a.js                  # REST JSON-RPC Endpoints
├── index_v20.js                # Novo entry point
supabase/
└── a2a_agents_schema.sql       # Schema de agentes e billing
```

---

## 📋 Passos de Deploy

### 1. Instalar Dependência WebSocket

```bash
npm install ws
```

### 2. Executar Schema no Supabase

```bash
# No SQL Editor do Supabase, executar:
supabase/a2a_agents_schema.sql
```

### 3. Configurar Variáveis de Ambiente

```env
# .env ou Railway Variables
ALCHEMY_API_KEY=your_alchemy_key_here
AUTO_REGISTER_AGENTS=true
ORACLE_SALT=random_salt_for_agent_hashing
NODE_ENV=production

# Ports
PORT=8080
GATEWAY_PORT=8081
```

### 4. Atualizar Entry Point (Railway)

No `railway.json` ou Procfile:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server/index_v20.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Ou criar `Procfile`:
```
web: node server/index_v20.js
```

### 5. Deploy Railway

```bash
# Deploy via CLI
railway login
railway link
railway up

# Ou push para Git (auto-deploy)
git add .
git commit -m "GXEON v20.0 - Sovereign Oracle A2A"
git push origin main
```

---

## 🔌 Endpoints Disponíveis

### HTTP REST (JSON-RPC 2.0)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/a2a/health` | GET | Healthcheck |
| `/a2a/v1/liquidity/sniffer` | POST | Pools detectados (MEV-compatible) |
| `/a2a/v1/whale/telemetry` | POST | Sinais de smart money |
| `/a2a/v1/mempool/sniper` | POST | Status do mempool sniper |
| `/a2a/v1/agent/register` | POST | Registrar novo agente |
| `/a2a/v1/agent/status` | POST | Status do agente |
| `/a2a/v1/billing/stream` | POST | Config de micropagamentos |
| `/oracle/status` | GET | Status completo do oracle |
| `/oracle/telemetry` | GET | Métricas técnicas |

### WebSocket (Streaming Real-time)

```
ws://host:8081/a2a/v1/stream
```

Canais disponíveis:
- `liquidity_sniffer` — Novos pools e mudanças de liquidez
- `whale_telemetry` — Movimentações >10 ETH
- `mempool_sniper` — Transações pendentes (pre-confirmação)

---

## 🔐 Autenticação

### Header Obrigatório

```
X-Agent-Key: agt_<64_char_hex>
```

### Gerar Nova Chave (via API)

```bash
curl -X POST https://your-app.railway.app/a2a/v1/agent/register \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: agt_your_enterprise_key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "a2a.agent.register",
    "params": {
      "tier": "standard",
      "metadata": { "name": "MyTradingBot" }
    }
  }'
```

### Exemplo de Uso

```bash
curl -X POST https://your-app.railway.app/a2a/v1/liquidity/sniffer \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: agt_your_agent_key_here" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "a2a.liquidity.sniffer",
    "params": {
      "min_liquidity_usd": 50000,
      "dex_filter": "uniswap_v3",
      "limit": 20
    }
  }'
```

---

## 📊 WebSocket Client Example

```javascript
const ws = new WebSocket('ws://host:8081/a2a/v1/stream');

// Handshake
ws.onopen = () => {
  ws.send(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "agt_handshake",
    params: {
      agent_key: "agt_your_key_here",
      capabilities: ["liquidity_sniffer", "whale_telemetry"]
    }
  }));
};

// Subscribe
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  id: 2,
  method: "a2a.subscribe",
  params: {
    channels: ["liquidity_sniffer", "whale_telemetry"]
  }
}));

// Receive signals
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Signal:', data);
};
```

---

## 🎯 Arquitetura de Dados

### Latência Otimizada

```
Alchemy WS → Node.js → Async Batch Buffer → Supabase (500ms flush)
     ↓              ↓
     └→ WebSocket Broadcast (imediato)
```

| Componente | Latência |
|------------|----------|
| Alchemy → Node | ~50-100ms |
| Processamento | ~5-10ms |
| WebSocket Broadcast | ~1-5ms |
| Supabase Batch | ~80-150ms (async) |

---

## 💰 Billing (Micropagamentos)

### Modelo: Pay-Per-Signal

| Tipo de Sinal | Custo (USDC) |
|---------------|--------------|
| Liquidity Sniffer | $0.0005 |
| Whale Telemetry | $0.001 |
| Mempool Sniper | $0.002 |

### Streaming Setup (Superfluid/Sablier)

```bash
# Configurar streaming (placeholder - integração futura)
curl -X POST /a2a/v1/billing/stream \
  -H "X-Agent-Key: agt_..." \
  -d '{...}'
```

---

## 🔧 Troubleshooting

### WebSocket não conecta

```bash
# Verificar se porta está aberta
railway logs

# Healthcheck
curl https://your-app.railway.app/a2a/health
```

### Sem sinais de mempool

```bash
# Verificar Alchemy API Key
railway variables

# Logs detalhados
railway logs --tail
```

### Rate limit (429)

- Default: 1000 req/min por agente
- Upgrade para tier premium: 10k req/min

---

## 📈 Monitoramento

```bash
# Métricas em tempo real
curl https://your-app.railway.app/oracle/telemetry

# Métricas de agentes (enterprise only)
curl -X POST /a2a/metrics \
  -H "X-Agent-Key: agt_enterprise_key"
```

---

## 🎉 GXEON SOVEREIGN ORACLE v20.0 — READY FOR AUTONOMOUS OPERATION
