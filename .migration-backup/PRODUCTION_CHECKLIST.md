# 🚀 GXEON Production Checklist

> Status: **BLOCKED** - Requer ações antes do deploy
> 
> Audit: `logs/production_readiness_audit_*.json`

---

## ❌ CRÍTICOS (Resolver Primeiro)

### 1. Iniciar Servidor Express
```bash
# Terminal 1
npm start

# Verificar se subiu
# Deve ver: "Server running on port 3000"
```

**Validação:** `curl http://localhost:3000/v1/signals/health`

---

### 2. Configurar Supabase (Ledger)
```bash
# Criar .env se não existir
cat > .env << 'EOF'
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF

# Ou setar diretamente no Railway/Render dashboard
```

**Validação:** `node scripts/gx_production_readiness_audit.js`

---

### 3. Iniciar Scanners (Daemon Mode)
```bash
# Terminal 2 - Bounty Scanner
node core/bounty_scanner_agent_enhanced.js daemon

# Terminal 3 - Gelato Scanner  
node core/gelato_scanner_enhanced.js daemon
```

**Validação:** Processos aparecem em `tasklist` (Windows) ou `ps aux` (Linux)

---

### 4. Deploy para Acesso Público

#### Opção A: Railway (Recomendado)
```bash
# Instalar CLI
npm i -g @railway/cli

# Login e deploy
railway login
railway init
railway up

# Obter URL pública
railway domain
```

#### Opção B: Render
1. Conectar GitHub repo
2. Setar build command: `npm install`
3. Setar start command: `npm start`
4. Adicionar env vars no dashboard

#### Opção C: VPS/Dedicado
```bash
# Usar PM2 para produção
npm i -g pm2

pm2 start server/index.js --name "gxeon-api"
pm2 start core/bounty_scanner_agent_enhanced.js --name "bounty-scanner"
pm2 start core/gelato_scanner_enhanced.js --name "gelato-scanner"

pm2 save
pm2 startup
```

---

## 🟡 RECOMENDAÇÕES (Pós-Deploy)

### 5. Configurar Telegram (Opcional)
1. Conversar com [@BotFather](https://t.me/botfather)
2. Criar novo bot, obter token
3. Adicionar ao `.env`:
```
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

### 6. Configurar DNS Custom (Opcional)
```
CNAME: api.seudominio.com → seu-app.railway.app
```

### 7. SSL/TLS
- Railway: Automático
- Render: Automático
- VPS: Use Let's Encrypt + Certbot

---

## 📋 Validação Pós-Deploy

Execute novamente o audit:
```bash
node scripts/gx_production_readiness_audit.js
```

**Esperado:**
- ✅ Gateway Online: PASS
- ✅ API Validation: PASS
- ✅ Scanner Liveness: PASS (ou WARNING se ainda subindo)
- ✅ Signal Flow: PASS
- ✅ Ledger Write: PASS
- ✅ Public Exposure: PASS
- ✅ Fail Safe: PASS

---

## 💰 Pronto para Monetização

Quando todos os checks passarem:

1. **Primeiro usuário de teste:**
```bash
curl -X POST https://sua-url-publica/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "tier": "PRO"}'
```

2. **Testar consumo:**
```bash
curl https://sua-url-publica/v1/signals \
  -H "X-API-Key: chave_retornada_no_registro"
```

3. **Verificar ledger:**
- Acessar Supabase dashboard
- Confirmar eventos em `GX_Billing_Ledger`

---

## 📊 Projeção de Receita (Realista)

| Métrica | Valor |
|---------|-------|
| Preço/sinal | $0.01 |
| Target usuários | 50 |
| Sinais/user/mês | 100 |
| **Receita mensal** | **~$50** |

---

## 🆘 Troubleshooting

### Erro: "Cannot find module"
```bash
npm install
```

### Erro: "Port already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux
lsof -i :3000
kill -9 <PID>
```

### Erro: Supabase connection failed
- Verificar se URL está completa (com `https://`)
- Verificar se é Service Role Key (não anon key)
- Verificar se IP não está bloqueado no Supabase

---

**Última atualização:** 23/04/2026  
**Próximo audit recomendado:** Após deploy
