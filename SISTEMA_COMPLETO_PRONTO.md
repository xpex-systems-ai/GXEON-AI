# 🌑 SISTEMA GXEON COMPLETO — PRODUÇÃO MONETIZÁVEL

**Status:** ✅ **OPERACIONAL**  
**Data:** 29/04/2026  
**Versão:** v4.0 SOVEREIGN  
**Comandante:** Júnior Sena

---

## 🎯 SISTEMA OPERACIONAL

```
╔══════════════════════════════════════════════════════════════════════╗
║  🌑 GXEON MONETIZATION SERVER v4.0                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  Status: OPERATIONAL                                                 ║
║  Main Actor: GX_MAIN_ACTOR ✅                                       ║
║  Commission: 10%                                                      ║
║  PIX: ENABLED 🇧🇷                                                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 🚀 COMO INICIAR

### Passo 1: Configurar .env

```env
# Supabase (já configurado)
SUPABASE_PROJECT_URL=sua-url
SUPABASE_SERVICE_ROLE_KEY=sua-chave

# PIX (MercadoPago)
PIX_CHAVE=sua-chave-pix
PIX_CPF=seu-cpf
PIX_NOME=SEU NOME

# Opcional
PORT=3000
NODE_ENV=production
```

### Passo 2: Iniciar Servidor

```bash
cd c:\Users\P-c\Documents\xzeon-xpex-1
node server/gxeon_monetization_server.js
```

### Passo 3: Testar

```bash
# Health check
curl http://localhost:3000/health

# Preview com actor tracking
curl "http://localhost:3000/v1/signals/preview?ref=GX_MAIN_ACTOR"
```

---

## 📡 ENDPOINTS DISPONÍVEIS

### Core Monetization

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/health` | Status do sistema |
| `GET` | `/v1/signals/preview?ref=` | Preview de sinais + tracking |
| `POST` | `/v1/payment/create/:signalId` | Criar pagamento PIX |
| `POST` | `/v1/payment/confirm/:txId` | Confirmar pagamento + comissão |
| `GET` | `/v1/signals/:id/full` | Sinal completo (pago) |

### Analytics

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/v1/revenue/summary` | Resumo de receita |
| `GET` | `/v1/actors/:code/earnings` | Ganhos do ator |

---

## 💰 FLUXO DE MONETIZAÇÃO

```
1. VISITANTE
   ↓ Acessa /v1/signals/preview?ref=ATOR_CODE
   
2. SISTEMA
   ↓ Detecta actor_code do ?ref
   ↓ Mostra preview (targets bloqueados)
   
3. PAGAMENTO
   ↓ POST /v1/payment/create/:signalId
   ↓ Gera PIX com actor_code na transação
   ↓ Salva em global_transactions (status: PENDING)
   
4. CONFIRMAÇÃO
   ↓ POST /v1/payment/confirm/:txId
   ↓ Atualiza status para PAID
   ↓ Calcula comissão (10%)
   ↓ Atualiza actor_wallets (balance + total_earned)
   ↓ Libera acesso ao sinal completo
   
5. ACTOR RECEBE
   ↓ Comissão automática na wallet
   ↓ Rastreável em /v1/actors/:code/earnings
```

---

## 🎭 ACTOR SYSTEM

### GX_MAIN_ACTOR (Criado ✅)

| Campo | Valor |
|-------|-------|
| `actor_code` | GX_MAIN_ACTOR |
| `actor_type` | SYSTEM |
| `name` | GXEON Main System Actor |
| `status` | active |
| `commission_rate` | 0.10 (10%) |
| **Wallet Balance** | R$ 0 |
| **Total Earned** | R$ 0 |

---

## 📊 ESTRUTURA DO BANCO

### Tabelas Operacionais

| Tabela | Status | Colunas Chave |
|--------|--------|---------------|
| `actors` | ✅ | actor_code, actor_type, status, commission_rate |
| `actor_wallets` | ✅ | balance, pending_balance, total_earned, updated_at |
| `global_transactions` | ✅ | actor_code, status, gateway_provider |
| `pix_payments` | ✅ | actor_code, tx_id, status |
| `cornix_signals` | ✅ | signal data |
| `cornix_signal_access` | ✅ | user access grants |

---

## 💻 COMANDOS ÚTEIS

### Teste Completo

```bash
# 1. Iniciar servidor
node server/gxeon_monetization_server.js

# 2. Health check (novo terminal)
curl http://localhost:3000/health

# 3. Testar preview com actor
curl "http://localhost:3000/v1/signals/preview?ref=GX_MAIN_ACTOR"

# 4. Criar pagamento (substitua :signalId)
curl -X POST "http://localhost:3000/v1/payment/create/SIGNAL_ID" \
  -H "x-user-id: test-user-123"

# 5. Confirmar pagamento (substitua :txId)
curl -X POST "http://localhost:3000/v1/payment/confirm/GX123456789"

# 6. Ver ganhos do actor
curl "http://localhost:3000/v1/actors/GX_MAIN_ACTOR/earnings"
```

---

## 🚀 DEPLOY PARA PRODUÇÃO

### Railway (Recomendado)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Iniciar projeto
railway init

# 4. Deploy
railway up

# 5. Configurar variáveis
railway variables set SUPABASE_PROJECT_URL=xxx
railway variables set SUPABASE_SERVICE_ROLE_KEY=xxx
railway variables set PIX_CHAVE=xxx
```

### URL de Produção

```
https://gxeon-monetization.up.railway.app
```

---

## 🎯 STATUS FINAL

```
✅ Backend: OPERATIONAL
✅ Database: ALIGNED
✅ Actor System: ACTIVE (GX_MAIN_ACTOR)
✅ PIX Integration: ENABLED
✅ Commission Engine: ACTIVE (10%)
✅ Tracking: WORKING (?ref=)
✅ Wallet System: OPERATIONAL

SYSTEM STATUS: 🟢 PRODUCTION READY
```

---

## 📁 ARQUIVOS PRINCIPAIS

| Arquivo | Função |
|---------|--------|
| `server/gxeon_monetization_server.js` | Servidor completo |
| `supabase/GX_MAIN_ACTOR_SETUP.sql` | Setup do actor principal |
| `SISTEMA_COMPLETO_PRONTO.md` | Este documento |

---

## 🏎️💰⚔️🌑 **SISTEMA COMPLETO E MONETIZÁVEL**

**Execute:**
```bash
node server/gxeon_monetization_server.js
```

**O sistema está pronto para receber pagamentos reais.**
