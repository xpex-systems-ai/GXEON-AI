/**
 * GXEON — Teste REST direto para novas tabelas
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║    GXEON — TESTE REST DIRETO (novas tabelas gxeon_*)         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function testREST() {
  // Test 1: Verificar se gxeon_users aparece na lista de tabelas
  console.log('🔍 TEST 1: Listando tabelas via REST API...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const data = await response.json();
    const tables = data.definitions ? Object.keys(data.definitions) : [];
    const gxeonTables = tables.filter(t => t.includes('gxeon'));
    
    console.log('   Total tabelas:', tables.length);
    console.log('   Tabelas gxeon_*:', gxeonTables.length > 0 ? gxeonTables.join(', ') : 'NENHUMA');
    
    if (gxeonTables.includes('gxeon_users')) {
      console.log('   ✅ gxeon_users visível via REST!');
    } else {
      console.log('   ❌ gxeon_users NÃO visível');
    }
    
    if (gxeonTables.includes('gxeon_billing_transactions')) {
      console.log('   ✅ gxeon_billing_transactions visível via REST!');
    } else {
      console.log('   ❌ gxeon_billing_transactions NÃO visível');
    }
    
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  console.log('');

  // Test 2: Tentar acessar gxeon_users diretamente
  console.log('🔍 TEST 2: Acessando gxeon_users diretamente...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/gxeon_users?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const data = await response.json();
    console.log('   Status:', response.status);
    
    if (response.status === 200) {
      console.log('   ✅ gxeon_users acessível!');
      console.log('   Dados:', JSON.stringify(data).substring(0, 100));
    } else {
      console.log('   ❌ Erro:', JSON.stringify(data));
    }
    
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  console.log('');

  // Test 3: RPC deduct_credits_atomic
  console.log('🔍 TEST 3: Testando RPC deduct_credits_atomic...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/deduct_credits_atomic`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_api_key: 'gx-test-key-001',
        p_amount: 0.01,
        p_operation: '/rest/test',
        p_request_id: 'rest-test-001'
      })
    });
    
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Resposta:', JSON.stringify(data, null, 2).substring(0, 200));
    
    if (response.status === 200 || (data.code && data.code.includes('PGRST'))) {
      console.log('   ✅ RPC responde (mesmo que com erro esperado)');
    }
    
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Se REST não mostrar tabelas gxeon_* → problema no PostgREST  ║');
  console.log('║  Se REST mostrar mas Node não → problema no cliente Supabase  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

testREST().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
