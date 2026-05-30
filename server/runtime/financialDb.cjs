'use strict';

const pg = require('../../lib/db/node_modules/pg');
const { randomUUID } = require('node:crypto');

const { Pool } = pg;
let pool = null;

function isFinancialDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL is required for persistent financial runtime');
    err.code = 'DATABASE_URL_REQUIRED';
    throw err;
  }
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function toDbAmount(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) throw new Error('amount must be greater than zero');
  return value.toFixed(2);
}

function mapTransaction(row = {}) {
  return {
    payment_id: row.transaction_id,
    transaction_id: row.transaction_id,
    provider_payment_id: row.provider_payment_id,
    status: row.status,
    amount: Number(row.base_amount || 0),
    provider: row.gateway_provider,
    external_reference: row.external_reference,
    actor_id: row.actor_id,
    actor_code: row.actor_code,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata || {},
  };
}

async function createGlobalTransaction(input = {}) {
  const result = await query(
    `INSERT INTO global_transactions (
      transaction_id, actor_id, actor_code, base_amount, currency, status,
      gateway_provider, external_reference, description, expires_at, metadata
    ) VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,$8,$9,$10::jsonb)
    ON CONFLICT (external_reference) DO UPDATE SET
      updated_at = now(),
      metadata = global_transactions.metadata || EXCLUDED.metadata
    RETURNING *`,
    [
      input.transactionId,
      input.actorId || null,
      input.actorCode || null,
      toDbAmount(input.amount),
      input.currency || 'BRL',
      input.provider || 'mercado_pago',
      input.externalReference,
      input.description || null,
      input.expiresAt || null,
      JSON.stringify(input.metadata || {}),
    ],
  );
  return result.rows[0];
}

async function createPaymentAttempt(input = {}) {
  const result = await query(
    `INSERT INTO payment_attempts (
      transaction_id, provider, provider_payment_id, status, amount, currency,
      idempotency_key, pix_qr_code, pix_qr_code_base64, pix_copy_paste,
      ticket_url, request_payload, raw_provider_response, expires_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14)
    ON CONFLICT (idempotency_key) DO UPDATE SET
      provider_payment_id = COALESCE(EXCLUDED.provider_payment_id, payment_attempts.provider_payment_id),
      status = EXCLUDED.status,
      pix_qr_code = COALESCE(EXCLUDED.pix_qr_code, payment_attempts.pix_qr_code),
      pix_qr_code_base64 = COALESCE(EXCLUDED.pix_qr_code_base64, payment_attempts.pix_qr_code_base64),
      pix_copy_paste = COALESCE(EXCLUDED.pix_copy_paste, payment_attempts.pix_copy_paste),
      ticket_url = COALESCE(EXCLUDED.ticket_url, payment_attempts.ticket_url),
      raw_provider_response = EXCLUDED.raw_provider_response,
      updated_at = now()
    RETURNING *`,
    [
      input.transactionId,
      input.provider || 'mercado_pago',
      input.providerPaymentId || null,
      input.status || 'CREATED',
      toDbAmount(input.amount),
      input.currency || 'BRL',
      input.idempotencyKey,
      input.qrCode || null,
      input.qrCodeBase64 || null,
      input.copyPastePix || input.qrCode || null,
      input.ticketUrl || null,
      JSON.stringify(input.requestPayload || {}),
      JSON.stringify(input.rawProviderResponse || {}),
      input.expiresAt || null,
    ],
  );
  return result.rows[0];
}

async function updateTransactionProviderState(input = {}) {
  const result = await query(
    `UPDATE global_transactions SET
      provider_payment_id = COALESCE($2, provider_payment_id),
      status = COALESCE($3, status),
      paid_at = CASE WHEN $3 = 'PAID' THEN COALESCE(paid_at, now()) ELSE paid_at END,
      updated_at = now(),
      metadata = metadata || $4::jsonb
    WHERE transaction_id = $1
    RETURNING *`,
    [
      input.transactionId,
      input.providerPaymentId || null,
      input.status || null,
      JSON.stringify(input.metadata || {}),
    ],
  );
  return result.rows[0] || null;
}

async function listPayments({ limit = 200 } = {}) {
  const result = await query(
    `SELECT * FROM global_transactions ORDER BY created_at DESC LIMIT $1`,
    [Math.max(1, Math.min(Number(limit || 200), 500))],
  );
  return result.rows.map(mapTransaction);
}

async function getPaymentCounts() {
  const result = await query(`SELECT status, count(*)::int AS count FROM global_transactions GROUP BY status`);
  return Object.fromEntries(result.rows.map((row) => [row.status, row.count]));
}

async function insertWebhookEvent(input = {}) {
  const result = await query(
    `INSERT INTO payment_webhook_events (
      provider, provider_event_id, provider_payment_id, event_type, action,
      signature, idempotency_key, processing_status, raw_payload, normalized_payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'RECEIVED',$8::jsonb,$9::jsonb)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING *`,
    [
      input.provider || 'mercado_pago',
      input.providerEventId,
      input.providerPaymentId || null,
      input.eventType,
      input.action || null,
      input.signature || null,
      input.idempotencyKey,
      JSON.stringify(input.rawPayload || {}),
      JSON.stringify(input.normalizedPayload || {}),
    ],
  );
  if (result.rows[0]) return { duplicate: false, event: result.rows[0] };
  return { duplicate: true, event: null };
}

async function markWebhookEvent(idempotencyKey, processingStatus, errorMessage = null) {
  const result = await query(
    `UPDATE payment_webhook_events SET
      processing_status = $2,
      error_message = $3,
      processed_at = now()
    WHERE idempotency_key = $1
    RETURNING *`,
    [idempotencyKey, processingStatus, errorMessage],
  );
  return result.rows[0] || null;
}

async function applyApprovedPayment(input = {}) {
  return withTransaction(async (client) => {
    const providerPaymentId = input.providerPaymentId ? String(input.providerPaymentId) : null;
    const transactionLookup = await client.query(
      `SELECT * FROM global_transactions
       WHERE ($1::text IS NOT NULL AND provider_payment_id = $1)
          OR ($2::text IS NOT NULL AND transaction_id = $2)
          OR ($3::text IS NOT NULL AND external_reference = $3)
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [providerPaymentId, input.transactionId || null, input.externalReference || null],
    );

    const transaction = transactionLookup.rows[0];
    if (!transaction) {
      const err = new Error('No persisted transaction found for approved provider payment');
      err.code = 'TRANSACTION_NOT_FOUND_FOR_APPROVAL';
      throw err;
    }

    const amount = toDbAmount(input.amount || transaction.base_amount);
    const actorId = input.actorId || transaction.actor_id || 'agent_buyer_1';

    await client.query(
      `UPDATE global_transactions SET
        status = 'PAID',
        provider_payment_id = COALESCE($2, provider_payment_id),
        paid_at = COALESCE(paid_at, now()),
        updated_at = now(),
        metadata = metadata || $3::jsonb
       WHERE transaction_id = $1`,
      [transaction.transaction_id, providerPaymentId, JSON.stringify(input.metadata || {})],
    );

    await client.query(
      `INSERT INTO actor_wallets (actor_id, actor_code, balance, credit_limit, total_earned, metadata)
       VALUES ($1, $2, '0', '0', '0', '{}'::jsonb)
       ON CONFLICT (actor_id) DO NOTHING`,
      [actorId, transaction.actor_code || null],
    );

    const walletResult = await client.query(
      `UPDATE actor_wallets SET
        balance = balance + $2::numeric,
        total_earned = total_earned + $2::numeric,
        updated_at = now()
       WHERE actor_id = $1
       RETURNING *`,
      [actorId, amount],
    );
    const wallet = walletResult.rows[0];

    const ledgerEntryId = input.ledgerEntryId || `ledger_${randomUUID()}`;
    const ledgerIdempotencyKey = input.ledgerIdempotencyKey || `payment-approved:${providerPaymentId || transaction.transaction_id}`;
    const ledgerResult = await client.query(
      `INSERT INTO financial_ledger (
        ledger_entry_id, actor_id, wallet_id, transaction_id, entry_type,
        source_type, source_id, amount, balance_after, idempotency_key,
        description, metadata
      ) VALUES ($1,$2,$3,$4,'CREDIT','PAYMENT',$5,$6,$7,$8,$9,$10::jsonb)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *`,
      [
        ledgerEntryId,
        actorId,
        wallet.id,
        transaction.transaction_id,
        providerPaymentId || transaction.transaction_id,
        amount,
        wallet.balance,
        ledgerIdempotencyKey,
        input.description || 'Mercado Pago PIX approved credit',
        JSON.stringify(input.metadata || {}),
      ],
    );

    return {
      transaction_id: transaction.transaction_id,
      provider_payment_id: providerPaymentId || transaction.provider_payment_id,
      wallet,
      ledger: ledgerResult.rows[0] || null,
      ledger_idempotent: !ledgerResult.rows[0],
    };
  });
}

module.exports = {
  isFinancialDbConfigured,
  createGlobalTransaction,
  createPaymentAttempt,
  updateTransactionProviderState,
  listPayments,
  getPaymentCounts,
  insertWebhookEvent,
  markWebhookEvent,
  applyApprovedPayment,
};
