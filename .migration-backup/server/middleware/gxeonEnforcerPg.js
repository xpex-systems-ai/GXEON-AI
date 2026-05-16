/**
 * GXEON ENFORCER v2 - PostgreSQL direct fallback.
 *
 * The pg driver is optional in lightweight dashboard/runtime deployments. When
 * absent, the strict billing middleware remains closed (no free execution) and
 * reports a controlled degraded dependency error instead of crashing boot.
 */

const fs = require('fs');
const path = require('path');

function packageInstalled(name) {
  return fs.existsSync(path.join(process.cwd(), 'node_modules', name, 'package.json'));
}

const Pool = packageInstalled('pg') ? require('pg').Pool : null;
const pgPool = Pool
  ? new Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL })
  : null;

function assertPgReady() {
  if (!pgPool) {
    throw new Error('PG_FALLBACK_UNAVAILABLE: install pg or configure Supabase RPC for billing fallback');
  }
}

// Função RPC via SQL direto (bypass PostgREST)
async function deductCreditsAtomicDirect(p_api_key, p_amount, p_operation, p_request_id) {
  assertPgReady();
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      'SELECT public.deduct_credits_atomic($1, $2, $3, $4)',
      [p_api_key, p_amount, p_operation, p_request_id]
    );
    return result.rows[0].deduct_credits_atomic;
  } finally {
    client.release();
  }
}

async function refundCreditsDirect(p_transaction_id, p_reason) {
  assertPgReady();
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      'SELECT public.refund_credits($1, $2)',
      [p_transaction_id, p_reason]
    );
    return result.rows[0].refund_credits;
  } finally {
    client.release();
  }
}

// Função para consultar usuário por API key (bypass PostgREST)
async function queryUserByApiKey(apiKey) {
  assertPgReady();
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      'SELECT id, balance_credits, status FROM public.gxeon_users WHERE api_key = $1 AND status = $2 LIMIT 1',
      [apiKey, 'active']
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = { deductCreditsAtomicDirect, refundCreditsDirect, queryUserByApiKey, pgPool };
