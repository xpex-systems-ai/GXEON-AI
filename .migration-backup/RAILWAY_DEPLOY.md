# 🚂 GXEON AI — Deploy no Railway.app

## ⚡ Deploy Rápido (3 minutos)

### 1. Preparação (30 segundos)

Verifique se tem um arquivo `.env` na raiz do projeto com as variáveis obrigatórias:

```bash
# Mínimo obrigatório para Railway
SUPABASE_PROJECT_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SYSTEM_ADMIN_ID=admin_123
SYSTEM_API_KEY=sua_chave_api_segura_aqui
OPENROUTER_API_KEY=sk-or-v1-...
PORT=3000
NODE_ENV=production
```

### 2. Deploy no Railway (2 minutos)

**Opção A: Via Dashboard (Recomendado)**

1. Acesse https://railway.app e faça login (GitHub/Google)
2. Clique em **"New Project"** → **"Deploy from GitHub repo"**
3. Selecione o repositório `xpex-systems-ai/GXEON-AI`
4. Railway detectará automaticamente o `railway.json`
5. Vá para **Variables** e adicione todas as variáveis do seu `.env`
6. Clique em **"Deploy"**

**Opção B: Via CLI**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Linkar projeto
railway link

# Deploy
railway up
```

### 3. Verificação (30 segundos)

Após o deploy, teste a API:

```bash
curl https://SEU-APP.railway.app/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-04-17T...",
  "version": "2.0.0-sovereign",
  "billing": "active",
  "guardian": "active"
}
```

---

## 📋 Variáveis de Ambiente Necessárias

### Obrigatórias (sem estas, o app não inicia)

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `SUPABASE_PROJECT_URL` | URL do projeto Supabase | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) | Supabase Dashboard → Settings → API → service_role |
| `SYSTEM_ADMIN_ID` | ID do admin do sistema | Defina um valor único, ex: `admin_$(date +%s)` |
| `SYSTEM_API_KEY` | Chave API para autenticação | Gere uma string segura: `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | Chave da OpenRouter | https://openrouter.ai/keys |

### Opcionais (para funcionalidades extras)

| Variável | Funcionalidade |
|----------|---------------|
| `PRIVATE_KEY` | Operações on-chain (carteira ETH) |
| `ARBITRUM_RPC_URL` | Transações na Arbitrum |
| `SWARM_AUTOSTART` | Auto-iniciar Swarm M2M (`true`/`false`) |
| `TWITTER_BEARER_TOKEN` | RadarShix - Monitoramento social |

---

## 🔧 Configurações do Projeto

### railway.json (já configurado)

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci --only=production"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "sleepApplication": false
  }
}
```

### nixpacks.toml (fallback)

Se o Railway não detectar o `railway.json`, usará o `nixpacks.toml`:

```toml
[phases.build]
cmds = ["npm ci --only=production"]

[phases.setup]
nixPkgs = ["nodejs-20_x", "nodePackages.npm", "git"]

[start]
cmd = "npm start"
```

---

## 💰 Preços Railway (sem necessidade de cartão imediato)

| Plano | Créditos | Preço | Ideal para |
|-------|----------|-------|------------|
| **Hobby** | $5/mês | $5/mês | Desenvolvimento, testes |
| **Pro** | $10/mês + uso | $10/mês + | Produção com tráfego |
| **Enterprise** | Custom | Custom | Escala empresarial |

**Vantagens:**
- ✅ Não exige cartão de crédito para começar (trial de $5)
- ✅ Deploy via GitHub automático
- ✅ SSL automático
- ✅ Domínio personalizado gratuito (*.railway.app)
- ✅ Logs em tempo real
- ✅ Banco de dados PostgreSQL incluído (opcional)

---

## 🚨 Troubleshooting

### Erro: "Missing ENV variables"

Solução: Adicione as variáveis em Railway Dashboard → Variables

### Erro: "Cannot find module"

Solução: Verifique se `npm ci --only=production` está correto no `railway.json`

### Health Check Falhando

Verifique se o endpoint `/health` responde:
```bash
curl http://localhost:3000/health  # Teste local primeiro
```

### Porta incorreta

O Railway define a variável `PORT` automaticamente. O código já está preparado:
```javascript
const PORT = process.env.PORT || 3000;  // server/index.js:53
```

---

## 🔄 Alternativa: Render.com

Se preferir Render em vez de Railway:

1. Acesse https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Build Command:** `npm ci --only=production`
   - **Start Command:** `npm start`
   - **Plan:** Free (dorme após 15min inatividade) ou Starter ($7/mês)

---

## 📞 Suporte

- Railway Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

---

**🎯 Resultado:** GXEON AI rodando 100% independente do Google Cloud, com deploy simplificado e sem burocracia de faturação.
