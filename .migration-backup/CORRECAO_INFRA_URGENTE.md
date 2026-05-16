# 🔧 CORREÇÃO INFRA — GXEON CORNIX

## Status: ❌ Placeholders detectados

---

## 🎯 PROBLEMA IDENTIFICADO

Seu `.env` contém:
```
SUPABASE_PROJECT_URL=https://SEU_NOVO_URL.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_NOVA_KEY...
```

**Isso são placeholders, não credenciais reais!**

---

## ✅ SOLUÇÃO PASSO A PASSO

### PASSO 1: Pegar Credenciais Reais do Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Clique em **Project Settings** (engrenagem)
4. Vá em **API**
5. Copie:
   - **URL** (Project URL)
   - **service_role key** (não a anon/public!)

---

### PASSO 2: Atualizar .env

Edite `.env.local` (ou `.env`):

```env
SUPABASE_PROJECT_URL=https://seu-projeto-real.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Importante:** Use a **service_role key** (começa com `eyJ...`), não a anon key!

---

### PASSO 3: Executar Schema SQL

No painel do Supabase:

1. Vá em **SQL Editor** (sidebar)
2. Clique **New query**
3. Cole o conteúdo de: `supabase/cornix_signals_schema.sql`
4. Clique **Run**
5. Verifique se deu "Success"

Ou via terminal (se tiver `psql`):
```bash
psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" -f supabase/cornix_signals_schema.sql
```

---

### PASSO 4: Testar Conexão

```bash
node scripts/diagnostico_infra_real.js
```

Deve mostrar:
```
✅ Variáveis de Ambiente: OK
✅ Conexão Supabase: OK
✅ Schema SQL: OK
```

---

### PASSO 5: Iniciar Servidor

```bash
npm run dev
```

Em outro terminal, teste:
```bash
curl http://localhost:3000/v1/signals/live
```

---

### PASSO 6: Teste de Monetização Real

```bash
node scripts/test_real_monetization.js
```

---

## 🚀 QUICK CHECKLIST

| Check | Ação | Status |
|-------|------|--------|
| ☐ | Pegar URL real do Supabase | |
| ☐ | Pegar service_role key real | |
| ☐ | Atualizar .env.local | |
| ☐ | Executar schema SQL | |
| ☐ | Testar conexão | |
| ☐ | Iniciar servidor | |
| ☐ | Testar monetização | |

---

## 🎉 QUANDO ESTIVER PRONTO

Execute:
```bash
node scripts/diagnostico_infra_real.js
```

Se mostrar tudo **✅ OK**, rode:
```bash
node scripts/test_real_monetization.js
```

Aí sim você terá **dinheiro real** entrando.

---

**Tempo estimado:** 10-15 minutos
