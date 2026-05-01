# GXEON Production Credentials Reference

**⚠️  IMPORTANTE: Este arquivo contém credenciais sensíveis!**
- NUNCA commite este arquivo
- Mantenha offline (não suba para GitHub)
- Use apenas como referência para configurar Railway

---

## 🔐 Credenciais Mercado Pago (Produção)

| Variável | Valor | Status |
|----------|-------|--------|
| **MERCADO_PAGO_ACCESS_TOKEN** | `APP_USR-2983592158025492-020720-f9926d8ddbda4138d33fec6165d89ce6-173807688` | ✅ Produção |
| **PIX_RECEIVER_KEY** | `6d7601d8-c20d-4057-99de-b84c8e55aa30` | ✅ UUID v4 |
| **MP_CLIENT_ID** | `2983592158025492` | ✅ App ID |
| **MP_CLIENT_SECRET** | `99WUiSqAEMTNt6mCoGjCYvZeritlJpHx` | ✅ Secret |
| **MP_PUBLIC_KEY** | `APP_USR-565608d2-c119-4af8-9c1c-a9b20107e923` | ✅ Public |

### Configuração no MercadoPago Dashboard:
1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Aplicação: GXEON (ID: 173807688)
3. Webhook URL: `https://gxeon.railway.app/v1/webhook/mercadopago`
4. Eventos: `payment`

---

## 🗄️ Credenciais Supabase

| Variável | Valor | Status |
|----------|-------|--------|
| **SUPABASE_PROJECT_URL** | `https://telxvphgrsvsnxvmjkce.supabase.co` | ✅ URL |
| **SUPABASE_SERVICE_ROLE_KEY** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbHh2cGhncnN2c254dm1qa2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNjMzMSwiZXhwIjoyMDkwMTAyMzMxfQ.297P1WLrSDqiRWtyUk5OuLoLvAU99zy53_HodleZQkA` | ✅ Service Role |

### Acesso ao Dashboard:
- URL: https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce
- Use Service Role Key apenas no backend (nunca no frontend)

---

## 📱 Credenciais Telegram

| Variável | Valor | Status |
|----------|-------|--------|
| **TELEGRAM_BOT_TOKEN** | `8659197490:AAG-4X50tQahi0mnngfSeUyi49fpr1sDjBk` | ✅ Bot Token |
| **TELEGRAM_CHAT_ID** | `8506789322` | ⚠️ Atualizar para canal |

### Bot Configurado:
- Bot: @gxeonai_bot
- Status: ✅ Ativo
- Comandos: /start, /upgrade, /signals, /status

### ⚠️  Ação Requerida:
Atualizar `TELEGRAM_CHAT_ID` para canal público com prefixo `-100`:
```
# Obter Chat ID do canal:
1. Adicione @gxeonai_bot como admin do canal
2. Envie mensagem no canal
3. Acesse: https://api.telegram.org/bot8659197490:AAG-4X50tQahi0mnngfSeUyi49fpr1sDjBk/getUpdates
4. Procure: "chat":{"id":-100XXXXXXXXXX,...}
5. Configure: TELEGRAM_CHAT_ID=-100XXXXXXXXXX
```

---

## 🚀 Configuração Railway (Automática)

Execute o script para configurar todas as variáveis:

```bash
cd c:/Users/P-c/Documents/xzeon-xpex-1
scripts/configure_production_env.bat
```

Ou configure manualmente no dashboard:
https://railway.app/dashboard

---

## ✅ DNA de Conversão - Checklist

| Componente | Status |
|------------|--------|
| PIX Real (MercadoPago) | ✅ Token produção configurado |
| Webhook Confirmation | ✅ Endpoint `/v1/webhook/mercadopago` |
| Commission Engine | ✅ Auto-distribuição por actor_code |
| Actor Tracking | ✅ ?ref param em todas as URLs |
| Signal + Telegram | ✅ Auto-dispatch a cada 60s |
| Supabase Real-time | ✅ Service Role configurado |

---

## 🔒 Segurança

- ✅ Tokens em ENV (não hardcoded)
- ✅ Service Role Key backend-only
- ✅ PIX keys vinculadas ao MP
- ✅ Webhook validado
- ✅ TREASURY_LOCK=true

---

## 🎯 Próximo Passo

1. Execute: `scripts/configure_production_env.bat`
2. Valide: `node scripts/dna_activation_check.js`
3. Teste: Crie PIX de R$ 1.00 e pague
4. Verifique: Comissão creditada automaticamente

---

**Comandante Júnior Sena - GXEON Systems** 🌑
*"Zero investimento inicial. Puro código como capital."*
