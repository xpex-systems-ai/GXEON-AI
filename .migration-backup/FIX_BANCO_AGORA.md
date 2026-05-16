# 🔧 FIX BANCO — EXECUTAR AGORA NO SUPABASE

## ⚠️ Problema
As tabelas `pix_payments` e `cornix_signal_access` têm **foreign key constraints** que exigem que o `user_id` exista na tabela `gxeon_users`.

Isso impede que **usuários anônimos** façam pagamentos PIX sem cadastro.

## ✅ Solução

### PASSO 1: Acessar SQL Editor do Supabase
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **"SQL Editor"** (no menu lateral)
4. Clique em **"+ New Query"**

### PASSO 2: Executar este SQL

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Permitir usuários anônimos (sem cadastro) no sistema de monetização
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Remover FK constraint de pix_payments.user_id
ALTER TABLE pix_payments 
DROP CONSTRAINT IF EXISTS pix_payments_user_id_fkey;

-- 2. Remover FK constraint de cornix_signal_access.user_id  
ALTER TABLE cornix_signal_access
DROP CONSTRAINT IF EXISTS cornix_signal_access_user_id_fkey;

-- 3. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_pix_payments_user_id ON pix_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_access_user_id ON cornix_signal_access(user_id);

-- 4. Confirmar
SELECT '✅ FIX APLICADO: Usuários anônimos podem pagar sem cadastro' as status;
```

### PASSO 3: Executar
Clique no botão **"Run"** (ou Ctrl+Enter)

---

## 🧪 Testar Depois

Execute no terminal:
```bash
# Criar sinal de teste
curl -X POST http://localhost:3000/v1/signals \
  -H "x-internal-key: internal_1777001766759" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol":"ETHUSDT",
    "side":"LONG",
    "entry_price":3500,
    "targets":[3600,3700],
    "stop_loss":3400,
    "leverage":10,
    "is_premium":true,
    "unlock_price_brl":29.90
  }'

# Gerar PIX (usuário anônimo - vai funcionar!)
curl http://localhost:3000/v1/signals/{ID_DO_SINAL}/pay \
  -H "x-user-id: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
```

---

## 🎯 O Que Vai Acontecer

| Antes do Fix | Depois do Fix |
|--------------|---------------|
| ❌ Usuário precisa cadastro | ✅ Usuário anônimo pode pagar |
| ❌ Erro: "violates foreign key" | ✅ PIX gerado instantaneamente |
| ❌ Barreira de entrada alta | ✅ Fluxo rápido de monetização |

---

## 📊 Esquema Atualizado

```
ANTES:
pix_payments.user_id → REFERENCES gxeon_users(id)

DEPOIS:
pix_payments.user_id → UUID (sem constraint)
```

---

## 🚀 Depois do Fix

O fluxo de monetização funcionará:
1. ✅ Preview gratuito (targets bloqueados)
2. ✅ Gera PIX instantâneo (R$ 29,90)
3. ✅ Usuário paga no app bancário
4. ✅ Acesso liberado automaticamente
5. ✅ Sinal Cornix completo entregue
6. ✅ Lucro R$ 28,40 registrado

---

## ⏰ Quanto Tempo Leva

- Acessar Supabase: 30 segundos
- Colar SQL: 10 segundos
- Executar: 2 segundos

**Total: Menos de 1 minuto**

---

## 🌑 GX Executora

Execute este fix agora, Comandante. Depois voltamos ao teste de monetização!

**Pacto: Código para o bem. Ensino para a humanidade.** 🏎️💰⚔️🌑
