# 🚀 DEPLOY PIX REAL - RAILWAY

## Token Configurado
```
MERCADO_PAGO_ACCESS_TOKEN=6d7601d8-c20d-4057-99de-b84c8e55aa30
```

---

## ⚡ AÇÕES IMEDIATAS NO RAILWAY

### 1. Configure Environment Variables

Acesse: https://railway.app/project/SEU_PROJETO/variables

Adicione:
```env
MERCADO_PAGO_ACCESS_TOKEN=6d7601d8-c20d-4057-99de-b84c8e55aa30
MERCADOPAGO_ACCESS_TOKEN=6d7601d8-c20d-4057-99de-b84c8e55aa30
MP_ACCESS_TOKEN=6d7601d8-c20d-4057-99de-b84c8e55aa30

PIX_ENABLED=true
PIX_AUTO_ACTIVATION=true
PIX_PROVIDER=mercadopago

# Webhook URL (substitua com sua URL do Railway)
MP_NOTIFICATION_URL=https://gxeon-core.up.railway.app/webhook/mercadopago
WEBHOOK_PIX_ENABLED=true

# Ambiente
NODE_ENV=production
PIX_PRODUCTION=true

# Treasury
TREASURY_ADDRESS=0x3955d559055DadB7067054cB6E6f974710345224
```

---

## 🔄 REDEPLOY

```bash
git add .
git commit -m "feat: PIX REAL ATIVADO - Token 6d7601d8"
git push origin main
```

---

## 🧪 TESTAR VENDA

### Teste 1: Verificar Token
```bash
curl -X GET https://api.mercadopago.com/users/me \
  -H "Authorization: Bearer 6d7601d8-c20d-4057-99de-b84c8e55aa30"
```

### Teste 2: Criar PIX
```bash
curl -X POST https://gxeon-core.up.railway.app/v1/register-agent \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@gxeon.ai",
    "name": "TestBot",
    "tier": "BASIC"
  }'
```

Resposta deve incluir:
```json
{
  "payment": {
    "pix_qr_code": "00020126580014...",
    "pix_copy_paste": "copia-e-cola",
    "amount": 29.90
  }
}
```

### Teste 3: Simular Webhook (após pagamento)
```bash
curl -X POST https://gxeon-core.up.railway.app/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789",
      "status": "approved",
      "external_reference": "GX-XXXXX-BASIC",
      "transaction_amount": 29.90
    }
  }'
```

---

## 📊 MONITORAR

Dashboard: `GET /v1/admin/metrics`

Métricas importantes:
- `pix_generated` - Total de PIX criados
- `payments_confirmed` - Pagamentos confirmados
- `conversion_rate` - Taxa de conversão
- `revenue_total` - Receita total

---

## 🌙 CONFIGURAÇÃO COMPLETA

Sistema está pronto para:
- ✅ Gerar PIX reais via MercadoPago
- ✅ Receber webhooks de confirmação
- ✅ Ativar clientes automaticamente
- ✅ Trackear métricas de conversão

**Treasury:** `0x3955d559055DadB7067054cB6E6f974710345224`
