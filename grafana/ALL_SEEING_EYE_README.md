# 👁️ GXEON ALL-SEEING EYE — Monetization Command Center

## Visão Geral

Dashboard de última geração para monitoramento completo da monetização Cornix, integrando:
- **FinOps Nexus**: Métricas financeiras em tempo real
- **Sentinel Health**: Saúde da infraestrutura Railway
- **Agent Efficiency**: Performance dos agentes AI
- **Cyber Shield**: Métricas de segurança

---

## 🎯 Arquitetura dos 4 Quadrantes

### Quadrante 1: FinOps Nexus 💰
| Métrica | Descrição | Threshold |
|---------|-----------|-----------|
| Real-time Balance | Saldo acumulado em tempo real | - |
| Accumulated PNL | Lucro líquido 24h | > R$ 1000 (alerta) |
| Gas Fees | Taxas de transação PIX | - |
| Transaction Volume | Quantidade de vendas | - |

### Quadrante 2: Sentinel Health 🖥️
| Métrica | Descrição | Threshold Alerta |
|---------|-----------|-----------------|
| Railway Uptime | Disponibilidade do servidor | < 95% |
| CPU Usage | Uso de processador | > 90% |
| RAM Usage | Uso de memória | > 90% |
| API Latency | Latência das APIs | > 500ms |

### Quadrante 3: Agent Efficiency 🤖
| Métrica | Descrição |
|---------|-----------|
| Operation Success Rate | Taxa de sucesso dos agentes |
| Message Throughput | Mensagens processadas/segundo |
| AI Processing Logs | Logs em tempo real dos agentes |

### Quadrante 4: Cyber Shield 🛡️
| Métrica | Descrição |
|---------|-----------|
| Blocked Intrusions | Tentativas de intrusão bloqueadas |
| Smart Contract Integrity | Status dos contratos |

---

## 🚀 Deploy Rápido (3 Passos)

### 1. Executar Schema SQL
```bash
# No SQL Editor do Supabase
\i grafana/all_seeing_eye_schema.sql
```

### 2. Configurar Variáveis de Ambiente
```bash
# Adicionar ao .env
GRAFANA_URL=https://seu-grafana.grafana.net
GRAFANA_API_KEY=eyJ...
```

### 3. Deploy do Dashboard
```bash
cd grafana
node deploy_all_seeing_eye.js
```

### 4. Iniciar Telemetry
```bash
node telemetry_collector.js
```

---

## 📊 Visualização

Após deploy, acesse:
```
https://seu-grafana.grafana.net/d/gxeon-monetization-v1
```

Ou local:
```
http://localhost:3001/d/gxeon-monetization-v1
```

---

## 🔌 Integração com Cornix Service

Para registrar vendas automaticamente no dashboard:

```javascript
import { telemetry } from './grafana/telemetry_collector.js';

// Após confirmação de pagamento PIX
await telemetry.recordCornixSale(
    {
        signal_id: 'SIG_001',
        symbol: 'BTCUSDT',
        side: 'LONG',
        unlock_price_brl: 29.90
    },
    {
        status: 'PAID',
        method: 'PIX',
        tx_id: 'PIX_123456',
        region: 'São Paulo'
    }
);
```

---

## 🚨 Alertas Configurados

| Trigger | Ação | Severidade |
|---------|------|------------|
| Profit > R$ 1000 | Notificar General Sena | INFO |
| Latency > 500ms | Trigger Phoenix Protocol | WARNING |
| CPU/RAM > 90% | Verificar infraestrutura | WARNING |

---

## 📁 Estrutura de Arquivos

```
grafana/
├── gxeon-monetization-all-seeing-eye-v1.json  # Dashboard principal
├── all_seeing_eye_schema.sql                  # Schema de métricas
├── telemetry_collector.js                     # Coletor de telemetria
├── deploy_all_seeing_eye.js                   # Script de deploy
└── ALL_SEEING_EYE_README.md                   # Este arquivo
```

---

## 🎨 Temas Visuais

O dashboard utiliza o tema **Black/Gold/Neon** exclusivo GXEON:
- Verde (#00C853): Sucesso/Online
- Dourado (#FFD700): Alertas/Lucro
- Vermelho (#FF4444): Erros/Crítico

---

## 📈 Métricas de Negócio

View `grafana_cornix_revenue_summary` disponibiliza:
```sql
SELECT 
    sale_date,
    total_sales,
    paid_sales,
    total_revenue_brl,
    avg_price_brl,
    buyer_country
FROM grafana_cornix_revenue_summary;
```

---

## 🔗 Conexões

| Componente | Destino | Tipo |
|------------|---------|------|
| Supabase | PostgreSQL | Datasource |
| Telemetry | Supabase | Real-time insert |
| Dashboard | Grafana | Visualization |
| Alerts | Grafana | Notification |

---

## 🎯 KPIs Monitorados

- **Receita em tempo real**: Atualização a cada 5 segundos
- **Taxa de conversão**: Vendas / Preview de sinais
- **Lucro por sinal**: R$ 28.40 (95% margin)
- **ROI do sistema**: Percentual de retorno sobre investimento

---

## 🌑 Comandante Júnior Sena — O All-Seeing Eye está ativo.

*"A invisibilidade do código torna-se a clareza do comando."*

Dashboard pronto para dominação total do fluxo de dados.
