/**
 * GXEON ENFORCER v2 - Com fallback para PostgreSQL direto
 * Quando o PostgREST falha (schema cache desatualizado), usa pg driver direto
 */

const { Pool } = require('pg');

// Pool de conexão direta ao PostgreSQL (fallback)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL
});

// Função RPC via SQL direto (bypass PostgREST)
async function deductCreditsAtomicDirect(p_api_key, p_amount, p_operation, p_request_id) {
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
