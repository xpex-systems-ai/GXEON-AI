#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 MÓDULO 2 - GXEON HYBRID DATA ENGINE ACTIVATION
 * 
 * Ativa o sistema completo de:
 * - Coleta de dados (Apify)
 * - Processamento com IA
 * - Monetização via API (paywall)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const API_BASE = 'https://gxeon-core.up.railway.app';

// ═══════════════════════════════════════════════════════════════════════════
// ATIVAÇÃO DO MÓDULO 2
// ═══════════════════════════════════════════════════════════════════════════
async function ativarModulo2() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 MÓDULO 2 - GXEON HYBRID DATA ENGINE                    ║');
  console.log('║     Autor: Comandante Júnior Sena                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // 1. Verificar endpoints
  console.log('📡 [1/5] Verificando endpoints...\n');
  
  const endpoints = [
    { name: 'Health Check', url: '/v1/health' },
    { name: 'Pricing Info', url: '/v1/pricing' },
    { name: 'Free Leads', url: '/v1/leads/free?query=restaurant&location=São%20Paulo' },
    { name: 'Free Trends', url: '/v1/trends/free?hashtag=business' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE}${endpoint.url}`, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      const status = response.status === 200 ? '✅' : '⚠️';
      console.log(`   ${status} ${endpoint.name}: HTTP ${response.status}`);
    } catch (err) {
      console.log(`   ❌ ${endpoint.name}: ${err.message}`);
    }
  }
  
  // 2. Testar coleta de leads (free)
  console.log('\n🔍 [2/5] Testando coleta de leads...\n');
  
  try {
    const leadsResponse = await axios.get(
      `${API_BASE}/v1/leads/free?query=coffee&location=Rio%20de%20Janeiro`,
      { timeout: 15000 }
    );
    
    console.log('   ✅ Leads coletados:', leadsResponse.data.leads?.length || 0);
    console.log('   📊 Total encontrado:', leadsResponse.data.total_found);
    
    if (leadsResponse.data.leads?.length > 0) {
      const sample = leadsResponse.data.leads[0];
      console.log('   📝 Exemplo:', sample.name, '| Score:', sample.score);
    }
    
    console.log('   💎 Upgrade disponível:', leadsResponse.data.upgrade?.price ? `R$ ${leadsResponse.data.upgrade.price}` : 'N/A');
    
  } catch (err) {
    console.log('   ⚠️  Leads (modo mock):', err.message);
  }
  
  // 3. Testar análise de trends (free)
  console.log('\n📈 [3/5] Testando análise de trends...\n');
  
  try {
    const trendsResponse = await axios.get(
      `${API_BASE}/v1/trends/free?hashtag=startup`,
      { timeout: 15000 }
    );
    
    console.log('   ✅ Trends analisados:', trendsResponse.data.trends?.length || 0);
    
    if (trendsResponse.data.trends?.length > 0) {
      const sample = trendsResponse.data.trends[0];
      console.log('   🔥 Viral Score:', sample.viral_score);
      console.log('   ⚡ Velocity:', sample.trend_velocity);
    }
    
  } catch (err) {
    console.log('   ⚠️  Trends (modo mock):', err.message);
  }
  
  // 4. Criar documentação do módulo
  console.log('\n📝 [4/5] Criando documentação...\n');
  
  const docs = `# 🚀 GXEON HYBRID DATA ENGINE - MÓDULO 2

## Sistema Ativado ✅

### Endpoints Disponíveis

#### 🆓 FREE (Preview Limitado)
- \`GET /v1/leads/free?query=X&location=Y\` - Preview de leads (3 resultados)
- \`GET /v1/trends/free?hashtag=X\` - Preview de trends (3 resultados)
- \`GET /v1/pricing\` - Informações de preço
- \`GET /v1/health\` - Health check

#### 💰 PAID (Acesso Completo)
- \`GET /v1/leads\` - Leads completos com contato (requer API key)
- \`GET /v1/trends\` - Trends completos com métricas (requer API key)
- \`POST /v1/tasks/execute\` - Execução de tarefas customizadas (PRO+)

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

\`\`\`
[Apify] → [Collector] → [AI Processor] → [Signal Engine] → [Paywall] → [Revenue]
\`\`\`

### Exemplo de Uso

\`\`\`bash
# Free tier - teste sem pagar
curl "${API_BASE}/v1/leads/free?query=restaurant&location=São%20Paulo"

# Paid tier - dados completos (requer API key)
curl -H "X-API-Key: sua_chave_aqui" \
  "${API_BASE}/v1/leads?query=clinic&location=Rio&max=50"

# Task execution (PRO+)
curl -X POST -H "X-API-Key: sua_chave_pro" \
  -H "Content-Type: application/json" \
  -d '{"task_type":"competitor_analysis","params":{"target":"competitor_name"}}' \
  "${API_BASE}/v1/tasks/execute"
\`\`\`

### Treasury
\`0x3955d559055DadB7067054cB6E6f974710345224\`

---
*Módulo 2 ativado em ${new Date().toISOString()}*
`;

  if (!existsSync('docs')) mkdirSync('docs');
  writeFileSync('docs/modulo_2_data_engine.md', docs);
  
  console.log('   ✅ Documentação criada: docs/modulo_2_data_engine.md');
  
  // 5. Criar script de venda
  console.log('\n💰 [5/5] Preparando primeira venda...\n');
  
  const vendaScript = `#!/bin/bash
# 🚀 PRIMEIRA VENDA - GXEON DATA ENGINE

echo "🌙 GXEON HYBRID DATA ENGINE - Venda Demo"
echo "==========================================="
echo ""

# 1. Mostrar o que está disponível (free)
echo "1. Testando endpoint FREE:"
curl -s "${API_BASE}/v1/leads/free?query=tech&location=São%20Paulo" | jq '.leads | length'
echo "   leads encontrados (preview limitado)"
echo ""

# 2. Mostrar paywall
echo "2. Testando endpoint PAID (sem API key):"
curl -s "${API_BASE}/v1/leads" | jq '.error'
echo "   → Retorna erro 401 (API key required)"
echo ""

# 3. Registrar cliente
echo "3. Registrando cliente de teste:"
CLIENTE=\$(curl -s -X POST "${API_BASE}/v1/register" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"demo@gxeon.ai","name":"Demo","tier":"BASIC"}')
echo \$CLIENTE | jq '.actor.code'
echo ""

echo "💎 PRÓXIMO PASSO: Cliente recebe PIX e paga R\$ 29.90"
echo "   Após pagamento, API key ativa automaticamente!"
`;

  writeFileSync('scripts/demo_venda.sh', vendaScript);
  
  console.log('   ✅ Script de demo criado: scripts/demo_venda.sh');
  
  // Resumo
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ✅ MÓDULO 2 ATIVADO COM SUCESSO!                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('🎯 O QUE FOI CRIADO:');
  console.log('   📡 Endpoints FREE: /v1/leads/free, /v1/trends/free');
  console.log('   💰 Endpoints PAID: /v1/leads, /v1/trends, /v1/tasks/execute');
  console.log('   🤖 Integração: Apify (Google Maps, TikTok, Instagram, Twitter)');
  console.log('   🔒 Paywall: Rate limiting + upgrade prompts');
  console.log('   📊 Monetização: R$ 29.90 / R$ 99.90 / R$ 299.90');
  console.log('');
  
  console.log('📁 Arquivos:');
  console.log('   - server/services/apifyIntegration.js');
  console.log('   - server/routes/hybridDataApi.js');
  console.log('   - docs/modulo_2_data_engine.md');
  console.log('   - scripts/demo_venda.sh');
  console.log('');
  
  console.log('💰 FLUXO DE VENDA:');
  console.log('   1. Cliente testa /v1/leads/free (grátis)');
  console.log('   2. Quer mais dados → POST /v1/register');
  console.log('   3. Recebe PIX → Paga → API key ativa');
  console.log('   4. Acesso completo a leads/trends/tasks');
  console.log('');
  
  console.log('🚀 PRÓXIMA AÇÃO:');
  console.log('   Execute: bash scripts/demo_venda.sh');
  console.log('   Ou acesse: https://gxeon-core.up.railway.app/v1/leads/free');
  console.log('');
}

// Executar
ativarModulo2().catch(console.error);
