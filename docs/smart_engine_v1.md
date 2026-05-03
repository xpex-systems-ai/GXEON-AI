# 🧠 GXEON SMART ENGINE v1.0

Lead Intelligence & AI Scoring System

---

## 🎯 Visão Geral

O **GXEON Smart Engine** é um sistema de inteligência artificial que:
1. **Coleta** leads de fontes externas (Google Maps)
2. **Enriquece** dados com sinais de qualidade
3. **Calcula** score baseado em regras configuráveis
4. **Ranked** por prioridade (LOW/MEDIUM/HIGH)
5. **Gera** ações recomendadas para cada lead

---

## 📡 Endpoints

### 🆓 FREE - Preview Limitado
```bash
GET /v1/leads/smart-free?query={search}&location={city}
```

**Parâmetros:**
- `query` (obrigatório): Tipo de negócio (ex: restaurant, clinic)
- `location` (obrigatório): Cidade (ex: São Paulo, Rio de Janeiro)
- `max` (opcional): Máximo de resultados (padrão: 2)

**Resposta:**
```json
{
  "success": true,
  "query": "restaurant",
  "location": "São Paulo",
  "tier": "FREE",
  "leads_found": 15,
  "leads_shown": 2,
  "leads": [
    {
      "id": "lead_123",
      "name": "Restaurante Premium",
      "category": "restaurant",
      "score": 75,
      "priority": "HIGH"
    }
  ],
  "upgrade": {
    "message": "💎 Unlock full lead intelligence...",
    "unlocks": ["full_contact", "action_recommendations", ...]
  },
  "high_score_locked": true
}
```

---

### 💰 PAID - Acesso Completo
```bash
GET /v1/leads/smart?query={search}&location={city}&max={n}
Header: X-API-Key: sua_chave_aqui
```

**Tiers:**
| Tier | Preço | Leads/Request | Rate Limit |
|------|-------|---------------|------------|
| BASIC | R$ 29.90 | 20 | 100/dia |
| PRO | R$ 99.90 | 50 | 1000/dia |
| ENTERPRISE | R$ 299.90 | 100 | Unlimited |

**Resposta Completa:**
```json
{
  "success": true,
  "tier": "PRO",
  "leads_found": 45,
  "leads_shown": 45,
  "leads": [
    {
      "id": "lead_123",
      "name": "Restaurante Premium",
      "category": "restaurant",
      "address": "Rua Augusta, 500, São Paulo",
      "phone": "(11) 91234-5678",
      "website": "",
      "rating": 4.8,
      "reviews": 15,
      "score": 75,
      "priority": "HIGH",
      "action": "PRIORITY: Contact immediately - No website, high rating. Offer web development services.",
      "reason": "No website - opportunity for web dev services; High rating indicates quality business; Direct contact available",
      "estimated_conversion": 65,
      "signals": {
        "has_website": false,
        "has_phone": true,
        "has_reviews": true,
        "rating_tier": "EXCELLENT",
        "competition_level": "low"
      },
      "location": {
        "lat": -23.5505,
        "lng": -46.6333
      }
    }
  ],
  "summary": {
    "total_leads": 45,
    "high_priority": 12,
    "medium_priority": 20,
    "low_priority": 13,
    "average_score": 58,
    "without_website": 18,
    "with_contact": 38,
    "estimated_revenue_potential": 6000
  }
}
```

---

## 📊 Scoring Rules

| Regra | Pontos | Descrição |
|-------|--------|-----------|
| **No Website** | +30 | Oportunidade para serviços de desenvolvimento web |
| **Rating > 4.5** | +25 | Negócio de alta qualidade |
| **Low Competition** | +20 | Poucos reviews = menos concorrência |
| **Has Phone** | +15 | Contato direto disponível |
| **Recent Activity** | +10 | Reviews recentes indicam atividade |

**Score Range:**
- 0-39: LOW priority
- 40-69: MEDIUM priority
- 70-100: HIGH priority

---

## 🔄 Pipeline de Processamento

```
[Collect] → [Enrich] → [Score] → [Rank] → [Action]
    ↓           ↓          ↓         ↓        ↓
  Apify    Signals    Points   Priority   Recommendation
```

---

## 💎 Estratégia de Lock

### FREE Response
- Apenas: `name`, `category`, `score`, `priority`
- Esconde: contato, ação, estimativas, razão

### PAID Response
- Todos os campos incluindo:
  - `phone`, `website`, `address` (contato)
  - `action` (recomendação de ação)
  - `reason` (por que esse score)
  - `estimated_conversion` (% de conversão estimada)
  - `signals` (dados enriquecidos)

### Upsell Trigger
Quando `high_score_locked: true` (lead com score >= 70 aparece no free), o sistema envia header:
```
X-Paywall-Trigger: high_score_locked
X-Upgrade-URL: /v1/leads/smart
```

---

## 📚 Documentação
```bash
GET /v1/leads/smart/docs
```

---

## 📈 Analytics (PRO+)
```bash
GET /v1/leads/smart-analytics
Header: X-API-Key: sua_chave_aqui
```

---

## 🔄 Batch Processing (PRO+)
```bash
POST /v1/leads/smart-batch
Header: X-API-Key: sua_chave_aqui
Content-Type: application/json

{
  "queries": [
    { "query": "restaurant", "location": "São Paulo", "max": 20 },
    { "query": "clinic", "location": "Rio de Janeiro", "max": 20 }
  ]
}
```

---

## 🎯 Exemplos de Uso

### Python
```python
import requests

# Free tier
response = requests.get(
    "https://gxeon-core.up.railway.app/v1/leads/smart-free",
    params={"query": "coffee", "location": "Rio de Janeiro"}
)
leads = response.json()['leads']

# Paid tier
response = requests.get(
    "https://gxeon-core.up.railway.app/v1/leads/smart",
    headers={"X-API-Key": "sua_chave_aqui"},
    params={"query": "restaurant", "location": "São Paulo", "max": 50}
)
high_priority = [l for l in response.json()['leads'] if l['priority'] == 'HIGH']
```

### JavaScript
```javascript
// Free preview
const response = await fetch(
  'https://gxeon-core.up.railway.app/v1/leads/smart-free?query=tech&location=São%20Paulo'
);
const data = await response.json();
console.log(`Found ${data.leads_found} leads, showing ${data.leads_shown}`);

// Full access
const response = await fetch(
  'https://gxeon-core.up.railway.app/v1/leads/smart?query=clinic&location=Rio&max=50',
  { headers: { 'X-API-Key': 'sua_chave_aqui' } }
);
const data = await response.json();

// Print HIGH priority actions
const highPriority = data.leads.filter(l => l.priority === 'HIGH');
highPriority.forEach(lead => {
  console.log(`${lead.name}: ${lead.action}`);
  console.log(`  Estimated conversion: ${lead.estimated_conversion}%`);
});
```

---

## 💰 Monetização

### Fluxo de Conversão
1. Usuário testa `/v1/leads/smart-free` (grátis)
2. Vê leads com alto score mas dados bloqueados
3. Recebe 402 no `/v1/leads/smart` sem API key
4. Faz POST `/v1/register` → recebe PIX
5. Paga → API key ativa automaticamente
6. Acesso completo aos dados e ações

### Preços
- **BASIC**: R$ 29.90/mês - 20 leads/request, 100/day
- **PRO**: R$ 99.90/mês - 50 leads/request, ações, analytics
- **ENTERPRISE**: R$ 299.90/mês - Unlimited, batch processing

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│  /v1/leads/smart│
│     Routes      │
└────────┬────────┘
         │
┌────────▼────────┐
│  Smart Engine   │
│    Pipeline     │
│                 │
│  collect → enrich│
│   → score → rank│
│   → action       │
└────────┬────────┘
         │
┌────────▼────────┐
│  Apify API      │
│  Google Maps    │
└─────────────────┘
```

---

## 🔧 Arquivos

- `server/services/smartEngine.js` - Motor de IA
- `server/routes/smartLeadsApi.js` - Rotas da API
- `scripts/ativar_smart_engine.js` - Script de ativação
- `docs/smart_engine_v1.md` - Esta documentação

---

*Powered by GXEON Autonomous Systems*
*Treasury: 0x3955d559055DadB7067054cB6E6f974710345224*
