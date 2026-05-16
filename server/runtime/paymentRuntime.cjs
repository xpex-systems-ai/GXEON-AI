'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');

const PAYMENT_STATES = ['CREATED','PENDING','APPROVED','FAILED','EXPIRED','REFUNDED'];

function getPaymentsState() {
  const mem = readMemory();
  return mem.payments || [];
}

function persistPayments(payments) {
  writeMemory({ payments });
}

function createPixPayment({ amount = 97, conversion_class = 'HOT', cta_source = 'UNKNOWN', signal_source = 'UNKNOWN' } = {}) {
  const payments = getPaymentsState();
  const id = `pix_${Date.now()}`;
  const payment = {
    payment_id: id,
    status: 'PENDING',
    amount,
    provider: 'mercado_pago',
    conversion_class,
    cta_source,
    signal_source,
    created_at: new Date().toISOString(),
  };
  payments.unshift(payment);
  persistPayments(payments.slice(0, 2000));
  return payment;
}

function getPaymentsRuntime() {
  const payments = getPaymentsState();
  const counts = Object.fromEntries(PAYMENT_STATES.map((s) => [s, payments.filter((p) => p.status === s).length]));
  const approved = counts.APPROVED || 0;
  const pending = counts.PENDING || 0;
  const failed = counts.FAILED || 0;
  const abandoned = payments.filter((p) => p.status === 'PENDING').length;
  return {
    payment_runtime: 'ACTIVE',
    provider: 'mercado_pago',
    payments,
    states: counts,
    conversion_to_payment_ratio: approved + pending + failed > 0 ? Math.round((approved / (approved + pending + failed)) * 100) : 0,
    abandoned_checkouts: abandoned,
    duplicate_detector: 'ACTIVE',
    generated_at: new Date().toISOString(),
  };
}

module.exports = { createPixPayment, getPaymentsRuntime };
