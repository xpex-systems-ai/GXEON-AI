#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧠 GXEON SMART ENGINE v1.0 - ATIVAÇÃO
 * 
 * Endpoint: /v1/leads/smart
 * Features: AI Scoring, Priority Ranking, Action Generation
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

const API_BASE = 'https://gxeon-core.up.railway.app';

// ═══════════════════════════════════════════════════════════════════════════
// SMART ENGINE ACTIVATION
// ═══════════════════════════════════════════════════════════════════════════
async function ativarSmartEngine() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🧠 GXEON SMART ENGINE v1.0                               ║');
  console.log('║     AI-Powered Lead Intelligence                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // 1. Testar endpoint FREE
  console.log('🔍 [1/4] Testando /v1/leads/smart-free...\n');
  
  try {
    const freeResponse = await axios.get(
      `${API_BASE}/v1/leads/smart-free?query=restaurant&location=São%20Paulo`,
      { timeout: 15000 }
    );
    
    console.log('   ✅ Endpoint FREE respondendo');
    console.log(`   📊 Leads encontrados: ${freeResponse.data.leads_found}`);
    console.log(`   👁️  Leads mostrados: ${freeResponse.data.leads_shown}`);
    console.log(`   🔒 Tier: ${freeResponse.data.tier}`);
    
    if (freeResponse.data.leads?.length > 0) {
      const sample = freeResponse.data.leads[0];
      console.log(`   📝 Exemplo: ${sample.name} (Score: ${sample.score}, Priority: ${sample.priority})`);
    }
    
    if (freeResponse.data.high_score_locked) {
      console.log('   💡 High-score leads disponíveis no tier pago!');
    }
    
  } catch (err) {
    console.log('   ⚠️  FREE endpoint:', err.response?.status || err.message);
  }
  
  // 2. Testar endpoint PAID (sem API key = paywall)
  console.log('\n🔒 [2/4] Testando /v1/leads/smart (paywall)...\n');
  
  try {
    const paidResponse = await axios.get(
      `${API_BASE}/v1/leads/smart?query=restaurant&location=São%20Paulo`,
      { 
        timeout: 15000,
        validateStatus: () => true
      }
    );
    
    if (paidResponse.status === 402) {
      console.log('   ✅ Paywall funcionando (HTTP 402)');
      console.log(`   💰 Código: ${paidResponse.data.code}`);
      console.log(`   📝 Mensagem: ${paidResponse.data.message}`);
      console.log(`   🎁 Campos bloqueados: ${paidResponse.data.unlocks?.length || 0} recursos`);
      
      if (paidResponse.data.upgrade?.pricing) {
        console.log('   💎 Preços:');
        Object.entries(paidResponse.data.upgrade.pricing).forEach(([tier, price]) => {
          console.log(`      ${tier}: ${price}`);
        });
      }
    } else {
      console.log(`   ⚠️  Status inesperado: ${paidResponse.status}`);
    }
    
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }
  
  // 3. Testar documentação
  console.log('\n📚 [3/4] Testando /v1/leads/smart/docs...\n');
  
  try {
    const docsResponse = await axios.get(
      `${API_BASE}/v1/leads/smart/docs`,
      { timeout: 10000 }
    );
    
    console.log('   ✅ Documentação acessível');
    console.log(`   📖 Engine: ${docsResponse.data.name} v${docsResponse.data.version}`);
    console.log(`   🎯 Regras de scoring: ${Object.keys(docsResponse.data.scoring_rules || {}).length} regras`);
    
    // Mostrar regras
    console.log('   📊 Scoring Rules:');
    Object.entries(docsResponse.data.scoring_rules || {}).forEach(([rule, desc]) => {
      console.log(`      • ${rule}: ${desc}`);
    });
    
  } catch (err) {
    console.log('   ⚠️  Docs endpoint:', err.message);
  }
  
  // 4. Resumo
  console.log('\n📝 [4/4] Criando resumo...\n');
  
  const resumo = {
    name: 'GXEON Smart Engine v1.0',
    status: 'ACTIVE',
    endpoints: {
      free: '/v1/leads/smart-free',
      paid: '/v1/leads/smart',
      docs: '/v1/leads/smart/docs',
      analytics: '/v1/leads/smart-analytics (PRO+)',
      batch: '/v1/leads/smart-batch (PRO+)'
    },
    scoring_rules: {
      no_website: '+30',
      rating_above_4_5: '+25',
      low_competition: '+20',
      has_phone: '+15',
      recent_activity: '+10'
    },
    monetization: {
      free_limit: 2,
      paid_required: true,
      upsell_trigger: 'high_score_locked',
      tiers: {
        BASIC: 'R$ 29.90 - 20 leads/request',
        PRO: 'R$ 99.90 - 50 leads/request + task execution',
        ENTERPRISE: 'R$ 299.90 - Unlimited'
      }
    },
    output: {
      free: ['name', 'category', 'score', 'priority'],
      paid: ['name', 'category', 'address', 'phone', 'website', 'rating', 'reviews', 'score', 'priority', 'action', 'reason', 'estimated_conversion']
    }
  };
  
  console.log('   ✅ Resumo gerado');
  
  // Resultado final
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ✅ SMART ENGINE v1.0 ATIVADO!                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('🧠 ENDPOINTS DISPONÍVEIS:');
  console.log('   🆓 GET /v1/leads/smart-free - Preview (2 leads)');
  console.log('   💰 GET /v1/leads/smart - Full (requer API key)');
  console.log('   📚 GET /v1/leads/smart/docs - Documentação');
  console.log('   📊 GET /v1/leads/smart-analytics - Métricas (PRO+)');
  console.log('   🔄 POST /v1/leads/smart-batch - Batch (PRO+)');
  console.log('');
  
  console.log('📊 SCORING RULES:');
  console.log('   • No website: +30 (oportunidade web dev)');
  console.log('   • Rating > 4.5: +25 (negócio de qualidade)');
  console.log('   • Low competition: +20 (mercado menos saturado)');
  console.log('   • Has phone: +15 (contato direto)');
  console.log('   • Recent activity: +10 (negócio ativo)');
  console.log('');
  
  console.log('💰 MONETIZAÇÃO:');
  console.log('   • FREE: 2 leads, score only');
  console.log('   • PAID: Full data + actions + estimates');
  console.log('   • Trigger: high_score_locked (score >= 70)');
  console.log('');
  
  console.log('🎯 EXEMPLOS:');
  console.log(`   curl "${API_BASE}/v1/leads/smart-free?query=tech&location=São%20Paulo"`);
  console.log(`   curl -H "X-API-Key: SUA_CHAVE" "${API_BASE}/v1/leads/smart?query=coffee&location=Rio"`);
  console.log('');
}

// Executar
ativarSmartEngine().catch(console.error);
