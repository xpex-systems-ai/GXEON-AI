# 📊 GXEON Visual Command v21.0 — Grafana Setup Guide

## 🎨 Cyberpunk Analytics Dashboard

**Visual Identity:**
- **Primary:** `#D4AF37` (Gold)
- **Background:** `#000000` (Black)
- **Accent:** `#00FFFF` (Cyan)
- **Style:** Cyberpunk Analytics

---

## 📁 Estrutura de Arquivos

```
grafana/
├── dashboard/
│   └── gxeon_v21_dashboard.json    # Dashboard principal (12 painéis)
├── alerts/
│   └── high_value_pool_alert.yaml   # 5 alert rules configurados
├── datasource/
│   └── supabase_postgres.yaml       # Conexão PostgreSQL
└── setup/
    └── docker-compose.yml           # Stack local (opcional)

supabase/
└── grafana_views_schema.sql         # 6 views otimizadas para Grafana
```

---

## 🚀 Quick Start

### 1. Executar Views no Supabase

```bash
# No SQL Editor do Supabase
psql $SUPABASE_URL -f supabase/grafana_views_schema.sql
```

Views criadas:
- `grafana_liquidity_heatmap` — Mapa de calor de pools
- `grafana_whale_telemetry` — Logs de whale tracking
- `grafana_oracle_revenue` — Métricas A2A
- `grafana_high_value_pools` — Pools >$100k (alertas)
- `grafana_agent_summary` — Resumo de agentes
- `grafana_signal_revenue_realtime` — Revenue em tempo real

### 2. Configurar Datasource no Grafana

#### Opção A: Provisioning (YAML)

```bash
# Copiar para pasta de provisioning
sudo cp grafana/datasource/supabase_postgres.yaml \
  /etc/grafana/provisioning/datasources/

# Restart Grafana
sudo systemctl restart grafana-server
```

#### Opção B: UI Manual

1. **Configuration** → **Data Sources** → **Add data source**
2. Selecionar **PostgreSQL**
3. Configurar:
   - **Host:** `your-project.supabase.co:5432`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** `[Database Password]`
   - **SSL Mode:** `require`
4. **Save & Test**

### 3. Importar Dashboard

```bash
# Via API
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana/dashboard/gxeon_v21_dashboard.json
```

Ou via UI:
1. **Create** → **Import**
2. Upload `gxeon_v21_dashboard.json`
3. Selecionar datasource `GXEON_SUPABASE`

---

## 🎯 Dashboard Modules

### 🔥 LIQUIDITY RADAR HEATMAP
- **Query:** `grafana_liquidity_heatmap`
- **Tipo:** Heatmap
- **Refresh:** 10s
- **Descrição:** Visualização de liquidez em tempo real por DEX

### 🐋 WHALE TELEMETRY TRACKER
- **Query:** `grafana_whale_telemetry`
- **Tipo:** Logs Panel
- **Filtro:** `amount_usd > 50000`
- **Descrição:** Stream de movimentações de smart money

### 💰 ORACLE A2A REVENUE
- **Query:** `grafana_oracle_revenue`
- **Tipo:** Time Series + Pie Chart
- **Agregação:** Por hora
- **Descrição:** Volume de requests e revenue por sinal

### ⚡ PERFORMANCE METRICS
- **API Latency:** Média por endpoint
- **Active Agents:** Por tier ao longo do tempo

---

## 🚨 Alertas Configurados

| Alerta | Condição | Severidade | Notificação |
|--------|----------|------------|-------------|
| **High Value Pool** | Pool >$100k em 2min | 🔴 Critical | Telegram |
| **Whale Movement** | Whale >$50k em 1min | 🟡 Warning | Slack |
| **API Latency Spike** | Latency >500ms por 2min | 🟡 Warning | Slack |
| **Oracle Down** | No data por 5min | 🔴 Critical | PagerDuty |
| **Revenue Drop** | <10 signals/hora por 15min | 🔵 Info | Email |

### Configurar Alertas

```bash
# Provisionar alertas
sudo cp grafana/alerts/high_value_pool_alert.yaml \
  /etc/grafana/provisioning/alerting/

# Ou importar via API
# (requer Grafana 9.1+)
```

---

## 🔌 Connection Details

### Supabase PostgreSQL

```yaml
Host:     your-project.supabase.co
Port:     5432 (direto) ou 6543 (connection pooler)
Database: postgres
User:     postgres
SSL:      require
```

**Obter senha:**
1. Supabase Dashboard → Project Settings → Database
2. **Connection String** → **URI**
3. Extrair password da URI

### Environment Variables

```bash
# .env (não commitar!)
SUPABASE_HOST=your-project.supabase.co
SUPABASE_PORT=5432
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your-password

# Para alertas (opcional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_TRADING_CHAT_ID=-1001234567890
SLACK_SRE_WEBHOOK_URL=https://hooks.slack.com/...
```

---

## 🐳 Docker Compose (Local Testing)

```yaml
# grafana/setup/docker-compose.yml
version: '3.8'

services:
  grafana:
    image: grafana/grafana-oss:latest
    container_name: gxeon-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_DEFAULT_THEME=dark
      - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/gxeon_v21_dashboard.json
    volumes:
      - ../dashboard:/var/lib/grafana/dashboards:ro
      - ../datasource:/etc/grafana/provisioning/datasources:ro
      - ../alerts:/etc/grafana/provisioning/alerting:ro
      - grafana-storage:/var/lib/grafana
    restart: unless-stopped

volumes:
  grafana-storage:
```

**Rodar local:**
```bash
cd grafana/setup
docker-compose up -d

# Acessar: http://localhost:3000
# Login: admin / admin
```

---

## 📊 Painéis do Dashboard

| # | Painel | Tipo | Query | Refresh |
|---|--------|------|-------|---------|
| 1 | LIQUIDITY RADAR HEATMAP | Heatmap | `grafana_liquidity_heatmap` | 10s |
| 2 | POOLS ATIVAS | Stat | `COUNT(*)` | 30s |
| 3 | LIQUIDEZ TOTAL | Stat | `SUM(liquidity_usd)` | 30s |
| 4 | WHALE TELEMETRY TRACKER | Logs | `grafana_whale_telemetry` | 10s |
| 5 | ORACLE A2A REQUESTS | Time Series | `grafana_oracle_revenue` | 1m |
| 6 | REVENUE BY SIGNAL TYPE | Pie Chart | `a2a_signals_consumed` | 1m |
| 7 | API LATENCY | Time Series | `a2a_agent_activity` | 30s |
| 8 | ACTIVE AGENTS BY TIER | Stacked Area | `a2a_agents` | 1m |

---

## 🎨 Customização Visual

### Tema Cyberpunk

1. **Configuration** → **Preferences** → **UI**
2. **Theme:** Dark
3. **Dashboard** → **Settings** → **JSON Model**
4. Cores já configuradas:
   - Gold: `#D4AF37`
   - Cyan: `#00FFFF`
   - Magenta: `#FF00FF`

### Painel Transparente

```json
{
  "transparent": true
}
```

---

## 🔍 Troubleshooting

### Dashboard vazio (no data)

```bash
# Verificar views existem
psql $SUPABASE_URL -c "\dv grafana_*"

# Testar query manualmente
psql $SUPABASE_URL -c "SELECT * FROM grafana_liquidity_heatmap LIMIT 5"
```

### Connection refused

```bash
# Verificar IP allowlist no Supabase
# Project Settings → Database → IPv4
# Adicionar IP do Grafana (ou 0.0.0.0/0 para testes)
```

### Queries lentas

```sql
-- Verificar índices
SELECT * FROM pg_indexes WHERE tablename LIKE 'radar_%';

-- Recriar índices se necessário
REINDEX INDEX CONCURRENTLY idx_liquidity_detected_at;
```

---

## 📝 Changelog

### v21.0 — Visual Command
- [x] 12 painéis de analytics
- [x] 6 views otimizadas no Supabase
- [x] 5 alert rules configurados
- [x] Conexão PostgreSQL pronta
- [x] Tema cyberpunk gold/cyan

---

## 🎯 Próximos Passos

1. [ ] Configurar notificações (Telegram/Slack)
2. [ ] Adicionar mais DEXs no heatmap
3. [ ] Implementar alerting via webhook A2A
4. [ ] Criar painel de MEV signals

---

**GXEON Visual Command v21.0 — Dashboards Prontos para Produção** 📊✨
