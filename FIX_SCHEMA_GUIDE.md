# 🚨 CORREÇÃO URGENTE - Execute no Supabase

## Erro Detectado
```
Could not find the 'api_key' column of 'actors' in the schema cache
```

## 📍 Onde Executar (veja screenshots)

### Passo 1: Acesse o SQL Editor
1. Vá para: https://app.supabase.com/project/xfmwxligetviixqzzrup
2. Clique em **"SQL Editor"** no menu lateral esquerdo

### Passo 2: Cole o SQL
```sql
-- CORRIGIR TABELA ACTORS
ALTER TABLE actors ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment';
ALTER TABLE actors ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'BASIC';
CREATE INDEX IF NOT EXISTS idx_actors_api_key ON actors(api_key);
```

### Passo 3: Execute
Clique no botão **"Run"** (verde no canto superior direito)

---

## ✅ Após Correção

O endpoint `/v1/register` vai funcionar e gerar vendas automaticamente!

### Teste rápido:
```bash
curl -X POST https://gxeon-core.up.railway.app/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@gxeon.ai","name":"Test","tier":"BASIC"}'
```

---

## 💰 Monetização Pronta

Após corrigir o schema, você terá:

1. **PIX Manual** - Funciona imediatamente
2. **Cripto (ETH/USDC)** - Automático via treasury
3. **Stripe/OpenPix/PayPal** - Pendente apenas cadastro

Execute o SQL AGORA, Comandante! 🌙
