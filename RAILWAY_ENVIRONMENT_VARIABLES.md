# 🚂 GXEON AI — Variáveis de Ambiente para Railway

> **Arquivo gerado automaticamente para deploy no Railway.app**
> **Data:** 17/04/2026 | **Versão:** 2.0.0-sovereign

---

## ⚠️ VARIÁVEIS OBRIGATÓRIAS (Mínimo para iniciar)

Configure estas primeiro no Railway Dashboard:

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `SUPABASE_PROJECT_URL` | URL do projeto Supabase | https://supabase.com/dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (não anon!) | Supabase → Project Settings → API |
| `SUPABASE_URL` | Mesma coisa que acima | Copiar de SUPABASE_PROJECT_URL |
| `SYSTEM_ADMIN_ID` | ID do admin do sistema | Gerar: `admin_$(date +%s)` |
| `SYSTEM_API_KEY` | Chave API segura (mín. 32 chars) | `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | API Key da OpenRouter | https://openrouter.ai/keys |
| `PORT` | Porta do servidor | `8080` |
| `NODE_ENV` | Ambiente | `production` |

---

## 🔧 VARIÁVEIS OPCIONAIS — Blockchain Arbitrum (Para monetização real)

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `ARBITRUM_RPC_URL` | RPC endpoint Arbitrum | https://alchemy.com ou https://quicknode.com |
| `PRIVATE_KEY` | Chave privada da wallet executor | MetaMask/Trust (com fundos em Arbitrum) |
| `VAULT_ADDRESS` | Endereço do contrato Vault/Treasury | Após deploy do contrato |
| `GXEON_TREASURY_ADDRESS` | Alternativa para VAULT_ADDRESS | Mesmo que acima |

---

## 🐝 VARIÁVEIS OPCIONAIS — Swarm M2M (Colmeia Predadora)

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `SWARM_AUTOSTART` | Iniciar swarm automaticamente | `true` |
| `SWARM_INTERVAL` | Intervalo entre ciclos (ms) | `3600000` (1h) |
| `SWARM_MAX_AGENTS` | Máximo de agentes concorrentes | `50` |
| `SWARM_ENCRYPT` | Habilitar criptografia M2M | `true` |
| `SWARM_OPTIMIZE` | Otimização automática por ROI | `true` |
| `SWARM_PROFIT_THRESHOLD` | ROI mínimo para manter operação | `1.0` |
| `SWARM_ENCRYPTION_KEY` | Chave de 32 caracteres | `openssl rand -hex 16` |
| `GITHUB_TOKEN` | Token para scan de repos MEV | https://github.com/settings/tokens |
| `ARBISCAN_API_KEY` | API key Arbiscan | https://arbiscan.io/apis |

---

## 📡 VARIÁVEIS OPCIONAIS — RadarShix (Monitoramento Social)

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `TWITTER_BEARER_TOKEN` | Twitter API v2 Bearer Token | https://developer.twitter.com |
| `TWITTER_API_KEY` | Opcional — API Key v2 | Mesmo que acima |

---

## 🤖 VARIÁVEIS OPCIONAIS — AI Adicional

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `HUGGINGFACE_API_KEY` | HuggingFace Inference API | https://huggingface.co/settings/tokens |
| `DEEPSEEK_API_KEY` | DeepSeek API | https://platform.deepseek.com |
| `GROK_API_KEY` | xAI Grok API | https://x.ai |
| `CHATGPT_API_KEY` | OpenAI API | https://platform.openai.com |
| `BITENSOR_API_KEY` | Bittensor API | Portal Bittensor |

---

## 💰 VARIÁVEIS OPCIONAIS — Monetização

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PAYMENT_ON_TASK_COMPLETION` | Pagar ao completar tarefa | `false` |
| `REINVESTMENT_PERCENT` | % reinvestimento | `70` |
| `COMMANDER_PAYOUT_PERCENT` | % pagamento commander | `30` |
| `MIN_PROFIT_THRESHOLD_USD` | Lucro mínimo em USD | `10` |

---

## 🛡️ VARIÁVEIS OPCIONAIS — Feature Flags

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `ENABLE_FLASHBOTS` | Proteção MEV via Flashbots | `true` |
| `DISABLE_GUARDIAN` | Desativar sistema imunológico | `false` |
| `DISABLE_RADAR` | Desativar RadarShix | `false` |

---

## 📝 COMO CONFIGURAR NO RAILWAY

1. Acesse: https://railway.app/dashboard
2. Selecione o projeto GXEON
3. Vá na aba **"Variables"**
4. Clique em **"Bulk Edit"** (canto superior direito)
5. Cole as variáveis no formato:

```
SUPABASE_PROJECT_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_URL=https://seu-projeto.supabase.co
SYSTEM_ADMIN_ID=admin_1713355200
SYSTEM_API_KEY=sua_chave_segura_aqui_32_caracteres_min
OPENROUTER_API_KEY=sk-or-v1-...
PORT=8080
NODE_ENV=production
```

6. Clique **"Save"**
7. Faça o deploy!

---

## 🔒 SEGURANÇA

- **NUNCA** commite o arquivo `.env` real no git
- Use **Service Role Key** do Supabase (não anon key)
- Proteja a `PRIVATE_KEY` — ela tem acesso aos fundos
- Configure `SYSTEM_API_KEY` com no mínimo 32 caracteres

---

## ✅ CHECKLIST PRÉ-DEPLOY

- [ ] SUPABASE_PROJECT_URL configurado
- [ ] SUPABASE_SERVICE_ROLE_KEY configurado
- [ ] SYSTEM_ADMIN_ID configurado
- [ ] SYSTEM_API_KEY configurado (32+ chars)
- [ ] OPENROUTER_API_KEY configurado
- [ ] PORT=8080 configurado
- [ ] NODE_ENV=production configurado
- [ ] (Opcional) ARBITRUM_RPC_URL configurado
- [ ] (Opcional) PRIVATE_KEY configurada
- [ ] (Opcional) VAULT_ADDRESS configurado

---

**Gerado por:** GXEON_RAILWAY_INJECTION_v11.0  
**Target Engine:** RAILWAY_NIXPACKS_DOCKER  
**Priority:** BACKEND_MONETIZATION_CORE
