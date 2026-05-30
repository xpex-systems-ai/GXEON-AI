'use strict';

const DEFAULT_API_BASE = 'https://api.mercadopago.com';

function getAccessToken() {
  return process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
}

function getApiBase() {
  return (process.env.MERCADO_PAGO_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function requireAccessToken() {
  const token = getAccessToken();
  if (!token) {
    const err = new Error('MERCADO_PAGO_ACCESS_TOKEN is required to create or inspect real PIX payments');
    err.code = 'MERCADO_PAGO_ACCESS_TOKEN_REQUIRED';
    throw err;
  }
  return token;
}

function normalizePaymentStatus(status = '') {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'APPROVED';
  if (value === 'rejected' || value === 'cancelled' || value === 'canceled') return 'FAILED';
  if (value === 'refunded' || value === 'charged_back') return 'REFUNDED';
  if (value === 'expired') return 'EXPIRED';
  if (value === 'pending' || value === 'in_process') return 'PENDING';
  return value ? value.toUpperCase() : 'PENDING';
}

function resolvePayer(input = {}) {
  const payer = input.payer || {};
  const email = payer.email || input.payer_email || process.env.MERCADO_PAGO_DEFAULT_PAYER_EMAIL;
  if (!email) {
    const err = new Error('payer.email is required for Mercado Pago PIX payment creation');
    err.code = 'MERCADO_PAGO_PAYER_EMAIL_REQUIRED';
    throw err;
  }

  return {
    email,
    ...(payer.first_name || input.payer_first_name ? { first_name: payer.first_name || input.payer_first_name } : {}),
    ...(payer.last_name || input.payer_last_name ? { last_name: payer.last_name || input.payer_last_name } : {}),
    ...(payer.identification ? { identification: payer.identification } : {}),
  };
}

function extractPixData(payment = {}) {
  const transactionData = payment.point_of_interaction?.transaction_data || {};
  return {
    providerPaymentId: payment.id ? String(payment.id) : null,
    status: normalizePaymentStatus(payment.status),
    statusDetail: payment.status_detail || null,
    qrCode: transactionData.qr_code || null,
    qrCodeBase64: transactionData.qr_code_base64 || null,
    copyPastePix: transactionData.qr_code || null,
    ticketUrl: transactionData.ticket_url || payment.transaction_details?.external_resource_url || null,
    externalReference: payment.external_reference || null,
    amount: Number(payment.transaction_amount || 0),
    raw: payment,
  };
}

async function mercadoPagoRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const token = requireAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${getApiBase()}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const err = new Error(data.message || `Mercado Pago request failed with HTTP ${response.status}`);
    err.code = data.error || data.status || 'MERCADO_PAGO_REQUEST_FAILED';
    err.status = response.status;
    err.payload = data;
    throw err;
  }

  return data;
}

async function createPixCharge(input = {}) {
  const amount = Number(input.amount || input.transaction_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('amount must be greater than zero');
    err.code = 'INVALID_PIX_AMOUNT';
    throw err;
  }

  const externalReference = input.externalReference || input.external_reference;
  if (!externalReference) {
    const err = new Error('externalReference is required for Mercado Pago PIX payment creation');
    err.code = 'EXTERNAL_REFERENCE_REQUIRED';
    throw err;
  }

  const idempotencyKey = input.idempotencyKey || `pix:${externalReference}`;
  const notificationUrl = input.notificationUrl || process.env.MERCADO_PAGO_NOTIFICATION_URL;
  const body = {
    transaction_amount: Number(amount.toFixed(2)),
    description: input.description || 'GXEON PIX credit purchase',
    payment_method_id: 'pix',
    payer: resolvePayer(input),
    external_reference: externalReference,
    metadata: input.metadata || {},
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    ...(input.dateOfExpiration ? { date_of_expiration: input.dateOfExpiration } : {}),
  };

  const raw = await mercadoPagoRequest('/v1/payments', {
    method: 'POST',
    body,
    idempotencyKey,
  });

  return {
    idempotencyKey,
    requestPayload: body,
    ...extractPixData(raw),
  };
}

async function getPaymentStatus(providerPaymentId) {
  if (!providerPaymentId) {
    const err = new Error('providerPaymentId is required');
    err.code = 'PROVIDER_PAYMENT_ID_REQUIRED';
    throw err;
  }
  const raw = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(String(providerPaymentId))}`);
  return extractPixData(raw);
}

module.exports = { createPixCharge, getPaymentStatus, normalizePaymentStatus };
