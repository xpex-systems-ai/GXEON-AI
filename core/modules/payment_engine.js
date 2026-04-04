// Load env vars with fallback for Railway
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../config/secure/.env') });

const { createClient } = require('@supabase/supabase-js');

// Validate env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[GX_PAYMENT] ❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function processPayments(limit = 10) {
  console.log('[GX]: Payment Engine Running...');

  const { data: rewards, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('status', 'pending')
    .limit(limit);

  if (error) throw new Error(error.message);

  if (!rewards.length) {
    return { status: 'NO_PAYMENTS' };
  }

  const results = [];

  for (const reward of rewards) {
    try {
      const txHash = await simulateBlockchainTransfer(reward);

      await supabase
        .from('rewards')
        .update({
          status: 'paid',
          tx_hash: txHash,
          paid_at: new Date().toISOString()
        })
        .eq('id', reward.id);

      results.push({ id: reward.id, txHash });

    } catch (err) {
      results.push({ id: reward.id, error: err.message });
    }
  }

  return {
    status: 'PAYMENTS_EXECUTED',
    count: results.length,
    results
  };
}

async function simulateBlockchainTransfer(reward) {
  // Simulação Web3 (fase inicial)
  const fakeTx = '0x' + Math.random().toString(16).substring(2, 10);
  return fakeTx;
}

module.exports = {
  processPayments
};
