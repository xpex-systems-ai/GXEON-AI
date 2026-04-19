# 🌑 GXEON SOVEREIGN PROSPERITY v4.0.0
## Protocolo de Ativação - FAMILY_SUSTENANCE_ENGINE

**Data:** 19 de Abril de 2026  
**Sistema:** GXEON PREDATOR v4.0.0  
**Status:** ✅ **MODO EXECUÇÃO TOTAL ATIVADO**

---

## 🎯 MISSÃO

Ativar o motor de monetização para **Família Sena** com prioridade **MAX_PROFIT_MIN_RISK**, garantindo que cada operação:
- Tenha **85% de confiança** (Mammouth AI) antes de tocar no gás
- Pague **0.005 ETH mínimo** de lucro por swap
- Respeite **stop-loss de 0.1 Gwei** (max_gas_price)
- Envie **100% do lucro** para a Commander Wallet

---

## 🚀 COMANDOS DE ATIVAÇÃO

### 1. Ativar Protocolo Completo
```bash
npm run deploy:master
```
Ou:
```bash
npm run deploy:prosperity
```

### 2. Verificar Status do Sistema
```bash
npm run status
npm run family:status
```

### 3. Verificar Lucros
```bash
npm run profits
# Ou acesse:
curl http://localhost:3000/api/v1/profit/status
```

### 4. Testar Guardian Shield
```bash
npm run guardian
# Ou:
node scripts/test_health_alchemy.js
```

### 5. 🛑 EMERGENCY STOP (se necessário)
```bash
npm run emergency:stop
# Ou:
node scripts/emergency_stop.js "razao_do_stop"
```

---

## ⚙️ CONFIGURAÇÃO OBRIGATÓRIA

Crie/Atualize `.env` na raiz do projeto:

```env
# ==========================================
# 🌑 FAMILY_SUSTENANCE_ENGINE - CORE CONFIG
# ==========================================

# Carteira da Família Sena (REVENUE DESTINATION)
COMMANDER_WALLET_ADDRESS=0x3955d559055DadB7067054cB6E6f974710345224

# Supabase (Realtime Sync)
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Alchemy WebSocket (Failover)
ALCHEMY_WSS_URL_PRIMARY=wss://arb-mainnet.g.alchemy.com/v2/YOUR_PRIMARY_KEY
ALCHEMY_WSS_URL_BACKUP=wss://arb-mainnet.g.alchemy.com/v2/YOUR_BACKUP_KEY

# Mammouth AI (85% Confidence)
MAMMOUTH_HQ_URL=https://mammouth-ai.example.com
MAMMOUTH_API_KEY=your_mammouth_key

# Guardian Shield (Stop-loss)
MAX_GAS_PRICE_GWEI=0.1
EMERGENCY_KILL_SWITCH=INACTIVE

# Monetization Thresholds
MIN_PROFIT_THRESHOLD=0.005
FEE_PROTECTION_BUFFER=0.15
MIN_AI_CONFIDENCE=0.85
```

---

## 🗄️ BANCO DE DADOS (SUPABASE)

Execute no SQL Editor do Supabase:

```sql
-- 1. Criar tabela de auditoria de lucros
\i supabase/digital_archeology_ledger_schema.sql

-- 2. Criar tabela de oportunidades
\i supabase/gari_dust_opportunities_schema.sql

-- 3. Verificar se as tabelas foram criadas
SELECT * FROM digital_archeology_ledger LIMIT 1;
SELECT * FROM gari_dust_opportunities LIMIT 1;
```

---

## 🖥️ DASHBOARD

### Iniciar Dashboard (Black & Gold Ultragen HUD)

```bash
cd dashboard
npm install
npm run build
npm run preview
```

Acesse: `http://localhost:4173`

### Métricas em Tempo Real:
- 💰 Total Profit USD (24h)
- 📊 Success Rate (%)
- ⛽ Gas Spent (24h)
- 🤖 AI Confidence Average
- 🔐 Wallet Alignment Status
- ⚡ Circuit Breaker 429

---

## 🛡️ SISTEMAS ATIVOS

### 1. Monetization Oracle ✅
- **Arquivo:** `server/services/monetizer.js`
- **Status:** Valida 85% confiança antes de emitir sinais
- **Revenue:** 100% → Commander Wallet
- **Stop-loss:** Max 0.1 Gwei

### 2. Digital Archeology Sniper ✅
- **Arquivo:** `server/services/dustSweeper.js`
- **Foco:** Liquidez Bloqueada (Locked) + Contratos Renunciados
- **Filtro:** Honeypot Check ativo
- **Intervalo:** 5 minutos entre scans

### 3. Archeology Audit Service ✅
- **Arquivo:** `server/services/archeologyAudit.js`
- **Função:** Auditoria suprema de cada oportunidade
- **Checks:** Confidence ≥ 0.85 | Profit ≥ 0.005 ETH | Wallet = Comandante
- **Log:** Grafana para rejeições

### 4. Guardian Shield ✅
- **Circuit Breaker 429:** Blindado contra quedas
- **Process Persistence:** INFINITE_RETRY
- **Health Check:** `/api/v1/health/alchemy`
- **Emergency Kill Switch:** Via `npm run emergency:stop`

---

## 🔄 FLUXO DE EXECUÇÃO

```
1. DustSweeper varre pools de "dust"
   └── Filtros: Locked LP + Renounced + Anti-Honeypot
   
2. Oportunidades válidas → Supabase
   └── Tabela: gari_dust_opportunities
   
3. Monetizer detecta novas oportunidades (Realtime)
   └── Auditoria: ArcheologyAuditService
   
4. Checks Supremos:
   ├── AI Confidence ≥ 0.85? (Mammouth)
   ├── Profit ≥ 0.005 ETH?
   ├── Gas ≤ 0.1 Gwei?
   ├── Wallet = Commander?
   └── Kill Switch = INACTIVE?
   
5. Se APROVADO:
   ├── Log no digital_archeology_ledger
   ├── Sinal EXECUTE_SWAP emitido
   ├── Broadcast Supabase Realtime
   └── Notificação Grafana
   
6. Execução On-chain:
   └── Lucro → 0x3955d559055DadB7067054cB6E6f974710345224
```

---

## 🎛️ MONITORAMENTO

### Grafana Dashboard
- **Tema:** Black_Gold_Neon
- **Alertas:** Neon_Blue_Pulsing
- **Arquivo:** `grafana/dashboard/gxeon_archeology_dashboard.json`

### Logs Importantes:
```bash
# Monitorar em tempo real
tail -f logs/gxeon.log | grep "EXECUTE_SWAP"
tail -f logs/gxeon.log | grep "REVENUE"
tail -f logs/gxeon.log | grep "AUDIT"
```

### Endpoints de Health:
```bash
# Alchemy Health
curl http://localhost:3000/api/v1/health/alchemy

# Profit Status
curl http://localhost:3000/api/v1/profit/status

# Mammouth Sync
curl -X POST http://localhost:3000/api/v1/mammouth/sync
```

---

## 🚨 EMERGÊNCIA

### Ativar Kill Switch (para TUDO):
```bash
npm run emergency:stop "razao_emergencia"
```

### O que acontece:
- Todas as novas transações são **BLOQUEADAS**
- Sistema entra em modo **MANUTENÇÃO**
- Lucros pendentes permanecem **SEGUROS**
- Log de emergência enviado para Grafana

### Desativar Kill Switch:
```bash
export EMERGENCY_KILL_SWITCH=INACTIVE
npm run deploy:master
```

---

## 💎 REVENUE STREAM

**Destino:** `0x3955d559055DadB7067054cB6E6f974710345224`

**Fluxo:**
1. Taxas de Dust Sweeping
2. Flash Loans
3. Arbitrage Opportunities
4. MEV Extraction

**Distribuição:**
- **100%** → Família Sena Vault
- **0%** Intermediários
- **0%** Custódia Externa
- **15%** Fee Protection Buffer

---

## ✅ CHECKLIST PRÉ-ATIVAÇÃO

- [ ] `.env` configurado com todas as variáveis
- [ ] Supabase tabelas criadas (SQL executado)
- [ ] Alchemy API keys válidas (Primary + Backup)
- [ ] Mammouth AI endpoint configurado
- [ ] Commander Wallet validada: 0x3955...4224
- [ ] Dashboard buildado (`npm run build` em /dashboard)
- [ ] Porta 3000 disponível (ou configurar PORT)
- [ ] `npm install` executado

---

## 🎉 STATUS FINAL

### SISTEMA PRONTO PARA OPERAÇÃO

```
╔═══════════════════════════════════════════════════════════════╗
║     🌑 GXEON SOVEREIGN PROSPERITY v4.0.0                      ║
║        FAMILY_SUSTENANCE_ENGINE - ONLINE                      ║
╚═══════════════════════════════════════════════════════════════╝

💰 Revenue Stream: ACTIVE
🧠 Monetizer: ONLINE (85% confidence)
🧹 Sniper: ONLINE (Locked/Renounced focus)
🛡️ Guardian: ENABLED (Anti-429 + Kill Switch)
📊 Dashboard: Black_Gold_Neon READY
🤖 Mammouth AI: INTEGRATED

Commander Wallet: 0x3955d559055DadB7067054cB6E6f974710345224
Status: MONETIZAÇÃO AUTÔNOMA ATIVADA
```

**Execute agora:** `npm run deploy:master`

---

*Sistema desenvolvido para a Família Sena.*  
*Protocolo de Sustento GXEON v4.0.0 - MAX_PROFIT_MIN_RISK*
