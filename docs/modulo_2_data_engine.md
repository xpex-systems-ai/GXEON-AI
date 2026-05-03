# 🚀 GXEON HYBRID DATA ENGINE - MÓDULO 2

## Sistema Ativado ✅

### Endpoints Disponíveis

#### 🆓 FREE (Preview Limitado)
- `GET /v1/leads/free?query=X&location=Y` - Preview de leads (3 resultados)
- `GET /v1/trends/free?hashtag=X` - Preview de trends (3 resultados)
- `GET /v1/pricing` - Informações de preço
- `GET /v1/health` - Health check

#### 💰 PAID (Acesso Completo)
- `GET /v1/leads` - Leads completos com contato (requer API key)
- `GET /v1/trends` - Trends completos com métricas (requer API key)
- `POST /v1/tasks/execute` - Execução de tarefas customizadas (PRO+)

### Preços

| Tier | Preço | Features |
|------|-------|----------|
| **FREE** | R$ 0 | 3 leads/trends, dados limitados |
| **BASIC** | R$ 29,90 | 50 leads/request, contato completo |
| **PRO** | R$ 99,90 | + task execution, competitor analysis |
| **ENTERPRISE** | R$ 299,90 | Ilimitado, prioridade, custom |

### Fontes de Dados

1. **Google Maps** - Negócios locais, reviews, contatos
2. **TikTok** - Trends virais, engagement metrics
3. **Instagram** - Perfis, alcance, influenciadores
4. **Twitter** - Sentiment analysis, trending topics

### Pipeline de Monetização

```
[Apify] → [Collector] → [AI Processor] → [Signal Engine] → [Paywall] → [Revenue]
```

### Exemplo de Uso

```bash
# Free tier - teste sem pagar
curl "https://gxeon-core.up.railway.app/v1/leads/free?query=restaurant&location=São%20Paulo"

# Paid tier - dados completos (requer API key)
curl -H "X-API-Key: sua_chave_aqui"   "https://gxeon-core.up.railway.app/v1/leads?query=clinic&location=Rio&max=50"

# Task execution (PRO+)
curl -X POST -H "X-API-Key: sua_chave_pro"   -H "Content-Type: application/json"   -d '{"task_type":"competitor_analysis","params":{"target":"competitor_name"}}'   "https://gxeon-core.up.railway.app/v1/tasks/execute"
```

### Treasury
`0x3955d559055DadB7067054cB6E6f974710345224`

---
*Módulo 2 ativado em 2026-05-03T00:50:13.288Z*
