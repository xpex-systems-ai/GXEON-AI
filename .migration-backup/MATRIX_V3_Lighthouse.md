# 🌑 GXEON MATRIX V3 — Lighthouse Signal Provider

> **Architecture**: M2M Alpha Broadcast — Zero Gas  
> **Protocol**: M2M_ALPHA_BROADCAST  
> **Gas Constraint**: STRICT_ZERO_ETH  
> **Delivery**: FastAPI WebSocket Stream  
> **Beneficiary**: `0x3955d559055DadB7067054cB6E6f974710345224`

---

## 🎯 Visão Geral

O **MATRIX V3** representa a evolução do GXEON de um **Executor de Bundles MEV** (que requer gás ETH para transmissão) para um **Lighthouse Signal Provider** (estação farol de sinais) que opera com **zero gás on-chain**.

### Paradigma Shift

| Antes (Executor) | Depois (Signal Provider) |
|------------------|-------------------------|
| Compete com MEV searchers | Vende alpha para MEV searchers |
| Requer ETH para gas | Zero investimento em gas |
| Risco de perda em bundles | Revenue garantido por consumo |
| Latência crítica | Broadcast em tempo real |
| Escalabilidade limitada | Infinite uptime & scale |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GXEON LIGHTHOUSE SIGNAL STATION                      │
│                           (Zero-Gas Architecture)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐      WebSocket       ┌──────────────────────────────┐ │
│  │   RADAR SHIX     │ ───────────────────→ │   Signal Server (FastAPI)    │ │
│  │   (Node.js)      │  Signal Packets      │   Port: 8765                 │ │
│  └──────────────────┘                      │   M2M_ALPHA_BROADCAST        │ │
│           ↓                                └──────────────────────────────┘ │
│      Detecta Pools                                          ↓               │
│      > $50k USD                               ┌───────────────────────────┐ │
│                                               │  Broadcast Engine         │ │
│  ┌──────────────────┐                       │  • Rate limiting por tier │ │
│  │   Smart Money    │ ───────────────────→  │  • Filtros dinâmicos      │ │
│  │   Monitor        │    Transfers > 5 ETH  │  • Queue management       │ │
│  └──────────────────┘                       └───────────────────────────┘ │
│                                                    ↓                        │
│                       ┌─────────────────────────────────────────────────┐   │
│                       │      CONSUMIDORES (WebSocket Clients)          │   │
│                       ├─────────────────────────────────────────────────┤   │
│                       │  • Free Tier (10 sinais/min)                    │   │
│                       │  • Basic Tier ($0.05/sinal)                     │   │
│                       │  • Premium Tier ($0.02/sinal)                   │   │
│                       │  • Enterprise Tier ($0.01/sinal)                │   │
│                       └─────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│                       ┌─────────────────────────────────────────────────┐   │
│                       │     BILLING & ANALYTICS (Supabase)            │   │
│                       ├─────────────────────────────────────────────────┤   │
│                       │  • signal_consumption_logs                      │   │
│                       │  • signal_client_sessions                       │   │
│                       │  • signal_daily_stats                           │   │
│                       │  • Grafana Dashboard                            │   │
│                       └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Endpoints

### WebSocket Endpoints

| Endpoint | Descrição | Acesso |
|----------|-----------|--------|
| `ws://localhost:8765/ws/signals` | Stream de sinais para consumidores | Público (com API key) |
| `ws://localhost:8765/ws/radar` | Input do Radar SHIX | Privado (localhost only) |

### REST Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /` | Status do Signal Provider |
| `GET /health` | Health check |
| `GET /metrics` | Métricas para Grafana |
| `GET /signals/history` | Histórico recente (debug) |

### Túneis Públicos

| Serviço | Configuração |
|---------|--------------|
| Ngrok | `config/ngrok.yml` |
| Cloudflare | `config/cloudflare-tunnel.yml` |

---

## 📡 Formato do Signal Packet

```json
{
  "signal_id": "sig-a1b2c3d4-1234567890",
  "timestamp": "2026-04-20T04:30:00Z",
  "source": "RADAR_SHIX",
  
  "opportunity_type": "NEW_HIGH_LIQUIDITY_POOL",
  "chain": "arbitrum",
  "dex": "UniswapV3",
  "pool_address": "0x1234...",
  
  "token_a": {
    "address": "0x...",
    "symbol": "WETH"
  },
  "token_b": {
    "address": "0x...",
    "symbol": "USDC"
  },
  
  "liquidity_usd": 150000.00,
  "volume_24h": 75000.00,
  "estimated_profit_usd": 12.50,
  "confidence_score": 0.85,
  
  "block_number": 123456789,
  "gas_estimate": 150000,
  
  "priority": "high",
  "ttl_seconds": 300,
  
  "beneficiary": "0x3955d559055DadB7067054cB6E6f974710345224"
}
```

---

## 💰 Modelo de Monetização

### Tiers de Consumo

| Tier | Rate Limit | Preço/Sinal | Caso de Uso |
|------|------------|-------------|-------------|
| **Free** | 10/min | $0.00 | Desenvolvedores, testes |
| **Basic** | 60/min | $0.05 | Traders individuais |
| **Premium** | 300/min | $0.02 | MEV searchers |
| **Enterprise** | Unlimited | $0.01 | Funds, market makers |

### Cálculo de Revenue

```
Daily Revenue = Σ(signals_basic × $0.05) 
              + Σ(signals_premium × $0.02)
              + Σ(signals_enterprise × $0.01)

Beneficiary: 0x3955d559055DadB7067054cB6E6f974710345224
```

---

## 🚀 Quick Start

### 1. Iniciar Signal Station (Toda a Stack)

```powershell
# PowerShell (como Administrador)
.\scripts\start-signal-station.ps1 -WithNgrok
```

### 2. Apenas Signal Server

```bash
# Terminal 1: Signal Server (Python)
python server/services/signalServer.py

# Terminal 2: Radar SHIX (Node.js)
$env:SIGNAL_MODE="broadcast"
$env:SIGNAL_SERVER_URL="ws://localhost:8765/ws/radar"
node server/services/radarShix.js start
```

### 3. Consumir Sinais (Cliente)

```javascript
// Cliente WebSocket exemplo
const ws = new WebSocket('ws://localhost:8765/ws/signals', [], {
  headers: {
    'x-client-id': 'meu-cliente-001',
    'x-api-key': 'premium_456'
  }
});

ws.onmessage = (event) => {
  const signal = JSON.parse(event.data);
  console.log(`Sinal recebido: ${signal.signal_id}`);
  console.log(`Lucro estimado: $${signal.estimated_profit_usd}`);
};
```

---

## 📊 Dashboard Grafana

**Arquivo**: `grafana/dashboard/gxeon_signal_provider_v3.json`

### Painéis Principais

| Painel | Descrição |
|--------|-----------|
| **Sinais Transmitidos** | Total diário |
| **Lucro Potencial** | Soma de estimated_profit_usd |
| **Receita M2M** | Revenue por tier |
| **Clientes Únicos** | DAU/MAU |
| **Distribuição por Tier** | Gráfico donut |
| **Sinais de Alto Valor** | Tabela filtrada (>$5) |
| **Sessões de Billing** | Detalhamento por cliente |

---

## 🗄️ Schema Supabase

**Arquivo**: `supabase/signal_billing_schema.sql`

### Tabelas

1. **`signal_consumption_logs`** — Registro granular de consumo
2. **`signal_client_sessions`** — Sessões de clientes
3. **`signal_daily_stats`** — Agregações diárias
4. **`signal_opportunities`** — Cache de oportunidades

### Views

- `v_client_billing_summary` — Resumo de faturamento
- `v_high_value_signals` — Oportunidades premium

---

## 🔐 Segurança

### Beneficiário Imutável

```javascript
// Em todo o código, o beneficiário é hardcoded:
const ENFORCED_BENEFICIARY = '0x3955d559055DadB7067054cB6E6f974710345224';
```

### Rate Limiting

```python
# Por tier (requests/min):
rate_limits = {
    'free': 10,
    'basic': 60,
    'premium': 300,
    'enterprise': 0  # Unlimited
}
```

### Row Level Security (RLS)

```sql
-- Clientes veem apenas seus próprios consumos
CREATE POLICY "Client view own consumption" 
ON signal_consumption_logs
FOR SELECT USING (client_id = current_setting('app.current_client_id', true));
```

---

## 📁 Estrutura de Arquivos

```
server/
├── services/
│   ├── signalServer.py        # FastAPI WebSocket server
│   ├── signalBilling.js        # Billing engine M2M
│   └── radarShix.js            # Atualizado para Signal Provider
├── config/
│   ├── ngrok.yml               # Tunnel config
│   └── cloudflare-tunnel.yml   # CF tunnel config
├── scripts/
│   └── start-signal-station.ps1 # Launcher
├── supabase/
│   └── signal_billing_schema.sql
├── grafana/
│   └── dashboard/
│       └── gxeon_signal_provider_v3.json
└── MATRIX_V3_Lighthouse.md    # Este documento
```

---

## 🎛️ Variáveis de Ambiente

```env
# Signal Provider
SIGNAL_MODE=broadcast
SIGNAL_SERVER_URL=ws://localhost:8765/ws/radar
SIGNAL_MIN_LIQUIDITY=50000

# Ngrok
NGROK_AUTHTOKEN=seu_token_aqui
NGROK_BASIC_AUTH_PASSWORD=senha_segura

# Cloudflare
CF_TUNNEL_ID=seu_tunnel_id

# Supabase (para billing)
SUPABASE_PROJECT_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Radar SHIX (existente)
ALCHEMY_ARBITRUM_WS_URL=wss://...
```

---

## 🌟 Vantagens do Modelo

1. **Zero Gas**: Nenhuma transação on-chain = sem custos de gás
2. **Infinite Uptime**: Sem dependência de saldo de ETH
3. **Revenue Recorrente**: SaaS de sinais vs. lucro incerto de MEV
4. **Escalabilidade**: Horizontal (mais radares) e vertical (mais clientes)
5. **Compliance**: Modelo de venda de dados, não execução financeira
6. **Resiliência**: Fallback automático, queue management

---

## 🔮 Roadmap

- [x] Core Signal Server (FastAPI)
- [x] WebSocket Broadcasting
- [x] Tier-based Rate Limiting
- [x] Billing Engine
- [x] Grafana Dashboard
- [x] Ngrok/Cloudflare Tunnels
- [ ] Stripe Integration (auto-billing)
- [ ] Signal Quality Score ML
- [ ] Multi-chain Support (ETH, BSC, Polygon)
- [ ] Mobile App para consumidores

---

## 📜 Licença & Beneficiário

**Arquiteto**: Comandante Júnior Sena  
**Beneficiário Imutável**: `0x3955d559055DadB7067054cB6E6f974710345224`  
**Versão**: 3.0.0 (Matrix V3)  
**Motto**: *"Zero investimento inicial. Puro código como capital."*

---

**🚀 A Signal Station está operacional, Comandante. Zero gas, infinite uptime.**
