#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const requireDb = createRequire(path.join(__dirname, '../lib/db/package.json'));
const { Client } = requireDb('pg');

const rootDir = path.resolve(__dirname, '..');
const generatedAt = new Date().toISOString();
const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
const apiBaseUrl = process.env.GXEON_API_BASE_URL || (process.env.PORT ? `http://127.0.0.1:${process.env.PORT}/api` : null);

const artifacts = {
  activationMarkdown: path.join(rootDir, 'SUPABASE_ACTIVATION_REPORT.md'),
  supabaseHealth: path.join(rootDir, 'artifacts/SUPABASE_HEALTH_REPORT.json'),
  databaseSmoke: path.join(rootDir, 'artifacts/DATABASE_SMOKE_RESULT.json'),
  financialRuntime: path.join(rootDir, 'artifacts/FINANCIAL_RUNTIME_REPORT.json'),
  endpointValidation: path.join(rootDir, 'artifacts/FINANCIAL_ENDPOINT_VALIDATION.json'),
};

const expectedTables = [
  'actor_wallets',
  'global_transactions',
  'payment_attempts',
  'financial_ledger',
  'payment_webhook_events',
];

const expectedEnums = {
  ledger_entry_type: ['CREDIT', 'DEBIT', 'TRANSFER', 'HOLD', 'RELEASE', 'REFUND', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT'],
  ledger_source_type: ['PAYMENT', 'COMMISSION', 'TASK', 'SUBSCRIPTION', 'MANUAL', 'REFUND'],
  payment_attempt_status: ['CREATED', 'PENDING', 'APPROVED', 'FAILED', 'EXPIRED', 'REFUNDED', 'CANCELED'],
  transaction_status: ['PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'],
  wallet_status: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
  webhook_processing_status: ['RECEIVED', 'PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED'],
};

const expectedIndexes = [
  'actor_wallets_actor_id_uq',
  'actor_wallets_actor_code_idx',
  'actor_wallets_status_idx',
  'global_transactions_transaction_id_uq',
  'global_transactions_external_reference_uq',
  'global_transactions_actor_id_idx',
  'global_transactions_actor_code_idx',
  'global_transactions_status_idx',
  'global_transactions_provider_payment_id_idx',
  'global_transactions_created_at_idx',
  'payment_attempts_idempotency_key_uq',
  'payment_attempts_transaction_id_idx',
  'payment_attempts_provider_payment_id_idx',
  'payment_attempts_status_idx',
  'payment_attempts_created_at_idx',
  'financial_ledger_ledger_entry_id_uq',
  'financial_ledger_idempotency_key_uq',
  'financial_ledger_actor_id_idx',
  'financial_ledger_wallet_id_idx',
  'financial_ledger_transaction_id_idx',
  'financial_ledger_source_idx',
  'financial_ledger_created_at_idx',
  'payment_webhook_events_idempotency_key_uq',
  'payment_webhook_events_provider_event_uq',
  'payment_webhook_events_provider_payment_id_idx',
  'payment_webhook_events_processing_status_idx',
  'payment_webhook_events_received_at_idx',
];

const expectedForeignKeys = [
  ['payment_attempts', 'transaction_id', 'global_transactions', 'transaction_id'],
  ['financial_ledger', 'wallet_id', 'actor_wallets', 'id'],
  ['financial_ledger', 'transaction_id', 'global_transactions', 'transaction_id'],
  ['financial_ledger', 'payment_attempt_id', 'payment_attempts', 'id'],
];

function maskUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username) url.username = '***';
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return value.replace(/:\/\/([^:@]+):([^@]+)@/, '://***:***@');
  }
}

function detectSupabase(value) {
  if (!value) return { provider: 'not_configured', projectId: null, host: null };
  try {
    const url = new URL(value);
    const hostname = url.hostname;
    const dbHostMatch = hostname.match(/^db\.([^.]+)\.supabase\.co$/);
    const poolerMatch = hostname.match(/^.*\.pooler\.supabase\.com$/);
    const envProjectId = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF || null;
    return {
      provider: dbHostMatch || poolerMatch || envProjectId ? 'supabase_postgres' : 'postgres',
      projectId: envProjectId || dbHostMatch?.[1] || null,
      host: hostname,
    };
  } catch {
    return { provider: 'postgres', projectId: process.env.SUPABASE_PROJECT_ID || null, host: null };
  }
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function missing(expected, actual) {
  return expected.filter((item) => !actual.includes(item));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

async function measureLatency(client, samples = 5) {
  const sampleValues = [];
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now();
    await client.query('select 1');
    sampleValues.push(round(performance.now() - started));
  }

  return {
    samplesMs: sampleValues,
    averageMs: round(sampleValues.reduce((sum, item) => sum + item, 0) / sampleValues.length),
  };
}

function runDrizzlePush() {
  if (!databaseUrl) {
    return { status: 'blocked', exitCode: 1, stdout: '', stderr: 'DATABASE_URL is not configured.' };
  }

  const result = spawnSync('pnpm', ['--filter', '@workspace/db', 'run', 'push'], {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: directUrl || databaseUrl },
    encoding: 'utf8',
  });

  return {
    status: result.status === 0 ? 'PASS' : 'FAILED',
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function validateConnection(connectionString, label) {
  if (!connectionString) return { label, configured: false, connected: false, latency: null, error: null };

  const client = new Client({ connectionString });
  try {
    await client.connect();
    const latency = await measureLatency(client, 3);
    return { label, configured: true, connected: true, latency, error: null };
  } catch (error) {
    return { label, configured: true, connected: false, latency: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await client.end().catch(() => {});
  }
}

async function validateSchema(client) {
  const tableRows = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE' and table_name = any($1::text[])
      order by table_name`,
    [expectedTables],
  );
  const actualTables = tableRows.rows.map((row) => row.table_name);

  const enumRows = await client.query(
    `select t.typname as enum_name, e.enumlabel as enum_value
       from pg_type t
       join pg_enum e on e.enumtypid = t.oid
       join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = any($1::text[])
      order by t.typname, e.enumsortorder`,
    [Object.keys(expectedEnums)],
  );
  const actualEnums = {};
  for (const row of enumRows.rows) {
    actualEnums[row.enum_name] ??= [];
    actualEnums[row.enum_name].push(row.enum_value);
  }
  const missingEnumValues = {};
  for (const [enumName, values] of Object.entries(expectedEnums)) {
    const absent = missing(values, actualEnums[enumName] || []);
    if (absent.length) missingEnumValues[enumName] = absent;
  }

  const indexRows = await client.query(
    `select indexname from pg_indexes
      where schemaname = 'public' and indexname = any($1::text[])
      order by indexname`,
    [expectedIndexes],
  );
  const actualIndexes = indexRows.rows.map((row) => row.indexname);

  const fkRows = await client.query(
    `select tc.table_name, kcu.column_name, ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
       join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public' and tc.table_name = any($1::text[])
      order by tc.table_name, kcu.column_name`,
    [expectedTables],
  );
  const actualForeignKeys = fkRows.rows.map((row) => [row.table_name, row.column_name, row.foreign_table_name, row.foreign_column_name]);
  const missingForeignKeys = expectedForeignKeys.filter((expected) => !actualForeignKeys.some((actual) => expected.every((part, index) => part === actual[index])));

  return {
    tables: { expected: expectedTables, actual: actualTables, missing: missing(expectedTables, actualTables) },
    enums: { expected: expectedEnums, actual: actualEnums, missing: missing(Object.keys(expectedEnums), Object.keys(actualEnums)), missingValues: missingEnumValues },
    indexes: { expected: expectedIndexes, actual: actualIndexes, missing: missing(expectedIndexes, actualIndexes) },
    foreignKeys: { expected: expectedForeignKeys, actual: actualForeignKeys, missing: missingForeignKeys },
  };
}

function schemaPasses(schema) {
  return schema.tables.missing.length === 0
    && schema.enums.missing.length === 0
    && Object.keys(schema.enums.missingValues).length === 0
    && schema.indexes.missing.length === 0
    && schema.foreignKeys.missing.length === 0;
}

async function runCrudValidation(client) {
  const seed = `gxeon-supa-${Date.now()}-${randomUUID()}`;
  const transactionId = `${seed}-tx`;
  const paymentAttemptIdempotency = `${seed}-attempt-idem`;
  const ledgerEntryId = `${seed}-ledger`;
  const webhookIdempotency = `${seed}-webhook-idem`;
  const webhookProviderEventId = `${seed}-event`;

  const wallet = (await client.query(
    `insert into actor_wallets (actor_id, actor_code, metadata)
     values ($1, 'GXEON_SUPABASE_ACTIVATION', $2::jsonb) returning *`,
    [seed, JSON.stringify({ source: 'supabase_activation', seed: true })],
  )).rows[0];
  const walletUpdate = (await client.query(
    `update actor_wallets set balance = '101.00', credit_limit = '12.00', updated_at = now(), metadata = metadata || $2::jsonb
      where id = $1 returning *`,
    [wallet.id, JSON.stringify({ crud: 'updated' })],
  )).rows[0];

  const transaction = (await client.query(
    `insert into global_transactions (transaction_id, actor_id, actor_code, base_amount, external_reference, description, metadata)
     values ($1,$2,'GXEON_SUPABASE_ACTIVATION','101.00',$3,$4,$5::jsonb) returning *`,
    [transactionId, seed, `${seed}-external`, 'Supabase activation transaction seed', JSON.stringify({ source: 'supabase_activation', seed: true })],
  )).rows[0];
  const transactionUpdate = (await client.query(
    `update global_transactions set status = 'PAID', provider_payment_id = $2, paid_at = now(), updated_at = now(), metadata = metadata || $3::jsonb
      where transaction_id = $1 returning *`,
    [transactionId, `${seed}-provider-payment`, JSON.stringify({ crud: 'updated' })],
  )).rows[0];

  const paymentAttempt = (await client.query(
    `insert into payment_attempts (transaction_id, provider_payment_id, status, amount, idempotency_key, request_payload, raw_provider_response)
     values ($1,$2,'APPROVED','101.00',$3,$4::jsonb,$5::jsonb) returning *`,
    [transactionId, `${seed}-provider-payment`, paymentAttemptIdempotency, JSON.stringify({ source: 'supabase_activation' }), JSON.stringify({ ok: true })],
  )).rows[0];
  const paymentAttemptUpdate = (await client.query(
    `update payment_attempts set error_message = $2, updated_at = now(), raw_provider_response = raw_provider_response || $3::jsonb
      where id = $1 returning *`,
    [paymentAttempt.id, 'activation-validated', JSON.stringify({ updated: true })],
  )).rows[0];

  const ledger = (await client.query(
    `insert into financial_ledger (ledger_entry_id, actor_id, wallet_id, transaction_id, payment_attempt_id, entry_type, source_type, source_id, amount, balance_after, idempotency_key, description, metadata)
     values ($1,$2,$3,$4,$5,'CREDIT','PAYMENT',$4,'101.00','101.00',$6,$7,$8::jsonb) returning *`,
    [ledgerEntryId, seed, wallet.id, transactionId, paymentAttempt.id, `${seed}-ledger-idem`, 'Supabase activation ledger seed', JSON.stringify({ source: 'supabase_activation', seed: true })],
  )).rows[0];
  const ledgerUpdate = (await client.query(
    `update financial_ledger set description = $2, metadata = metadata || $3::jsonb where ledger_entry_id = $1 returning *`,
    [ledgerEntryId, 'Supabase activation ledger seed updated', JSON.stringify({ crud: 'updated' })],
  )).rows[0];

  const webhook = (await client.query(
    `insert into payment_webhook_events (provider_event_id, provider_payment_id, event_type, action, idempotency_key, processing_status, raw_payload, normalized_payload)
     values ($1,$2,'payment','payment.updated',$3,'RECEIVED',$4::jsonb,$5::jsonb) returning *`,
    [webhookProviderEventId, `${seed}-provider-payment`, webhookIdempotency, JSON.stringify({ source: 'supabase_activation' }), JSON.stringify({ transactionId })],
  )).rows[0];
  const webhookUpdate = (await client.query(
    `update payment_webhook_events set processing_status = 'PROCESSED', processed_at = now(), normalized_payload = normalized_payload || $2::jsonb
      where id = $1 returning *`,
    [webhook.id, JSON.stringify({ updated: true })],
  )).rows[0];

  const selectRow = (await client.query(
    `select
       (select count(*)::int from actor_wallets where actor_id = $1 and balance = '101.00') as wallets,
       (select count(*)::int from global_transactions where transaction_id = $2 and status = 'PAID') as transactions,
       (select count(*)::int from payment_attempts where id = $3 and error_message = 'activation-validated') as payment_attempts,
       (select count(*)::int from financial_ledger where ledger_entry_id = $4 and description = 'Supabase activation ledger seed updated') as ledger_entries,
       (select count(*)::int from payment_webhook_events where id = $5 and processing_status = 'PROCESSED') as webhooks`,
    [seed, transactionId, paymentAttempt.id, ledgerEntryId, webhook.id],
  )).rows[0];

  const deleteIdempotency = `${seed}-delete-webhook-idem`;
  const deleteCandidate = (await client.query(
    `insert into payment_webhook_events (provider_event_id, provider_payment_id, event_type, idempotency_key, raw_payload, normalized_payload)
     values ($1,$2,'payment',$3,$4::jsonb,$5::jsonb) returning id`,
    [`${seed}-delete-event`, `${seed}-provider-payment`, deleteIdempotency, JSON.stringify({ delete: true }), JSON.stringify({ delete: true })],
  )).rows[0];
  await client.query('delete from payment_webhook_events where id = $1', [deleteCandidate.id]);
  const deleteCount = Number((await client.query('select count(*)::int as count from payment_webhook_events where id = $1', [deleteCandidate.id])).rows[0].count);

  return {
    seed,
    ids: {
      walletId: wallet.id,
      transactionId,
      paymentAttemptId: paymentAttempt.id,
      ledgerEntryId,
      webhookId: webhook.id,
    },
    checks: {
      wallet_crud: Boolean(wallet.id) && walletUpdate.balance === '101.00' && Number(selectRow.wallets) === 1,
      transaction_crud: transaction.transaction_id === transactionId && transactionUpdate.status === 'PAID' && Number(selectRow.transactions) === 1,
      payment_attempt_crud: Boolean(paymentAttempt.id) && paymentAttemptUpdate.error_message === 'activation-validated' && Number(selectRow.payment_attempts) === 1,
      ledger_crud: ledger.ledger_entry_id === ledgerEntryId && ledgerUpdate.description === 'Supabase activation ledger seed updated' && Number(selectRow.ledger_entries) === 1,
      webhook_crud: Boolean(webhook.id) && webhookUpdate.processing_status === 'PROCESSED' && Number(selectRow.webhooks) === 1,
      delete_validation: deleteCount === 0,
    },
  };
}

async function validateRollback(client) {
  const seed = `gxeon-supa-rollback-${Date.now()}-${randomUUID()}`;
  const transactionId = `${seed}-tx`;
  const ledgerEntryId = `${seed}-ledger`;
  const webhookIdempotency = `${seed}-webhook-idem`;
  let paymentAttemptId = null;

  await client.query('begin');
  try {
    const walletId = (await client.query(
      `insert into actor_wallets (actor_id, actor_code, metadata) values ($1,'GXEON_SUPABASE_ROLLBACK',$2::jsonb) returning id`,
      [seed, JSON.stringify({ source: 'supabase_activation', rollback: true })],
    )).rows[0].id;
    await client.query(
      `insert into global_transactions (transaction_id, actor_id, actor_code, base_amount, external_reference, description, metadata)
       values ($1,$2,'GXEON_SUPABASE_ROLLBACK','9.00',$3,$4,$5::jsonb)`,
      [transactionId, seed, `${seed}-external`, 'Supabase rollback transaction', JSON.stringify({ source: 'supabase_activation', rollback: true })],
    );
    paymentAttemptId = (await client.query(
      `insert into payment_attempts (transaction_id, status, amount, idempotency_key) values ($1,'CREATED','9.00',$2) returning id`,
      [transactionId, `${seed}-attempt-idem`],
    )).rows[0].id;
    await client.query(
      `insert into financial_ledger (ledger_entry_id, actor_id, wallet_id, transaction_id, payment_attempt_id, entry_type, source_type, source_id, amount, balance_after, idempotency_key, metadata)
       values ($1,$2,$3,$4,$5,'CREDIT','PAYMENT',$4,'9.00','9.00',$6,$7::jsonb)`,
      [ledgerEntryId, seed, walletId, transactionId, paymentAttemptId, `${seed}-ledger-idem`, JSON.stringify({ source: 'supabase_activation', rollback: true })],
    );
    await client.query(
      `insert into payment_webhook_events (provider_event_id, event_type, idempotency_key, raw_payload, normalized_payload)
       values ($1,'payment',$2,$3::jsonb,$4::jsonb)`,
      [`${seed}-event`, webhookIdempotency, JSON.stringify({ rollback: true }), JSON.stringify({ rollback: true })],
    );
  } finally {
    await client.query('rollback');
  }

  const row = (await client.query(
    `select
       (select count(*)::int from actor_wallets where actor_id = $1) as wallets,
       (select count(*)::int from global_transactions where transaction_id = $2) as transactions,
       (select count(*)::int from payment_attempts where transaction_id = $2) as payment_attempts,
       (select count(*)::int from financial_ledger where ledger_entry_id = $3) as ledger_entries,
       (select count(*)::int from payment_webhook_events where idempotency_key = $4) as webhooks`,
    [seed, transactionId, ledgerEntryId, webhookIdempotency],
  )).rows[0];
  const counts = {
    wallets: Number(row.wallets),
    transactions: Number(row.transactions),
    paymentAttempts: Number(row.payment_attempts),
    ledgerEntries: Number(row.ledger_entries),
    webhooks: Number(row.webhooks),
  };
  return { seed, paymentAttemptId, counts, passed: Object.values(counts).every((count) => count === 0) };
}

async function validateForeignKeyRejection(client) {
  const seed = `gxeon-supa-fk-${Date.now()}-${randomUUID()}`;
  const checks = { paymentAttemptRejected: false, ledgerWalletRejected: false, ledgerTransactionRejected: false, ledgerPaymentAttemptRejected: false };

  await client.query('begin');
  try {
    await client.query(`insert into payment_attempts (transaction_id, amount, idempotency_key) values ($1,'1.00',$2)`, [`${seed}-missing-tx`, `${seed}-attempt-idem`]);
  } catch (error) {
    checks.paymentAttemptRejected = error && error.code === '23503';
  } finally {
    await client.query('rollback');
  }

  const cases = [
    ['ledgerWalletRejected', randomUUID(), null, null],
    ['ledgerTransactionRejected', null, `${seed}-missing-tx`, null],
    ['ledgerPaymentAttemptRejected', null, null, randomUUID()],
  ];

  for (const [key, walletId, transactionId, paymentAttemptId] of cases) {
    await client.query('begin');
    try {
      await client.query(
        `insert into financial_ledger (ledger_entry_id, actor_id, wallet_id, transaction_id, payment_attempt_id, entry_type, source_type, amount, idempotency_key)
         values ($1,$2,$3,$4,$5,'CREDIT','PAYMENT','1.00',$6)`,
        [`${seed}-${key}`, seed, walletId, transactionId, paymentAttemptId, `${seed}-${key}-idem`],
      );
    } catch (error) {
      checks[key] = error && error.code === '23503';
    } finally {
      await client.query('rollback');
    }
  }

  return { checks, passed: Object.values(checks).every(Boolean) };
}

async function collectCounts(client) {
  const row = (await client.query(
    `select
       (select count(*)::int from actor_wallets) as wallets,
       (select count(*)::int from global_transactions) as transactions,
       (select count(*)::int from payment_attempts) as payment_attempts,
       (select count(*)::int from financial_ledger) as ledger_entries,
       (select count(*)::int from payment_webhook_events) as webhooks`,
  )).rows[0];
  return {
    wallets: Number(row.wallets),
    transactions: Number(row.transactions),
    paymentAttempts: Number(row.payment_attempts),
    ledgerEntries: Number(row.ledger_entries),
    webhooks: Number(row.webhooks),
  };
}

async function validateEndpoints(runtimeHealthy) {
  const endpoints = [
    '/v1/runtime/database',
    '/v1/financial/health',
    '/v1/financial/wallets',
    '/v1/financial/transactions',
  ];

  if (!apiBaseUrl) {
    return {
      report: 'FINANCIAL_ENDPOINT_VALIDATION',
      generatedAt,
      status: 'skipped',
      reason: 'GXEON_API_BASE_URL or PORT is required to validate HTTP endpoints.',
      baseUrl: null,
      endpoints: endpoints.map((endpoint) => ({ endpoint, status: 'skipped' })),
      passed: false,
    };
  }

  const results = [];
  for (const endpoint of endpoints) {
    const started = performance.now();
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`);
      const body = await response.json().catch(() => null);
      results.push({
        endpoint,
        httpStatus: response.status,
        latencyMs: round(performance.now() - started),
        healthy: response.status === 200 && JSON.stringify(body).includes('healthy'),
        body,
      });
    } catch (error) {
      results.push({ endpoint, httpStatus: null, latencyMs: round(performance.now() - started), healthy: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    report: 'FINANCIAL_ENDPOINT_VALIDATION',
    generatedAt,
    status: results.every((result) => result.httpStatus === 200) && runtimeHealthy ? 'PASS' : 'FAILED',
    baseUrl: apiBaseUrl,
    endpoints: results,
    passed: results.every((result) => result.httpStatus === 200) && runtimeHealthy,
  };
}

function scoreActivation(parts) {
  const checks = [
    parts.databaseConnected,
    parts.supabaseOnline,
    parts.schemaApplied,
    parts.allTablesPresent,
    parts.allEnumsPresent,
    parts.foreignKeysValid,
    parts.indexesValid,
    parts.crudPass,
    parts.rollbackPass,
    parts.runtimeHealthy,
    parts.endpointPass,
    parts.latencyPass,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function blockedArtifacts(reason) {
  const supabase = detectSupabase(databaseUrl);
  const health = {
    report: 'SUPABASE_HEALTH_REPORT',
    generatedAt,
    mission: 'MISSION_003_7_SUPABASE_ACTIVATION',
    status: 'BLOCKED',
    databaseConnected: false,
    supabaseOnline: false,
    schemaApplied: false,
    financialRuntime: 'BLOCKED',
    apiStatus: 'BLOCKED',
    databaseUrlConfigured: Boolean(databaseUrl),
    databaseUrlMasked: maskUrl(databaseUrl),
    directUrlConfigured: Boolean(directUrl),
    directUrlMasked: maskUrl(directUrl),
    supabaseProjectId: supabase.projectId,
    reason,
    operationalScore: 0,
  };
  const smoke = {
    report: 'DATABASE_SMOKE_RESULT',
    generatedAt,
    status: 'BLOCKED',
    checks: {
      database_connected: false,
      schema_applied: false,
      all_tables_present: false,
      all_enums_present: false,
      foreign_keys_valid: false,
      indexes_valid: false,
      wallet_crud: false,
      transaction_crud: false,
      payment_attempt_crud: false,
      ledger_crud: false,
      webhook_crud: false,
      delete_validation: false,
      rollback_test: false,
    },
    reason,
  };
  const runtime = {
    report: 'FINANCIAL_RUNTIME_REPORT',
    generatedAt,
    status: 'BLOCKED',
    reason,
    metrics: null,
  };
  const endpoints = {
    report: 'FINANCIAL_ENDPOINT_VALIDATION',
    generatedAt,
    status: 'BLOCKED',
    reason,
    endpoints: [],
    passed: false,
  };
  return { health, smoke, runtime, endpoints };
}

function writeMarkdownReport(context) {
  const lines = [
    '# SUPABASE ACTIVATION REPORT — MISSION_003_7_SUPABASE_ACTIVATION',
    '',
    `- **Generated at:** ${generatedAt}`,
    '- **Branch:** `feature/supabase-activation`',
    `- **Mission status:** ${context.health.status}`,
    `- **Supabase Project ID:** ${context.health.supabaseProjectId || 'not detected'}`,
    `- **Database status:** ${context.health.databaseConnected ? 'ONLINE' : 'BLOCKED'}`,
    `- **Financial runtime:** ${context.health.financialRuntime}`,
    `- **API status:** ${context.health.apiStatus}`,
    `- **Operational score:** ${context.health.operationalScore}`,
    '',
    '## Connectivity',
    '',
    `- DATABASE_URL configured: ${context.health.databaseUrlConfigured}`,
    `- DIRECT_URL configured: ${context.health.directUrlConfigured}`,
    `- Database latency: ${context.health.databaseLatencyMs ?? 'n/a'} ms`,
    '',
    '## Schema validation summary',
    '',
    `- Tables present: ${context.schema ? context.schema.tables.missing.length === 0 : false}`,
    `- Enums present: ${context.schema ? context.schema.enums.missing.length === 0 && Object.keys(context.schema.enums.missingValues).length === 0 : false}`,
    `- Foreign keys valid: ${context.schema ? context.schema.foreignKeys.missing.length === 0 : false}`,
    `- Indexes valid: ${context.schema ? context.schema.indexes.missing.length === 0 : false}`,
    '',
    '## Table counts',
    '',
    `- Wallets: ${context.counts?.wallets ?? 0}`,
    `- Transactions: ${context.counts?.transactions ?? 0}`,
    `- Payment attempts: ${context.counts?.paymentAttempts ?? 0}`,
    `- Ledger entries: ${context.counts?.ledgerEntries ?? 0}`,
    `- Webhooks: ${context.counts?.webhooks ?? 0}`,
    '',
    '## CRUD validation summary',
    '',
    `- Wallet CRUD: ${Boolean(context.crud?.checks?.wallet_crud)}`,
    `- Transaction CRUD: ${Boolean(context.crud?.checks?.transaction_crud)}`,
    `- Payment attempt CRUD: ${Boolean(context.crud?.checks?.payment_attempt_crud)}`,
    `- Ledger CRUD: ${Boolean(context.crud?.checks?.ledger_crud)}`,
    `- Webhook CRUD: ${Boolean(context.crud?.checks?.webhook_crud)}`,
    `- Delete validation: ${Boolean(context.crud?.checks?.delete_validation)}`,
    `- Rollback validation: ${Boolean(context.rollback?.passed)}`,
    '',
    '## Endpoint validation summary',
    '',
    `- Endpoint validation: ${context.endpoints.status}`,
    `- Base URL: ${context.endpoints.baseUrl || 'not configured'}`,
    '',
    '## Next mission',
    '',
    context.health.status === 'PASS'
      ? '- Proceed to `MISSION_004_DASHBOARD_FOUNDATION` on `feature/dashboard-foundation`.'
      : '- Activation is blocked until a real Supabase `DATABASE_URL`/`DIRECT_URL` is provided and endpoint validation is run against the API.',
  ];
  writeFileSync(artifacts.activationMarkdown, `${lines.join('\n')}\n`);
}

async function runActivation() {
  if (!databaseUrl) {
    const blocked = blockedArtifacts('DATABASE_URL is not configured; Supabase activation cannot connect to a real project.');
    writeJson(artifacts.supabaseHealth, blocked.health);
    writeJson(artifacts.databaseSmoke, blocked.smoke);
    writeJson(artifacts.financialRuntime, blocked.runtime);
    writeJson(artifacts.endpointValidation, blocked.endpoints);
    writeMarkdownReport({ ...blocked, schema: null, counts: null, crud: null, rollback: null });
    console.error(JSON.stringify(blocked.health, null, 2));
    process.exitCode = 1;
    return;
  }

  const supabase = detectSupabase(databaseUrl);
  const primaryConnection = await validateConnection(databaseUrl, 'DATABASE_URL');
  const directConnection = await validateConnection(directUrl, 'DIRECT_URL');
  const drizzlePush = runDrizzlePush();

  const client = new Client({ connectionString: directUrl || databaseUrl });
  let schema = null;
  let crud = null;
  let rollback = null;
  let fkRuntime = null;
  let counts = null;
  let latency = primaryConnection.latency;

  try {
    if (!primaryConnection.connected) {
      throw new Error(primaryConnection.error || 'DATABASE_URL connection failed.');
    }
    await client.connect();
    schema = await validateSchema(client);
    if (!schemaPasses(schema)) {
      throw new Error('Financial schema is not synchronized after drizzle push.');
    }
    crud = await runCrudValidation(client);
    rollback = await validateRollback(client);
    fkRuntime = await validateForeignKeyRejection(client);
    counts = await collectCounts(client);
    latency = await measureLatency(client, 5);

    const crudPass = Object.values(crud.checks).every(Boolean);
    const runtimeHealthy = crudPass && rollback.passed && fkRuntime.passed && latency.averageMs < 100;
    const endpointValidation = await validateEndpoints(runtimeHealthy);
    const score = scoreActivation({
      databaseConnected: primaryConnection.connected,
      supabaseOnline: supabase.provider === 'supabase_postgres',
      schemaApplied: drizzlePush.status === 'PASS',
      allTablesPresent: schema.tables.missing.length === 0,
      allEnumsPresent: schema.enums.missing.length === 0 && Object.keys(schema.enums.missingValues).length === 0,
      foreignKeysValid: schema.foreignKeys.missing.length === 0 && fkRuntime.passed,
      indexesValid: schema.indexes.missing.length === 0,
      crudPass,
      rollbackPass: rollback.passed,
      runtimeHealthy,
      endpointPass: endpointValidation.passed,
      latencyPass: latency.averageMs < 100,
    });
    const pass = score === 100;

    const health = {
      report: 'SUPABASE_HEALTH_REPORT',
      generatedAt,
      mission: 'MISSION_003_7_SUPABASE_ACTIVATION',
      status: pass ? 'PASS' : 'PARTIAL',
      databaseConnected: primaryConnection.connected,
      directConnected: directConnection.configured ? directConnection.connected : null,
      supabaseOnline: supabase.provider === 'supabase_postgres',
      supabaseProjectId: supabase.projectId,
      schemaApplied: drizzlePush.status === 'PASS',
      allTablesPresent: schema.tables.missing.length === 0,
      allEnumsPresent: schema.enums.missing.length === 0 && Object.keys(schema.enums.missingValues).length === 0,
      foreignKeysValid: schema.foreignKeys.missing.length === 0 && fkRuntime.passed,
      indexesValid: schema.indexes.missing.length === 0,
      databaseLatencyMs: latency.averageMs,
      financialRuntime: runtimeHealthy ? 'HEALTHY' : 'DEGRADED',
      apiStatus: endpointValidation.passed ? 'OPERATIONAL' : 'NOT_VALIDATED',
      databaseUrlConfigured: true,
      databaseUrlMasked: maskUrl(databaseUrl),
      directUrlConfigured: Boolean(directUrl),
      directUrlMasked: maskUrl(directUrl),
      tableCounts: counts,
      operationalScore: score,
      drizzlePush: { status: drizzlePush.status, exitCode: drizzlePush.exitCode },
    };

    const smoke = {
      report: 'DATABASE_SMOKE_RESULT',
      generatedAt,
      status: pass ? 'PASS' : 'PARTIAL',
      checks: {
        database_connected: primaryConnection.connected,
        schema_applied: drizzlePush.status === 'PASS',
        all_tables_present: schema.tables.missing.length === 0,
        all_enums_present: schema.enums.missing.length === 0 && Object.keys(schema.enums.missingValues).length === 0,
        foreign_keys_valid: schema.foreignKeys.missing.length === 0 && fkRuntime.passed,
        indexes_valid: schema.indexes.missing.length === 0,
        wallet_crud: crud.checks.wallet_crud,
        transaction_crud: crud.checks.transaction_crud,
        payment_attempt_crud: crud.checks.payment_attempt_crud,
        ledger_crud: crud.checks.ledger_crud,
        webhook_crud: crud.checks.webhook_crud,
        delete_validation: crud.checks.delete_validation,
        rollback_test: rollback.passed,
      },
      schema,
      crud,
      rollback,
      foreignKeyRuntimeValidation: fkRuntime,
      latency,
      counts,
    };

    const runtime = {
      report: 'FINANCIAL_RUNTIME_REPORT',
      generatedAt,
      status: runtimeHealthy ? 'HEALTHY' : 'DEGRADED',
      services: {
        WalletService: crud.checks.wallet_crud,
        TransactionService: crud.checks.transaction_crud,
        LedgerService: crud.checks.ledger_crud,
        MetricsService: latency.averageMs < 100,
        HealthService: runtimeHealthy,
      },
      metrics: { databaseLatencyMs: latency.averageMs, tableCounts: counts, healthScore: runtimeHealthy ? 100 : score },
    };

    writeJson(artifacts.supabaseHealth, health);
    writeJson(artifacts.databaseSmoke, smoke);
    writeJson(artifacts.financialRuntime, runtime);
    writeJson(artifacts.endpointValidation, endpointValidation);
    writeMarkdownReport({ health, smoke, runtime, endpoints: endpointValidation, schema, counts, crud, rollback });
    console.log(JSON.stringify(health, null, 2));
    process.exitCode = pass ? 0 : 1;
  } catch (error) {
    const endpointValidation = await validateEndpoints(false);
    const reason = error instanceof Error ? error.message : String(error);
    const health = {
      report: 'SUPABASE_HEALTH_REPORT',
      generatedAt,
      mission: 'MISSION_003_7_SUPABASE_ACTIVATION',
      status: 'FAILED',
      databaseConnected: primaryConnection.connected,
      directConnected: directConnection.configured ? directConnection.connected : null,
      supabaseOnline: supabase.provider === 'supabase_postgres',
      supabaseProjectId: supabase.projectId,
      schemaApplied: drizzlePush.status === 'PASS',
      databaseLatencyMs: latency?.averageMs ?? null,
      financialRuntime: 'DEGRADED',
      apiStatus: 'FAILED',
      databaseUrlConfigured: true,
      databaseUrlMasked: maskUrl(databaseUrl),
      directUrlConfigured: Boolean(directUrl),
      directUrlMasked: maskUrl(directUrl),
      tableCounts: counts,
      operationalScore: 0,
      drizzlePush: { status: drizzlePush.status, exitCode: drizzlePush.exitCode },
      reason,
    };
    const smoke = { report: 'DATABASE_SMOKE_RESULT', generatedAt, status: 'FAILED', schema, crud, rollback, foreignKeyRuntimeValidation: fkRuntime, counts, reason };
    const runtime = { report: 'FINANCIAL_RUNTIME_REPORT', generatedAt, status: 'DEGRADED', reason, metrics: null };
    writeJson(artifacts.supabaseHealth, health);
    writeJson(artifacts.databaseSmoke, smoke);
    writeJson(artifacts.financialRuntime, runtime);
    writeJson(artifacts.endpointValidation, endpointValidation);
    writeMarkdownReport({ health, smoke, runtime, endpoints: endpointValidation, schema, counts, crud, rollback });
    console.error(JSON.stringify(health, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

runActivation();
