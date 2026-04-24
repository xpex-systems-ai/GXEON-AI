# 🌑 GXEON MEV-Nexus v2.0 — MEV-Share Matchmaker

Transforma o Radar SHIX em uma **emissora de sinais lucrativos** para tubarões MEV-Share na Arbitrum.

## Arquitetura

```
Radar SHIX → detecta pools > $50k → emite OPPORTUNITY_DETECTED (JSON)
    ↓
Pipe (stdin/stdout)
    ↓
MEV-Matchmaker → consome sinal → monta bundle EIP-712 → envia para relay
    ↓
Flashbots Relay → distribui para searchers → execução on-chain
    ↓
Kickback 40% → 0x3955d559055DadB7067054cB6E6f974710345224
```

## Quick Start

### 1. Instalação
```bash
npm install
```

### 2. Configuração
Copie `.env.example` para `.env` e configure:
```env
# MEV-Nexus
MEV_LIVE_MODE=false        # Comece em simulação
MEV_MIN_PROFIT_USD=0.5
MEV_KICKBACK_PERCENT=40
PRIVATE_KEY=0x...          # Para assinatura EIP-712
```

### 3. Modo Simulação (Recomendado para testes)
```bash
npm run mev:simulation
```

Em outro terminal:
```bash
npm run radar:start
```

### 4. Pipe Automático (Radar → MEV)
```bash
npm run radar:mev
```

### 5. Modo Live (Cuidado! Envia bundles reais)
```bash
npm run mev:live
```

## Estrutura de Arquivos

```
config/
  └── mev-config.json          # Configuração MEV-Share
server/services/
  ├── radarShix.js             # Emite oportunidades (> $50k)
  └── mevMatchmaker.js         # Transmite bundles para relay
supabase/
  └── mev_nexus_schema.sql     # Schema de persistência
```

## Formato de Sinal

O Radar SHIX emite oportunidades no formato:
```json
{
  "event": "OPPORTUNITY_DETECTED",
  "id": "op-0x1234...-1234567890",
  "type": "NEW_HIGH_LIQUIDITY_POOL",
  "poolAddress": "0x...",
  "liquidityUsd": 150000,
  "profitUsd": 5.23,
  "contractAddress": "0x..."
}
```

## Scripts NPM

| Comando | Descrição |
|---------|-----------|
| `npm run radar:start` | Inicia Radar SHIX apenas |
| `npm run mev:start` | Inicia MEV-Matchmaker apenas |
| `npm run radar:mev` | Pipe automático Radar → MEV |
| `npm run mev:simulation` | Modo simulação (sem envio real) |
| `npm run mev:live` | **Modo live** — envia bundles reais |

## Beneficiário

Todos os kickbacks caem automaticamente em:
```
0x3955d559055DadB7067054cB6E6f974710345224
```

## Segurança

- **Simulação primeiro**: Sempre simula antes de transmitir
- **Threshold de lucro**: Mínimo $0.50 para enviar
- **Deduplicação**: Bundles são deduplicados por hash
- **Rate limiting**: Respeita limites do relay Flashbots

## Integração Flashbots

O sistema está preparado para `@flashbots/mev-share-client`. Quando instalado:

```bash
npm install @flashbots/mev-share-client
```

O `MevShareClient` real substitui automaticamente o mock de simulação.

---

**Comandante Júnior Sena** — GXEON AI Sovereign Infrastructure
