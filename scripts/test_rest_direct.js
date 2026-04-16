/**
 * GXEON — Teste REST API direto (bypass Supabase client)
 * Testa se o PostgREST realmente vê as tabelas via HTTP raw
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║      GXEON SUPABASE — TESTE REST API DIRETO (RAW HTTP)       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function testREST() {
  // Test 1: Listar tabelas via REST (endpoint /rest/v1/)
  console.log('🔍 TEST 1: Verificando endpoint REST...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Tabelas encontradas:', data.definitions ? Object.keys(data.definitions) : 'N/A');
    
    const hasUsers = data.definitions && data.definitions.users;
    const hasBilling = data.definitions && data.definitions.billing_transactions;
    
    if (hasUsers) console.log('   ✅ Tabela users visível via REST');
    else console.log('   ❌ Tabela users NÃO visível');
    
    if (hasBilling) console.log('   ✅ Tabela billing_transactions visível via REST');
    else console.log('   ❌ Tabela billing_transactions NÃO visível');
    
  } catch (err) {
    console.log('   ❌ Erro no endpoint REST:', err.message);
  }

  console.log('');

  // Test 2: Tentar RPC direto via REST
  console.log('🔍 TEST 2: Testando RPC via REST...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/deduct_credits_atomic`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        p_api_key: 'test-fake-key',
        p_amount: 0.01,
        p_operation: '/rest/test',
        p_request_id: 'rest-test-001'
      })
    });
    
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Resposta:', JSON.stringify(data, null, 2));
    
    if (response.status === 200 || (data && data.message && data.message.includes('inválida'))) {
      console.log('   ✅ RPC acessível (respondeu corretamente)');
    } else {
      console.log('   ❌ RPC erro ou não encontrado');
    }
    
  } catch (err) {
    console.log('   ❌ Erro na RPC:', err.message);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Se REST mostrar tabelas mas Supabase client não → cache local ║');
  console.log('║  Se REST também não mostrar → problema no PostgREST/Supabase  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

testREST().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
