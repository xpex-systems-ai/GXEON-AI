require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
