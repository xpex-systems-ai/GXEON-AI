'use strict';

const { randomUUID } = require('node:crypto');
const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { createPixCharge } = require('./mercadoPagoAdapter.cjs');
const {
  isFinancialDbConfigured,
  createGlobalTransaction,
  createPaymentAttempt,
  updateTransactionProviderState,
  listPayments,
  getPaymentCounts,
} = require('./financialDb.cjs');

const PAYMENT_STATES = ['CREATED','PENDING','APPROVED','FAILED','EXPIRED','REFUNDED','PAID','CANCELED'];
const REAL_PAYMENT_REQUIRED_ENVS = ['DATABASE_URL', 'MERCADO_PAGO_ACCESS_TOKEN'];

function getPaymentsState() {
  const mem = readMemory();
  return mem.payments || [];
}

function persistPayments(payments) {
  writeMemory({ payments });
}

function assertRealPaymentRuntimeConfigured() {
  const missing = REAL_PAYMENT_REQUIRED_ENVS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const err = new Error(`Real PIX runtime requires ${missing.join(', ')}`);
    err.code = 'REAL_PIX_RUNTIME_NOT_CONFIGURED';
    err.missing = missing;
    throw err;
  }
}

function buildTransactionInput(input = {}) {
  const amount = Number(input.amount || input.transaction_amount || 97);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be greater than zero');
  const id = input.transaction_id || input.payment_id || `pix_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const externalReference = input.external_reference || input.externalReference || id;
  const actorId = input.actor_id || input.agent_id || input.metadata?.agent_id || 'agent_buyer_1';
  const metadata = {
    conversion_class: input.conversion_class || 'HOT',
    cta_source: input.cta_source || 'UNKNOWN',
    signal_source: input.signal_source || 'UNKNOWN',
    plan: input.plan || input.metadata?.plan || null,
    ...(input.metadata || {}),
  };

  return {
    id,
    externalReference,
    actorId,
    actorCode: input.actor_code || input.metadata?.actor_code || null,
    amount,
    description: input.description || 'GXEON PIX credit purchase',
    metadata,
  };
}

async function createPixPayment(input = {}) {
  assertRealPaymentRuntimeConfigured();

  const tx = buildTransactionInput(input);
  await createGlobalTransaction({
    transactionId: tx.id,
    actorId: tx.actorId,
    actorCode: tx.actorCode,
    amount: tx.amount,
    externalReference: tx.externalReference,
    description: tx.description,
    metadata: tx.metadata,
  });

  const charge = await createPixCharge({
    amount: tx.amount,
    description: tx.description,
    externalReference: tx.externalReference,
    idempotencyKey: input.idempotency_key || `pix:${tx.externalReference}`,
    payer: input.payer,
    payer_email: input.payer_email,
    payer_first_name: input.payer_first_name,
    payer_last_name: input.payer_last_name,
    metadata: {
      ...tx.metadata,
      transaction_id: tx.id,
      actor_id: tx.actorId,
      external_reference: tx.externalReference,
    },
    dateOfExpiration: input.date_of_expiration || input.dateOfExpiration,
    notificationUrl: input.notification_url || input.notificationUrl,
  });

  await createPaymentAttempt({
    transactionId: tx.id,
    providerPaymentId: charge.providerPaymentId,
    status: charge.status,
    amount: tx.amount,
    idempotencyKey: charge.idempotencyKey,
    qrCode: charge.qrCode,
    qrCodeBase64: charge.qrCodeBase64,
    copyPastePix: charge.copyPastePix,
    ticketUrl: charge.ticketUrl,
    requestPayload: charge.requestPayload,
    rawProviderResponse: charge.raw,
  });

  await updateTransactionProviderState({
    transactionId: tx.id,
    providerPaymentId: charge.providerPaymentId,
    status: charge.status === 'APPROVED' ? 'PAID' : 'PENDING',
    metadata: { mercado_pago_status: charge.status, status_detail: charge.statusDetail },
  });

  return {
    payment_id: tx.id,
    transaction_id: tx.id,
    provider_payment_id: charge.providerPaymentId,
    status: charge.status,
    amount: tx.amount,
    provider: 'mercado_pago',
    external_reference: tx.externalReference,
    qrCode: charge.qrCode,
    qrCodeBase64: charge.qrCodeBase64,
    copyPastePix: charge.copyPastePix,
    ticketUrl: charge.ticketUrl,
    created_at: new Date().toISOString(),
  };
}

async function getPaymentsRuntimeAsync() {
  if (isFinancialDbConfigured()) {
    const [payments, counts] = await Promise.all([listPayments({ limit: 200 }), getPaymentCounts()]);
    const approved = counts.PAID || counts.APPROVED || 0;
    const pending = counts.PENDING || counts.CREATED || 0;
    const failed = counts.FAILED || 0;
    return {
      payment_runtime: 'ACTIVE',
      storage: 'POSTGRES',
      provider: 'mercado_pago',
      payments,
      states: counts,
      conversion_to_payment_ratio: approved + pending + failed > 0 ? Math.round((approved / (approved + pending + failed)) * 100) : 0,
      abandoned_checkouts: pending,
      duplicate_detector: 'DB_IDEMPOTENCY_KEYS',
      generated_at: new Date().toISOString(),
    };
  }

  const payments = getPaymentsState();
  const counts = Object.fromEntries(PAYMENT_STATES.map((s) => [s, payments.filter((p) => p.status === s).length]));
  const approved = counts.APPROVED || 0;
  const pending = counts.PENDING || 0;
  const failed = counts.FAILED || 0;
  const abandoned = payments.filter((p) => p.status === 'PENDING').length;
  return {
    payment_runtime: 'DEGRADED',
    storage: 'LOCAL_JSON_FALLBACK_READONLY',
    provider: 'mercado_pago',
    payments,
    states: counts,
    conversion_to_payment_ratio: approved + pending + failed > 0 ? Math.round((approved / (approved + pending + failed)) * 100) : 0,
    abandoned_checkouts: abandoned,
    duplicate_detector: 'LOCAL_MEMORY_ONLY',
    required_env: REAL_PAYMENT_REQUIRED_ENVS,
    generated_at: new Date().toISOString(),
  };
}

function getPaymentsRuntime() {
  const payments = getPaymentsState();
  const counts = Object.fromEntries(PAYMENT_STATES.map((s) => [s, payments.filter((payment) => payment.status === s).length]));
  const approved = counts.APPROVED || 0;
  const pending = counts.PENDING || 0;
  const failed = counts.FAILED || 0;
  const abandoned = payments.filter((payment) => payment.status === 'PENDING').length;
  return {
    payment_runtime: isFinancialDbConfigured() ? 'ACTIVE_DB_CONFIGURED' : 'DEGRADED',
    storage: isFinancialDbConfigured() ? 'POSTGRES_PRIMARY_LOCAL_SNAPSHOT' : 'LOCAL_JSON_FALLBACK_READONLY',
    provider: 'mercado_pago',
    payments,
    states: counts,
    conversion_to_payment_ratio: approved + pending + failed > 0 ? Math.round((approved / (approved + pending + failed)) * 100) : 0,
    abandoned_checkouts: abandoned,
    duplicate_detector: isFinancialDbConfigured() ? 'DB_IDEMPOTENCY_KEYS' : 'LOCAL_MEMORY_ONLY',
    required_env: REAL_PAYMENT_REQUIRED_ENVS,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { createPixPayment, getPaymentsRuntime, getPaymentsRuntimeAsync, assertRealPaymentRuntimeConfigured };
