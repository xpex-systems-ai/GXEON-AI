#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { getMercadoPagoRuntimeConfig } = require(path.resolve(__dirname, '../server/runtime/mercadoPagoAdapter.cjs'));

const config = getMercadoPagoRuntimeConfig();
const summary = {
  provider: config.provider,
  mode: config.mode,
  ready_for_real_pix: config.ready_for_real_pix,
  can_create_pix: config.can_create_pix,
  missing_required: config.missing_required,
  optional: config.optional,
  credentials: config.credentials,
  safety: config.safety,
};

console.log(JSON.stringify(summary, null, 2));

if (!config.can_create_pix) {
  console.error(`Mercado Pago PIX is not ready. Missing: ${config.missing_required.join(', ')}`);
  process.exit(1);
}

if (!config.ready_for_real_pix) {
  console.error('Mercado Pago token is configured, but it does not look like a production APP_USR token.');
  process.exit(2);
}
