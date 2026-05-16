# 🔥 DEPLOY IMEDIATO — Correção Railway Build Fail

## ❌ Problema
Railway falhou no build: `npm ci --only=production` (configuração antiga)

## ✅ Solução: Deploy via ZIP Atualizado

### Arquivo: `phoenix-sentinel-v22-deploy.zip` (383 KB)

---

## 🚀 PASSO A PASSO (2 minutos)

### 1. Acesse Railway Dashboard
```
https://railway.app/project/gxeon-ia-production
```

### 2. Vá em Settings → Deploy → Source
- Mude de **"GitHub"** para **"Empty Service"**
- Ou clique em **"New Deployment"** → **"Upload from ZIP"**

### 3. Faça Upload
- Selecione: `phoenix-sentinel-v22-deploy.zip`
- Aguarde build (2-3 minutos)

### 4. Configure Environment Variables
No Railway Dashboard, adicione:

```env
SUPABASE_PROJECT_URL=https://telxvphgrsvsnxvmjkce.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua-chave-real>
ALCHEMY_API_KEY=<sua-chave>
PRIVATE_KEY=<sua-private-key>
COMMANDER_WALLET_ADDRESS=0x3955d559055DadB7067054cB6E6f974710345224
NODE_ENV=production
PORT=8080
```

### 5. Redeploy
Clique em **"Deploy"** para aplicar as variáveis

---

## 🔧 ALTERNATIVA: Railway CLI

Se preferir deploy via terminal:

```powershell
# Login
npx railway login

# Link projeto
npx railway link --project gxeon-ia-production

# Deploy
npx railway up
```

---

## 📋 CORREÇÕES NO DOCKERFILE (v22)

| Antes | Depois |
|-------|--------|
| `FROM node:20-alpine` | `FROM node:22-alpine` |
| `npm ci --only=production` | `npm install --legacy-peer-deps \|\| npm install --force` |
| Sem cache bust | `ARG CACHE_BUST=1` |
| Sem Sentinel | `Sentinel Guardian v1.0` ativado |

---

## ✅ Status

- ✅ Dockerfile: Node 22 Alpine
- ✅ npm install: Bypass ci
- ✅ Sentinel Guardian: Ativado
- ✅ ZIP: Pronto para upload

**Treasury:** `0x3955d559055DadB7067054cB6E6f974710345224`

🔥 **Deploy Phoenix-Sentinel v22 agora!**
