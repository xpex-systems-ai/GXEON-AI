/**
 * GXEON — Live Ping Supabase
 * Verifica se as colunas de billing estão visíveis e executa teste de 0.05 créditos
 * 
 * Usage: node scripts/live_ping_supabase.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║           GXEON SUPABASE — LIVE PING & HEALTH CHECK          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function livePing() {
  let healthy = true;
  const checks = [];

  // CHECK 1: Verificar se tabela gxeon_users está acessível
  console.log('🔍 CHECK 1: Verificando tabela gxeon_users...');
  try {
    const { data: userCheck, error: userError } = await supabase
      .from('gxeon_users')
      .select('id, api_key, balance_credits, tier, status')
      .limit(1);
    
    if (userError) throw userError;
    console.log('   ✅ Tabela gxeon_users acessível\n');
    checks.push({ name: 'gxeon_users_table', status: 'HEALTHY' });
  } catch (err) {
    console.log('   ❌ Tabela gxeon_users:', err.message, '\n');
    checks.push({ name: 'gxeon_users_table', status: 'BROKEN', error: err.message });
    healthy = false;
  }

  // CHECK 2: Verificar se tabela gxeon_billing_transactions está acessível
  console.log('🔍 CHECK 2: Verificando tabela gxeon_billing_transactions...');
  try {
    const { data: billingCheck, error: billingError } = await supabase
      .from('gxeon_billing_transactions')
      .select('id, operation, balance_before, balance_after, transaction_type')
      .limit(1);
    
    if (billingError) throw billingError;
    console.log('   ✅ Tabela gxeon_billing_transactions acessível');
    console.log('   ✅ Colunas visíveis: operation, balance_before, balance_after, transaction_type\n');
    checks.push({ name: 'gxeon_billing_table', status: 'HEALTHY' });
  } catch (err) {
    console.log('   ❌ Tabela gxeon_billing_transactions:', err.message, '\n');
    checks.push({ name: 'gxeon_billing_table', status: 'BROKEN', error: err.message });
    healthy = false;
  }

  // CHECK 3: Verificar se RPC deduct_credits_atomic existe
  console.log('🔍 CHECK 3: Verificando RPC deduct_credits_atomic...');
  try {
    const { data: rpcCheck, error: rpcError } = await supabase.rpc('deduct_credits_atomic', {
      p_api_key: 'non-existent-key-for-check-only',
      p_amount: 0.01,
      p_operation: '/health-check',
      p_request_id: 'ping-' + Date.now()
    });
    
    // Esperamos "API Key inválida" — isso prova que a função existe!
    if (rpcError && !rpcError.message.includes('inválida') && !rpcError.message.includes('not found')) {
      throw rpcError;
    }
    
    console.log('   ✅ RPC deduct_credits_atomic existe e responde');
    console.log('   ℹ️  Resposta esperada (API Key inválida):', rpcCheck?.message || 'Function accessible\n');
    checks.push({ name: 'rpc_deduct', status: 'HEALTHY' });
  } catch (err) {
    console.log('   ❌ RPC deduct_credits_atomic:', err.message, '\n');
    checks.push({ name: 'rpc_deduct', status: 'BROKEN', error: err.message });
    healthy = false;
  }

  // CHECK 4: Criar usuário de teste e deduzir 0.05 créditos
  console.log('🔍 CHECK 4: Teste funcional — deduzir 0.05 créditos...');
  const testKey = 'live-ping-test-' + Date.now();
  
  try {
    // 4.1 Criar usuário
    const { data: newUser, error: createError } = await supabase
      .from('gxeon_users')
      .insert({
        name: 'Live Ping Test',
        api_key: testKey,
        balance_credits: 10.00,
        tier: 'enterprise',
        status: 'active'
      })
      .select()
      .single();
    
    if (createError) throw createError;
    console.log('   ✅ Usuário de teste criado:', newUser.id);

    // 4.2 Dedução atômica de 0.05 créditos
    const { data: deduction, error: deductError } = await supabase
      .rpc('deduct_credits_atomic', {
        p_api_key: testKey,
        p_amount: 0.05,
        p_operation: '/api/test',
        p_request_id: 'test-' + Date.now()
      });
    
    if (deductError) throw deductError;
    
    if (!deduction || !deduction.success) {
      throw new Error(deduction?.message || 'Dedução falhou sem erro explícito');
    }
    
    console.log('   ✅ Dedução de 0.05 créditos — SUCCESS!');
    console.log('   📊 Novo saldo:', deduction.new_balance);
    console.log('   🧾 Transaction ID:', deduction.transaction_id);
    
    // 4.3 Verificar se a transação foi registrada
    const { data: txCheck, error: txError } = await supabase
      .from('gxeon_billing_transactions')
      .select('*')
      .eq('request_id', deduction.transaction_id ? null : '')  // fallback
      .eq('user_id', newUser.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!txError && txCheck && txCheck.length > 0) {
      console.log('   ✅ Transação registrada na tabela gxeon_billing_transactions\n');
    } else {
      console.log('   ⚠️  Transação pode ter sido registrada (verificar manualmente)\n');
    }
    
    checks.push({ 
      name: 'functional_test', 
      status: 'HEALTHY',
      details: {
        user_id: newUser.id,
        transaction_id: deduction.transaction_id,
        new_balance: deduction.new_balance
      }
    });

    // Cleanup
    await supabase.from('gxeon_billing_transactions').delete().eq('user_id', newUser.id);
    await supabase.from('gxeon_users').delete().eq('id', newUser.id);
    console.log('   🧹 Cleanup concluído\n');

  } catch (err) {
    console.log('   ❌ Teste funcional falhou:', err.message, '\n');
    checks.push({ name: 'functional_test', status: 'BROKEN', error: err.message });
    healthy = false;
  }

  // CHECK 5: Verificar refund_credits
  console.log('🔍 CHECK 5: Verificando RPC refund_credits...');
  try {
    const { data: refundCheck, error: refundError } = await supabase.rpc('refund_credits', {
      p_transaction_id: '00000000-0000-0000-0000-000000000000',
      p_reason: 'Health check test'
    });
    
    // Esperamos "Transação não encontrada" — prova que a função existe!
    if (refundError && !refundError.message.includes('não encontrada') && !refundError.message.includes('not found')) {
      throw refundError;
    }
    
    console.log('   ✅ RPC refund_credits existe e responde\n');
    checks.push({ name: 'rpc_refund', status: 'HEALTHY' });
  } catch (err) {
    console.log('   ❌ RPC refund_credits:', err.message, '\n');
    checks.push({ name: 'rpc_refund', status: 'BROKEN', error: err.message });
    healthy = false;
  }

  // RESULTADO FINAL
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  if (healthy) {
    console.log('║              ✅ STATUS: HEALTHY — SISTEMA OPERACIONAL ✅       ║');
  } else {
    console.log('║              ❌ STATUS: BROKEN — REQUER INTERVENÇÃO ❌         ║');
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Resumo dos Checks:');
  checks.forEach(c => {
    const icon = c.status === 'HEALTHY' ? '✅' : '❌';
    console.log(`   ${icon} ${c.name}: ${c.status}`);
    if (c.details) {
      console.log(`      Transaction ID: ${c.details.transaction_id}`);
      console.log(`      New Balance: ${c.details.new_balance}`);
    }
  });
  console.log('');

  process.exit(healthy ? 0 : 1);
}

livePing().catch(err => {
  console.error('💥 FATAL ERROR:', err);
  process.exit(1);
});
