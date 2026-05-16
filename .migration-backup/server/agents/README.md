# 🐝 GXEON SWARM M2M v3.0

**Sistema de Enxame Autônomo M2M - Colmeia Predadora de Mercado**

---

## Visão Geral

O Swarm M2M é um sistema multi-agente autônomo projetado para:
- 🎯 **Prospecção**: Encontrar bots e contratos ativos no ecossistema blockchain
- 🤝 **Outreach**: Enviar propostas automatizadas via múltiplos canais
- 💰 **Conversão**: Converter leads em assinantes da API GXEON na RapidAPI
- 📊 **Otimização**: Auto-otimizar baseado em métricas de ROI

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    🐝 SWARM CONTROLLER                      │
│                  (Hive Mind Coordination)                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   SCOUTER     │    │ INFILTRATOR   │    │   ROI ENGINE  │
│  (Prospecção) │    │  (Outreach)   │    │ (Otimização)  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
   Arbiscan              M2M Protocol            Supabase
   GitHub                GitHub Issues          RapidAPI
   RapidAPI              Email API
```

---

## Componentes

### 🤖 Scouter (`scouter.js`)
Agente de prospecção que escaneia:
- **Arbiscan**: Contratos ativos na Arbitrum com alto volume
- **GitHub**: Repositórios MEV e trading bots
- **RapidAPI**: Competidores no marketplace

### 🕵️ Infiltrator (`infiltrator.js`)
Agente de outreach que envia:
- Propostas M2M criptografadas
- Issues/PRs em repositórios
- Emails diretos (quando disponível)

### 🐝 Controller (`swarm_controller.js`)
Orquestrador que:
- Coordena execução dos agentes
- Monitora conversões RapidAPI
- Otimiza baseado em ROI
- Gera relatórios de performance

---

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/swarm/health` | Health check público |
| GET | `/api/v1/swarm/status` | Status completo (auth) |
| POST | `/api/v1/swarm/start` | Inicia swarm |
| POST | `/api/v1/swarm/stop` | Para swarm |
| POST | `/api/v1/swarm/execute` | Executa ciclo manual |
| GET | `/api/v1/swarm/stats` | Estatísticas de ROI |
| POST | `/api/v1/swarm/config` | Atualiza configuração |

---

## Configuração

Adicione ao `.env`:

```env
# API Keys para scanning
ARBISCAN_API_KEY=your_key_here
GITHUB_TOKEN=your_token_here
RAPIDAPI_KEY=your_key_here

# Swarm Config
SWARM_ENCRYPTION_KEY=your_32_char_key_here
SWARM_INTERVAL=3600000
SWARM_MAX_AGENTS=50
SWARM_AUTOSTART=true
```

---

## Uso

### Iniciar via NPM:
```bash
# Setup do banco de dados
npm run swarm:setup

# Iniciar modo autônomo
npm run swarm:start

# Executar ciclo único
npm run swarm:once
```

### Iniciar via API:
```bash
curl -X POST https://seu-replit.replit.app/api/v1/swarm/start \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Auto-start no servidor:
O swarm pode iniciar automaticamente com o servidor se `SWARM_AUTOSTART=true`.

---

## Banco de Dados

Execute o schema em `supabase/swarm_m2m_schema.sql` via SQL Editor do Supabase.

**Tabelas principais:**
- `swarm_targets`: Alvos descobertos
- `swarm_cycles`: Registro de execuções
- `swarm_m2m_logs`: Logs de comunicação M2M
- `rapidapi_conversions`: Conversões rastreadas

---

## Métricas de ROI

O sistema calcula automaticamente:
- **CAC**: Custo de Aquisição de Cliente
- **LTV**: Lifetime Value
- **ROI**: Return on Investment

View disponível: `swarm_performance`

---

## Segurança

- Comunicação M2M criptografada (AES-256-GCM)
- Rate limiting integrado
- Validação de endpoints
- Logs auditáveis

---

## Modo ZERO_HUMAN_INTERVENTION

Quando ativo, o sistema:
1. Executa scans automáticos a cada hora
2. Envia propostas sem intervenção
3. Monitora conversões 24/7
4. Otimiza estratégia baseada em ROI
5. Gera relatórios automáticos

---

**Powered by GXEON Systems** 🔥
