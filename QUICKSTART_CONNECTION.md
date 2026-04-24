# 🚀 QUICKSTART - CONEXÃO EM 3 MINUTOS

## Para quem quer ver dados AGORA

---

## ⚡ MÉTODO ULTRA-RÁPIDO (Conexão Direta)

Não precisa instalar nada. Apenas configure no Grafana Cloud.

### Passo 1: Pegar Credenciais (30s)

1. **Supabase:** https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce/settings/database
   - Copie a **Connection String**
   - Exemplo: `postgresql://postgres:PASSWORD@db.telxvphgrsvsnxvmjkce.supabase.co:5432/postgres`

2. **Grafana Cloud:** https://grafana.com/login
   - Anote seu **Stack URL**
   - Crie **API Key** (Security → API Keys)

### Passo 2: Configurar Data Source (1 min)

No seu Grafana Cloud:

```
⚙️ Configuration → Data Sources → Add Data Source → PostgreSQL

Host: db.telxvphgrsvsnxvmjkce.supabase.co:5432
Database: postgres
User: postgres
Password: [coloque sua senha]
SSL Mode: require

✅ Save & Test
```

### Passo 3: Criar Primeiro Painel (30s)

```
➕ Create → Dashboard → Add Panel

📊 Escolha: "Code" (modo SQL)

📝 Cole esta query:
```

```sql
SELECT 
  timestamp as time,
  total_revenue_24h as "Revenue",
  net_profit_24h as "Net Profit"
FROM grafana_financial_master
```

```
✅ Run Query

Se aparecerem números (ex: 894.40), PARABÉNS! 🎉
Conexão funcionando!
```

---

## 🔧 SE APARECER "No Data"

### Opção A: Executar correção automática
```bash
npm run grafana:fix
```

### Opção B: SQL Manual
```bash
# No SQL Editor do Supabase (https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce/sql)
# Cole e execute: supabase/DASHBOARD_IGNITION_FIX.sql
```

---

## 📊 QUERIES PRONTAS PARA COPiar

### Painel 1: Lucro Master
```sql
SELECT 
  timestamp as time,
  total_revenue_24h as "Revenue",
  net_profit_24h as "Net Profit",
  total_gas_24h as "Gas Costs",
  roi_24h_pct as "ROI %"
FROM grafana_financial_master
```

### Painel 2: Status dos Agentes
```sql
SELECT 
  agent_name as "Agent",
  status_emoji || ' ' || status as "Status",
  active_items as "Active",
  daily_value as "Value"
FROM grafana_swarm_matrix
```

### Painel 3: Profit Real-time
```sql
SELECT 
  hour as time,
  net_profit_realized as "Profit",
  success_rate_pct as "Success Rate"
FROM grafana_profit_realtime
WHERE hour > NOW() - INTERVAL '6 hours'
ORDER BY hour
```

### Painel 4: Airdrop Wallets
```sql
SELECT 
  address as "Wallet",
  eligibility_level as "Tier",
  eligibility_score as "Score",
  estimated_value_usd as "Est. Value"
FROM grafana_airdrop_scores
ORDER BY eligibility_score DESC
LIMIT 10
```

---

## 🐳 MÉTODO ALTERNATIVO: Docker (Se tiver Docker)

```bash
# 1. Crie docker-compose.yml
cat > grafana-docker-compose.yml << 'EOF'
version: '3.8'
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
EOF

# 2. Inicie
docker-compose -f grafana-docker-compose.yml up -d

# 3. Acesse http://localhost:3000
#    Login: admin / admin

# 4. Configure Data Source PostgreSQL (igual acima)
```

---

## 🎯 VERIFICAÇÃO RÁPIDA

Teste se tudo funciona:

```bash
# Teste 1: Conexão Supabase
psql "postgresql://postgres:SENHA@db.telxvphgrsvsnxvmjkce.supabase.co:5432/postgres" \
  -c "SELECT COUNT(*) FROM grafana_financial_master;"
# Deve retornar: 1

# Teste 2: Dados existem
psql "$SUPABASE_URL" \
  -c "SELECT net_profit_24h FROM grafana_financial_master;"
# Deve retornar: 894.40 (ou seu valor atual)
```

---

## 🆘 ERROS COMUNS

| Erro | Solução |
|------|---------|
| "connection refused" | Adicione IPv4 Addon no Supabase ou use Pooler (porta 6543) |
| "password authentication failed" | Redefina senha: Supabase → Settings → Database → Reset password |
| "No Data" | Execute: `npm run grafana:fix` |
| "permission denied" | Execute SQL: `GRANT SELECT ON grafana_financial_master TO anon;` |
| "sslmode" | Coloque: `sslmode=require` na connection string |

---

## ✅ CHECKLIST MÍNIMA

- [ ] Abri Grafana (Cloud ou Local)
- [ ] Adicionei Data Source PostgreSQL
- [ ] Configurei Host/Port/User/Password
- [ ] SSL Mode = require
- [ ] Testei query → retornou dados
- [ ] Criei painel com valores visíveis

---

## 🎉 DEU CERTO?

Se você vê números no painel (não "No Data"), a conexão está **100%**!

Agora pode:
1. Criar mais painéis com as queries acima
2. Configurar alerts
3. Importar o Master Dashboard JSON

---

## 📞 AJUDA RÁPIDA

Stuck? Execute:
```bash
# Setup interativo
npm run grafana:setup

# Ou veja o guia completo
cat grafana/GRAFANA_CONNECTION_COMPLETE.md
```

---

**⏱️ Tempo estimado: 3 minutos**

**🚀 Resultado: Dashboard com dados reais**

---

*Comando final para copiar e colar:*

```bash
npm run grafana:fix && echo "✅ Dados prontos! Agora configure no Grafana Cloud"
```
