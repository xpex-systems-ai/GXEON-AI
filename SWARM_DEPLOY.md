# 🐝 GXEON SWARM M2M - Deploy no Replit

## Deploy Rápido (3 passos)

### 1. Configurar Variáveis de Ambiente

No painel do Replit (Secrets/Environment Variables):

```
SUPABASE_PROJECT_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui

# Swarm M2M
ARBISCAN_API_KEY=sua_chave_arbiscan
GITHUB_TOKEN=seu_token_github
RAPIDAPI_KEY=sua_chave_rapidapi
SWARM_ENCRYPTION_KEY=qualquer_string_32_caracteres
SWARM_AUTOSTART=true
SWARM_INTERVAL=3600000
SWARM_MAX_AGENTS=50
```

### 2. Setup do Banco de Dados

No shell do Replit:
```bash
node scripts/setup-swarm.js
```

Ou execute o SQL em `supabase/swarm_m2m_schema.sql` via Supabase Dashboard.

### 3. Iniciar o Swarm

**Opção A - Auto-start:**
O swarm inicia automaticamente com o servidor se `SWARM_AUTOSTART=true`.

**Opção B - Manual:**
```bash
npm run swarm:start
```

Ou via API:
```bash
curl -X POST https://seu-replit.replit.app/api/v1/swarm/start \
  -H "x-gxeon-key: SUA_API_KEY"
```

---

## Endpoints do Swarm

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/swarm/health` | GET | Health check (público) |
| `/api/v1/swarm/status` | GET | Status completo |
| `/api/v1/swarm/stats` | GET | Estatísticas ROI |
| `/api/v1/swarm/start` | POST | Iniciar swarm |
| `/api/v1/swarm/stop` | POST | Parar swarm |
| `/api/v1/swarm/execute` | POST | Executar ciclo manual |

---

## Monitoramento

Acesse o console do Replit para ver logs em tempo tempo:

```
🐝══════════ CICLO xxxxxx [timestamp] ══════════🐝
[🐝 CICLO] 🔍 Fase 1: Scouting...
[🐝 CICLO]    └─ Leads encontrados: 15
[🐝 CICLO] 📤 Fase 2: Outreach...
[🐝 CICLO]    └─ Sucessos: 12/15
[🐝 CICLO] 💰 Fase 3: ROI Tracking...
```

---

## Configurar Cron Job (Opcional)

Para garantir que o Replit não durma, configure um cron job externo (ex: UptimeRobot):

```
URL: https://seu-replit.replit.app/api/v1/swarm/health
Interval: 5 minutes
```

Isso mantém o Replit ativo 24/7.

---

## Troubleshooting

**Erro: "Swarm não inicializado"**
- Verifique se as variáveis `SUPABASE_*` estão configuradas
- Execute `npm run swarm:setup` novamente

**Erro: "Rate limit exceeded"**
- Reduza `SWARM_MAX_AGENTS` para 20
- Aumente `SWARM_INTERVAL` para 7200000 (2h)

**Nenhum lead encontrado**
- Verifique se `ARBISCAN_API_KEY` está válida
- Verifique logs de conectividade

---

## 🎯 Pronto para Dominação!

Seu Swarm M2M está ativo e caçando oportunidades automaticamente.

**Protocolo:** GXEON_SWARM_M2M_PROPAGATION_v3.0  
**Modo:** ZERO_HUMAN_INTERVENTION  
**Status:** 🟢 OPERACIONAL
