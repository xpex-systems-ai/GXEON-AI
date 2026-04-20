# 🌑 GXEON GRAFANA NEXUS — Black & Gold Monitoring

## 🎛️ Overview

Dashboards profissionais para monitoramento do ecossistema GXEON Nexus v4.0 em tempo real.

**Arquitetura:** Prometheus + InfluxDB + Grafana 10.x  
**Estética:** Black & Gold Sovereign Theme  
**Refresh:** 5 segundos (real-time)

---

## 📊 Dashboards Disponíveis

| Dashboard | ID | Métricas Principais |
|-----------|-----|---------------------|
| **🌑 SOVEREIGN COMMAND** | `gxeon-command` | Revenue, Agents, Uptime |
| **⚡ FLASH-SWEEPER OPS** | `flash-sweeper` | Execuções, Lucro, Gás |
| **🎯 RADAR INTELLIGENCE** | `radar-shix` | Pools, Whales, Mempool |
| **💰 TREASURY FLOW** | `treasury` | 70/30 Split, Acumulado |
| **🛡️ SHIELD HEALTH** | `guardian` | Latência, Erros, Recovery |

---

## 🎨 Black & Gold Color Palette

```json
{
  "theme": "dark",
  "colors": {
    "primary": "#FFD700",      // Gold - Revenue, Primary
    "secondary": "#0D1117",    // Black - Background
    "accent": "#00D4FF",       // Cyan - Info, Agents
    "success": "#00FF88",      // Green - Online, Profit
    "warning": "#FF6B00",        // Orange - Caution
    "danger": "#FF2D2D",       // Red - Alerts, Errors
    "muted": "#8B949E"         // Gray - Secondary text
  }
}
```

---

## 🚀 Setup

### 1. Instalar Grafana

```bash
# Docker
sudo docker run -d -p 3000:3000 \
  --name=grafana \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana:latest

# Ou download direto
wget https://dl.grafana.com/oss/release/grafana-10.x.x.linux-amd64.tar.gz
```

### 2. Configurar Data Sources

#### Prometheus (Métricas)
```yaml
# datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
```

#### InfluxDB (Time-series)
```yaml
# datasources/influxdb.yml
apiVersion: 1
datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://localhost:8086
    database: gxeon_metrics
```

### 3. Importar Dashboards

```bash
# Via API
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @dashboards/gxeon_sovereign_command.json

# Ou via UI
# Grafana → Create → Import → Upload JSON
```

---

## 📈 Métricas Exportadas

### Flash-Sweeper
```javascript
// server/services/flashSweeper.js
gxeon_flash_sweeper_executions_total
gxeon_flash_sweeper_profit_usd
gxeon_flash_sweeper_gas_cost
gxeon_flash_sweeper_success_rate
```

### Radar SHIX
```javascript
// server/services/radarShix.js
gxeon_radar_shix_pools_tracked
gxeon_radar_shix_smart_money_events
gxeon_radar_shix_high_liquidity_alerts
gxeon_radar_shix_scans_per_second
```

### Guardian Shield
```javascript
// server/index.js
gxeon_guardian_health_score
gxeon_guardian_errors_caught
gxeon_guardian_uptime_percent
gxeon_guardian_recovery_count
```

### Pandora Protocol (Billing)
```javascript
gxeon_revenue_total
gxeon_revenue_by_source{source="api_calls"}
gxeon_revenue_by_source{source="flash_loan_tax"}
gxeon_revenue_by_source{source="subscriptions"}
gxeon_agents_by_tier{tier="pro"}
gxeon_agents_active
```

### Treasury
```javascript
gxeon_treasury_reinvestment_percent
gxeon_treasury_commander_percent
gxeon_treasury_total_accumulated
```

---

## 🔔 Alertas Configurados

### Critical Alerts
- 🚨 Revenue drop > 50% (1h)
- 🚨 Agent count drop > 30% (5min)
- 🚨 Flash-Sweeper error rate > 10%
- 🚨 Guardian Shield health < 70%

### Warning Alerts
- ⚠️ Revenue drop > 20% (30min)
- ⚠️ API latency > 200ms
- ⚠️ WebSocket disconnections > 5/min

### Info Alerts
- ℹ️ New high-liquidity pool detected
- ℹ️ Whale transfer > 100 ETH
- ℹ️ Flash loan execution successful

---

## 🌐 URLs de Acesso

| Ambiente | URL |
|----------|-----|
| **Local** | http://localhost:3000 |
| **Railway** | https://gxeon-ai.xmentex2.replit.app/grafana |
| **Production** | https://grafana.gxeon.ai |

---

## 📱 Mobile Dashboard

Acesse via Grafana Mobile App:
```
Org: GXEON Systems
URL: https://gxeon-ai.xmentex2.replit.app/grafana
Login: [Contact Administrator]
```

---

## 🎨 Customização de Tema

### Via UI
```
Grafana → Configuration → Preferences → UI Theme: Dark
```

### Via API
```bash
curl -X PUT \
  http://admin:admin@localhost:3000/api/org/preferences \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}'
```

---

## 🔐 Segurança

- ✅ HTTPS obrigatório em produção
- ✅ Authentication via JWT ou OAuth
- ✅ Read-only access para viewers
- ✅ Admin access restrito

---

## 👑 Sovereign Architect

**Júnior Sena** — Sovereign AI Architect  
📧 gxeon.ai@gmail.com  
🌐 https://gxeon-ai.xmentex2.replit.app

---

<div align="center">

## 🌑 **The Sovereign Grid Monitors All**

*"Data is the new oil. Dashboards are the new refineries."*

</div>
