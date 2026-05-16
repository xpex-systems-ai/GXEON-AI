# 🔌 CONEXÃO COMPLETA GRAFANA + SUPABASE

## Guia Definitivo para Eliminar "No Data"

---

## 🎯 O que esta conexão faz

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO DE DADOS COMPLETO                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   SUPABASE (PostgreSQL)                                          │
│   ├── grafana_financial_master  ─────────┐                      │
│   ├── grafana_swarm_matrix      ────────┤                      │
│   ├── grafana_profit_realtime   ────────┼──┐                   │
│   └── ... outras views          ────────┘  │                   │
│                                              │                   │
│   Grafana Alloy (Agente Local)              │                   │
│   ├── PostgreSQL Exporter ◄─────────────────┘                   │
│   ├── Scraper (30s interval)                                   │
│   └── Remote Write                                             │
│              │                                                   │
│              ▼                                                   │
│   Grafana Cloud                                                │
│   ├── Dashboards (Visualização)                                │
│   ├── Alerts (Notificações)                                    │
│   └── Logs & Traces                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 PRÉ-REQUISITOS

### 1. Instalar Grafana Alloy

**Windows:**
```powershell
# Usando Chocolatey
choco install grafana-alloy

# Ou download direto
# https://github.com/grafana/alloy/releases/latest
```

**Linux:**
```bash
# Debian/Ubuntu
curl -O -L "https://github.com/grafana/alloy/releases/latest/download/alloy-linux-amd64.deb"
sudo dpkg -i alloy-linux-amd64.deb

# Ou via APT
sudo apt-get install -y grafana-alloy
```

**macOS:**
```bash
brew install grafana-alloy
```

---

## 🔧 CONFIGURAÇÃO PASSO A PASSO

### Passo 1: Obter Credenciais do Grafana Cloud

1. Acesse: https://grafana.com/login
2. Vá em **My Account** → **Grafana Stack** → Seu stack
3. Colete:
   - **URL Prometheus**: `https://prometheus-prod-...grafana.net/api/prom/push`
   - **URL Loki**: `https://logs-prod-...grafana.net/loki/api/v1/push`
   - **User ID**: Número no topo da página
   - **API Key**: **Security** → **API Keys** → **Create API Key** (Role: Admin)

### Passo 2: Obter Credenciais do Supabase

1. Acesse: https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce
2. Vá em **Project Settings** → **Database**
3. Colete **Connection String**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.telxvphgrsvsnxvmjkce.supabase.co:5432/postgres
   ```
4. Ou use **Connection Pooling** (recomendado):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.telxvphgrsvsnxvmjkce.supabase.co:6543/postgres?pgbouncer=true
   ```

### Passo 3: Configurar Variáveis de Ambiente

Crie arquivo `.env` na pasta `grafana/`:

```bash
# .env - GRAFANA CLOUD CREDENTIALS
GRAFANA_REMOTE_WRITE_URL=https://prometheus-prod-...grafana.net/api/prom/push
GRAFANA_REMOTE_WRITE_USERNAME=123456  # Seu User ID
GRAFANA_API_KEY=glsa_xxxxxxxxxxxxxxxx  # Sua API Key
GRAFANA_LOKI_URL=https://logs-prod-...grafana.net/loki/api/v1/push
GRAFANA_TEMPO_ENDPOINT=tempo-...grafana.net:443

# SUPABASE CREDENTIALS (Direct Connection)
SUPABASE_DB_HOST=db.telxvphgrsvsnxvmjkce.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_password_here
SUPABASE_DB_SSL=require
```

**IMPORTANTE**: Nunca commite este arquivo! Ele está no `.gitignore`.

### Passo 4: Testar Conexão Supabase

```bash
# Instalar psql se não tiver
# Windows: https://www.postgresql.org/download/windows/
# Linux: sudo apt-get install postgresql-client

# Testar conexão
psql "postgresql://postgres:YOUR_PASSWORD@db.telxvphgrsvsnxvmjkce.supabase.co:5432/postgres?sslmode=require" -c "SELECT * FROM grafana_financial_master;"
```

Se retornar dados, a conexão está OK!

### Passo 5: Iniciar Grafana Alloy

```bash
# Windows
grafana-alloy.exe run grafana/config/alloy-config.river

# Linux/macOS
alloy run grafana/config/alloy-config.river

# Ou com arquivo de configuração em outro lugar
alloy run --config.file=/path/to/alloy-config.river

# Com variáveis de ambiente
source grafana/.env && alloy run grafana/config/alloy-config.river
```

### Passo 6: Verificar no Grafana Cloud

1. Acesse seu Grafana Cloud: `https://seu-stack.grafana.net`
2. Vá em **Explore** → **Metrics**
3. Procure por métricas:
   - `gxeon_financial_metrics`
   - `gxeon_agent_status`
   - `gxeon_profit_realtime`

Se aparecerem, a conexão está funcionando!

---

## 🔌 MÉTODO ALTERNATIVO: Conexão Direta (Mais Simples)

Se o Grafana Alloy for complexo, use **conexão direta PostgreSQL** no Grafana:

### 1. Instalar Plugin PostgreSQL
```
Grafana → Configuration → Plugins → PostgreSQL → Install
```

### 2. Adicionar Data Source
```
Grafana → Configuration → Data Sources → Add Data Source → PostgreSQL

Host: db.telxvphgrsvsnxvmjkce.supabase.co:5432
Database: postgres
User: postgres
Password: [sua senha]
SSL Mode: require
```

### 3. Criar Dashboard
```
Create → Dashboard → Add Panel

Query (Text Edit Mode):
SELECT 
  timestamp as time,
  total_revenue_24h,
  net_profit_24h,
  roi_24h_pct
FROM grafana_financial_master
```

---

## 📊 QUERIES PRONTAS PARA DASHBOARD

### Painel: Lucro em Tempo Real
```sql
SELECT 
  timestamp as time,
  total_revenue_24h as "Revenue",
  net_profit_24h as "Net Profit",
  total_gas_24h as "Gas Costs"
FROM grafana_financial_master
```

### Painel: Status dos Agentes
```sql
SELECT 
  agent_name as "Agent",
  status_emoji || ' ' || status as "Status",
  active_items as "Active Items",
  daily_value as "Daily Value"
FROM grafana_swarm_matrix
```

### Painel: Profit Acumulado (Time Series)
```sql
SELECT 
  hour as time,
  net_profit_realized as "Profit",
  success_rate_pct as "Success Rate"
FROM grafana_profit_realtime
WHERE hour > NOW() - INTERVAL '6 hours'
ORDER BY hour
```

### Painel: Distribuição de Airdrops
```sql
SELECT 
  eligibility_level as "Tier",
  wallet_count as "Wallets",
  total_estimated_value as "Total Value"
FROM grafana_score_distribution
```

---

## 🚨 TROUBLESHOOTING

### Erro: "No Data" ou "Connection Refused"

**Causa 1: IP não permitido no Supabase**
```
Solução: Supabase → Database → Connection Pooling → IPv4 Addon
Ou: Adicione seu IP em Database → Connection Settings → Allow IPs
```

**Causa 2: Senha incorreta**
```
Teste: psql "postgresql://postgres:SENHA@db...supabase.co:5432/postgres"
Se falhar, redefina senha: Supabase → Settings → Database → Reset Password
```

**Causa 3: SSL obrigatório**
```
Garanta: sslmode=require ou SSL Mode: require na configuração
```

### Erro: "permission denied for view"

**Causa: RLS ou permissões**
```sql
-- Execute no SQL Editor do Supabase:
GRANT SELECT ON grafana_financial_master TO anon;
GRANT SELECT ON grafana_swarm_matrix TO anon;
GRANT SELECT ON grafana_profit_realtime TO anon;
GRANT SELECT ON grafana_agent_status TO anon;

-- Ou use SERVICE_ROLE_KEY (tem todas as permissões)
```

### Erro: Grafana Alloy não inicia

**Verifique:**
```bash
# Logs do Alloy
alloy run grafana/config/alloy-config.river --server.http.listen-addr=127.0.0.1:12345

# Teste configuração
alloy fmt grafana/config/alloy-config.river

# Verifique variáveis de ambiente
echo $GRAFANA_REMOTE_WRITE_URL
echo $SUPABASE_DB_PASSWORD
```

---

## ⚡ COMANDOS RÁPIDOS

```bash
# Iniciar tudo
npm run grafana:fix && alloy run grafana/config/alloy-config.river

# Verificar conexão Supabase
psql "$SUPABASE_URL" -c "SELECT * FROM grafana_financial_master;"

# Logs do Alloy
tail -f /var/log/alloy/alloy.log

# Restart Alloy
sudo systemctl restart alloy

# Verificar métricas no Grafana
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "https://$GRAFANA_STACK.grafana.net/api/datasources/proxy/1/api/v1/label/__name__/values"
```

---

## 🎯 CHECKLIST FINAL

Antes de dizer "está pronto", verifique:

- [ ] Grafana Alloy instalado
- [ ] Arquivo `grafana/config/alloy-config.river` configurado
- [ ] Arquivo `grafana/.env` criado com credenciais
- [ ] Conexão Supabase testada via psql
- [ ] Grafana Alloy iniciado sem erros
- [ ] Métricas aparecem em Grafana Cloud → Explore
- [ ] Dashboard importado e mostrando dados
- [ ] Alertas configurados (opcional)

---

## 📁 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `grafana/config/alloy-config.river` | Configuração completa do Grafana Alloy |
| `grafana/GRAFANA_CONNECTION_COMPLETE.md` | Este guia |
| `grafana/.env.example` | Template de variáveis de ambiente |

---

## 🚀 PRÓXIMOS PASSOS

1. **Configurar credenciais** em `grafana/.env`
2. **Testar conexão**: `psql "$SUPABASE_URL"`
3. **Iniciar Alloy**: `alloy run grafana/config/alloy-config.river`
4. **Verificar Grafana Cloud**: Explore → Metrics
5. **Importar Dashboard**: Dashboards → Import

---

**🔌 CONEXÃO COMPLETA CONFIGURADA.**

Execute os comandos acima para ativar a Ferrari Financeira.

*Autorizado por: Comandante Júnior Sena*  
*Versão: v10.1 - CONNECTION_READY*
