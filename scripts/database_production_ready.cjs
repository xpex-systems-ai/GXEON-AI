#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const requireDb = createRequire(path.join(__dirname, '../lib/db/package.json'));
const { Client } = requireDb('pg');

const rootDir = path.resolve(__dirname, '..');
const databaseUrl = process.env.DATABASE_URL;
const generatedAt = new Date().toISOString();

const artifactPaths = {
  smoke: path.join(rootDir, 'artifacts/DATABASE_SMOKE_RESULT.json'),
  health: path.join(rootDir, 'artifacts/DATABASE_HEALTH_REPORT.json'),
  markdown: path.join(rootDir, 'DATABASE_PRODUCTION_REPORT.md'),
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
  { table: 'payment_attempts', column: 'transaction_id', foreignTable: 'global_transactions', foreignColumn: 'transaction_id' },
  { table: 'financial_ledger', column: 'wallet_id', foreignTable: 'actor_wallets', foreignColumn: 'id' },
  { table: 'financial_ledger', column: 'transaction_id', foreignTable: 'global_transactions', foreignColumn: 'transaction_id' },
  { table: 'financial_ledger', column: 'payment_attempt_id', foreignTable: 'payment_attempts', foreignColumn: 'id' },
];

function maskDatabaseUrl(value) {
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

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDir(filePath);
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function missing(expected, actual) {
  return expected.filter((item) => !actual.includes(item));
}

function roundLatency(value) {
  return Math.round(value * 100) / 100;
}

async function measureLatency(client, samples = 5) {
  const values = [];
  for (let i = 0; i < samples; i += 1) {
    const started = performance.now();
    await client.query('select 1');
    values.push(roundLatency(performance.now() - started));
  }
  return {
    samplesMs: values,
    averageMs: roundLatency(values.reduce((sum, value) => sum + value, 0) / values.length),
  };
}

async function validateSchema(client) {
  const tableResult = await client.query(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name = any($1::text[])
      order by table_name`,
    [expectedTables],
  );
  const actualTables = tableResult.rows.map((row) => row.table_name);

  const enumResult = await client.query(
    `select t.typname as enum_name, e.enumlabel as enum_value
       from pg_type t
       join pg_enum e on e.enumtypid = t.oid
       join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = any($1::text[])
      order by t.typname, e.enumsortorder`,
    [Object.keys(expectedEnums)],
  );
  const actualEnums = {};
  for (const row of enumResult.rows) {
    actualEnums[row.enum_name] ??= [];
    actualEnums[row.enum_name].push(row.enum_value);
  }
  const missingEnumValues = {};
  for (const [enumName, enumValues] of Object.entries(expectedEnums)) {
    const enumMissing = missing(enumValues, actualEnums[enumName] ?? []);
    if (enumMissing.length > 0) missingEnumValues[enumName] = enumMissing;
  }

  const indexResult = await client.query(
    `select indexname
       from pg_indexes
      where schemaname = 'public'
        and indexname = any($1::text[])
      order by indexname`,
    [expectedIndexes],
  );
  const actualIndexes = indexResult.rows.map((row) => row.indexname);

  const fkResult = await client.query(
    `select
        tc.table_name,
        kcu.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on tc.constraint_name = kcu.constraint_name
        and tc.table_schema = kcu.table_schema
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
        and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and tc.table_schema = 'public'
        and tc.table_name = any($1::text[])
      order by tc.table_name, kcu.column_name`,
    [expectedTables],
  );
  const actualForeignKeys = fkResult.rows.map((row) => ({
    table: row.table_name,
    column: row.column_name,
    foreignTable: row.foreign_table_name,
    foreignColumn: row.foreign_column_name,
  }));
  const missingForeignKeys = expectedForeignKeys.filter((expected) => !actualForeignKeys.some(
    (actual) => actual.table === expected.table
      && actual.column === expected.column
      && actual.foreignTable === expected.foreignTable
      && actual.foreignColumn === expected.foreignColumn,
  ));

  return {
    tables: {
      expected: expectedTables,
      actual: actualTables,
      missing: missing(expectedTables, actualTables),
    },
    enums: {
      expected: expectedEnums,
      actual: actualEnums,
      missing: missing(Object.keys(expectedEnums), Object.keys(actualEnums)),
      missingValues: missingEnumValues,
    },
    indexes: {
      expected: expectedIndexes,
      actual: actualIndexes,
      missing: missing(expectedIndexes, actualIndexes),
    },
    foreignKeys: {
      expected: expectedForeignKeys,
      actual: actualForeignKeys,
      missing: missingForeignKeys,
    },
  };
}

async function validateForeignKeyRejection(client, seed) {
  const invalidWalletId = randomUUID();
  const invalidTransactionId = `${seed}-missing-transaction`;
  const results = { invalidWalletRejected: false, invalidTransactionRejected: false };

  await client.query('begin');
  try {
    await client.query(
      `insert into financial_ledger (
        ledger_entry_id, actor_id, wallet_id, transaction_id, entry_type, source_type,
        source_id, amount, balance_after, idempotency_key, description, metadata
      ) values ($1,$2,$3,$4,'CREDIT','PAYMENT',$4,'1.00','1.00',$5,$6,$7::jsonb)`,
      [`${seed}-bad-wallet-ledger`, seed, invalidWalletId, seed, `${seed}-bad-wallet-idem`, 'FK rejection smoke: wallet', JSON.stringify({ source: 'database_production_ready' })],
    );
  } catch (error) {
    results.invalidWalletRejected = error && error.code === '23503';
  } finally {
    await client.query('rollback');
  }

  await client.query('begin');
  try {
    await client.query(
      `insert into financial_ledger (
        ledger_entry_id, actor_id, wallet_id, transaction_id, entry_type, source_type,
        source_id, amount, balance_after, idempotency_key, description, metadata
      ) values ($1,$2,$3,$4,'CREDIT','PAYMENT',$4,'1.00','1.00',$5,$6,$7::jsonb)`,
      [`${seed}-bad-transaction-ledger`, seed, null, invalidTransactionId, `${seed}-bad-tx-idem`, 'FK rejection smoke: transaction', JSON.stringify({ source: 'database_production_ready' })],
    );
  } catch (error) {
    results.invalidTransactionRejected = error && error.code === '23503';
  } finally {
    await client.query('rollback');
  }

  return {
    ...results,
    passed: results.invalidWalletRejected && results.invalidTransactionRejected,
  };
}

async function seedAndValidate(client) {
  const seed = `gxeon-prod-seed-${Date.now()}-${randomUUID()}`;
  const transactionId = `${seed}-tx`;
  const ledgerEntryId = `${seed}-ledger`;

  const walletInsert = await client.query(
    `insert into actor_wallets (actor_id, actor_code, metadata)
     values ($1, 'GXEON_PRODUCTION_READY', $2::jsonb)
     returning *`,
    [seed, JSON.stringify({ source: 'database_production_ready', seed: true })],
  );
  const wallet = walletInsert.rows[0];

  const walletUpdate = await client.query(
    `update actor_wallets
        set balance = '42.00', total_earned = '42.00', updated_at = now(), metadata = metadata || $2::jsonb
      where id = $1
      returning *`,
    [wallet.id, JSON.stringify({ updated: true })],
  );

  const transactionInsert = await client.query(
    `insert into global_transactions (
      transaction_id, actor_id, actor_code, base_amount, external_reference, description, metadata
    ) values ($1,$2,'GXEON_PRODUCTION_READY','42.00',$3,$4,$5::jsonb)
    returning *`,
    [transactionId, seed, `${seed}-external`, 'Database production ready seed transaction', JSON.stringify({ source: 'database_production_ready', seed: true })],
  );
  const transactionUpdate = await client.query(
    `update global_transactions
        set status = 'PAID', provider_payment_id = $2, paid_at = now(), updated_at = now(), metadata = metadata || $3::jsonb
      where transaction_id = $1
      returning *`,
    [transactionId, `${seed}-provider`, JSON.stringify({ updated: true })],
  );

  const ledgerInsert = await client.query(
    `insert into financial_ledger (
      ledger_entry_id, actor_id, wallet_id, transaction_id, entry_type, source_type,
      source_id, amount, balance_after, idempotency_key, description, metadata
    ) values ($1,$2,$3,$4,'CREDIT','PAYMENT',$4,'42.00','42.00',$5,$6,$7::jsonb)
    returning *`,
    [ledgerEntryId, seed, wallet.id, transactionId, `${seed}-ledger-idempotency`, 'Database production ready seed ledger', JSON.stringify({ source: 'database_production_ready', seed: true })],
  );
  const ledgerUpdate = await client.query(
    `update financial_ledger
        set description = $2, metadata = metadata || $3::jsonb
      where ledger_entry_id = $1
      returning *`,
    [ledgerEntryId, 'Database production ready seed ledger updated', JSON.stringify({ updated: true })],
  );

  const selectResult = await client.query(
    `select
       (select count(*)::int from actor_wallets where actor_id = $1 and balance = '42.00') as wallets,
       (select count(*)::int from global_transactions where transaction_id = $2 and status = 'PAID') as transactions,
       (select count(*)::int from financial_ledger where ledger_entry_id = $3 and description = 'Database production ready seed ledger updated') as ledger_entries`,
    [seed, transactionId, ledgerEntryId],
  );
  const selected = selectResult.rows[0];

  const fkValidation = await validateForeignKeyRejection(client, seed);

  return {
    seed,
    wallet: {
      id: wallet.id,
      inserted: Boolean(wallet.id),
      updated: walletUpdate.rows[0]?.balance === '42.00' && walletUpdate.rows[0]?.total_earned === '42.00',
      selected: Number(selected.wallets) === 1,
    },
    transaction: {
      id: transactionInsert.rows[0]?.transaction_id,
      inserted: transactionInsert.rows[0]?.transaction_id === transactionId,
      updated: transactionUpdate.rows[0]?.status === 'PAID',
      selected: Number(selected.transactions) === 1,
    },
    ledger: {
      id: ledgerInsert.rows[0]?.ledger_entry_id,
      inserted: ledgerInsert.rows[0]?.ledger_entry_id === ledgerEntryId,
      updated: ledgerUpdate.rows[0]?.description === 'Database production ready seed ledger updated',
      selected: Number(selected.ledger_entries) === 1,
    },
    foreignKeyValidation: fkValidation,
  };
}

async function validateRollback(client) {
  const seed = `gxeon-rollback-${Date.now()}-${randomUUID()}`;
  const transactionId = `${seed}-tx`;
  const ledgerEntryId = `${seed}-ledger`;
  let walletId = null;

  await client.query('begin');
  try {
    const walletResult = await client.query(
      `insert into actor_wallets (actor_id, actor_code, metadata)
       values ($1, 'GXEON_ROLLBACK_READY', $2::jsonb)
       returning id`,
      [seed, JSON.stringify({ source: 'database_production_ready', rollback: true })],
    );
    walletId = walletResult.rows[0].id;
    await client.query(
      `insert into global_transactions (transaction_id, actor_id, actor_code, base_amount, external_reference, description, metadata)
       values ($1,$2,'GXEON_ROLLBACK_READY','7.00',$3,$4,$5::jsonb)`,
      [transactionId, seed, `${seed}-external`, 'Rollback seed transaction', JSON.stringify({ source: 'database_production_ready', rollback: true })],
    );
    await client.query(
      `insert into financial_ledger (
        ledger_entry_id, actor_id, wallet_id, transaction_id, entry_type, source_type,
        source_id, amount, balance_after, idempotency_key, description, metadata
      ) values ($1,$2,$3,$4,'CREDIT','PAYMENT',$4,'7.00','7.00',$5,$6,$7::jsonb)`,
      [ledgerEntryId, seed, walletId, transactionId, `${seed}-ledger-idempotency`, 'Rollback ledger seed', JSON.stringify({ source: 'database_production_ready', rollback: true })],
    );
  } finally {
    await client.query('rollback');
  }

  const result = await client.query(
    `select
       (select count(*)::int from actor_wallets where actor_id = $1) as wallets,
       (select count(*)::int from global_transactions where transaction_id = $2) as transactions,
       (select count(*)::int from financial_ledger where ledger_entry_id = $3) as ledger_entries`,
    [seed, transactionId, ledgerEntryId],
  );
  const row = result.rows[0];
  const counts = {
    wallets: Number(row.wallets),
    transactions: Number(row.transactions),
    ledgerEntries: Number(row.ledger_entries),
  };

  return {
    seed,
    transactionId,
    ledgerEntryId,
    counts,
    passed: counts.wallets === 0 && counts.transactions === 0 && counts.ledgerEntries === 0,
  };
}

async function collectCounts(client) {
  const result = await client.query(
    `select
       (select count(*)::int from actor_wallets) as wallets,
       (select count(*)::int from global_transactions) as transactions,
       (select count(*)::int from financial_ledger) as ledger_entries`,
  );
  const row = result.rows[0];
  return {
    wallets: Number(row.wallets),
    transactions: Number(row.transactions),
    ledgerEntries: Number(row.ledger_entries),
  };
}

function createBlockedReports(errorMessage) {
  const health = {
    report: 'DATABASE_HEALTH_REPORT',
    generatedAt,
    status: 'blocked',
    databaseOnline: false,
    schemaLoaded: false,
    financialRuntimeHealthy: false,
    apiStatusExpected: 503,
    databaseUrlConfigured: Boolean(databaseUrl),
    databaseUrlMasked: maskDatabaseUrl(databaseUrl),
    error: errorMessage,
  };
  const smoke = {
    report: 'DATABASE_SMOKE_RESULT',
    generatedAt,
    status: 'blocked',
    checks: {
      database_connection: false,
      wallet_insert: false,
      wallet_update: false,
      wallet_select: false,
      transaction_insert: false,
      transaction_update: false,
      transaction_select: false,
      ledger_insert: false,
      ledger_update: false,
      ledger_select: false,
      rollback_test: false,
      foreign_keys: false,
      indexes: false,
    },
    error: errorMessage,
  };
  return { health, smoke };
}

function writeMarkdown({ health, smoke, schema, seed, rollback, latency }) {
  const lines = [
    '# DATABASE PRODUCTION REPORT — MISSION_003_6_DATABASE_PRODUCTION_READY',
    '',
    `- **Generated at:** ${generatedAt}`,
    '- **Branch:** `feature/database-production-ready`',
    `- **Status:** ${health.status}`,
    `- **Database online:** ${health.databaseOnline}`,
    `- **Schema loaded:** ${health.schemaLoaded}`,
    `- **Smoke test pass:** ${smoke.status === 'PASS'}`,
    `- **Financial runtime healthy:** ${health.financialRuntimeHealthy}`,
    `- **Expected API status:** ${health.apiStatusExpected}`,
    `- **DATABASE_URL configured:** ${health.databaseUrlConfigured}`,
    '',
    '## Validation summary',
    '',
    `- Database connection: ${Boolean(smoke.checks.database_connection)}`,
    `- Wallet insert/select/update: ${Boolean(smoke.checks.wallet_insert && smoke.checks.wallet_select && smoke.checks.wallet_update)}`,
    `- Transaction insert/select/update: ${Boolean(smoke.checks.transaction_insert && smoke.checks.transaction_select && smoke.checks.transaction_update)}`,
    `- Ledger insert/select/update: ${Boolean(smoke.checks.ledger_insert && smoke.checks.ledger_select && smoke.checks.ledger_update)}`,
    `- Rollback test: ${Boolean(smoke.checks.rollback_test)}`,
    `- Foreign keys: ${Boolean(smoke.checks.foreign_keys)}`,
    `- Indexes: ${Boolean(smoke.checks.indexes)}`,
    `- Drizzle push: ${health.drizzlePushStatus}`,
    '',
    '## Metrics',
    '',
    `- Average database latency: ${latency?.averageMs ?? 'n/a'} ms`,
    `- Latency samples: ${latency?.samplesMs?.join(', ') ?? 'n/a'}`,
    `- Wallets: ${health.counts?.wallets ?? 0}`,
    `- Transactions: ${health.counts?.transactions ?? 0}`,
    `- Ledger entries: ${health.counts?.ledgerEntries ?? 0}`,
    `- Health score: ${health.healthScore}`,
    '',
    '## Schema',
    '',
    `- Missing tables: ${schema ? (schema.tables.missing.join(', ') || 'none') : 'not validated'}`,
    `- Missing enums: ${schema ? (schema.enums.missing.join(', ') || 'none') : 'not validated'}`,
    `- Missing indexes: ${schema ? (schema.indexes.missing.join(', ') || 'none') : 'not validated'}`,
    `- Missing foreign keys: ${schema ? schema.foreignKeys.missing.length : 'not validated'}`,
    '',
    '## Seeds and rollback',
    '',
    `- Seed actor: ${seed?.seed ?? 'not executed'}`,
    `- Rollback seed: ${rollback?.seed ?? 'not executed'}`,
    `- Rollback persisted counts: ${rollback ? JSON.stringify(rollback.counts) : 'not executed'}`,
    '',
    '## Risks',
    '',
  ];

  if (health.status === 'blocked') {
    lines.push(`1. ${health.error}`);
    lines.push('2. PostgreSQL/Supabase validation requires a real `DATABASE_URL` secret in the execution environment.');
  } else {
    lines.push(...(health.risks.length ? health.risks.map((risk, index) => `${index + 1}. ${risk}`) : ['- No blocking risks detected.']));
  }

  lines.push('', '## Next steps', '', '1. Keep `DATABASE_URL` in the deployment secret store only.', '2. Run `pnpm run db:production:ready` before dashboard construction and production rollout.', '3. Confirm `/api/v1/financial/health` returns HTTP 200 with `status: "healthy"` after the API starts.');

  writeFileSync(artifactPaths.markdown, `${lines.join('\n')}\n`);
}

async function run() {
  if (!databaseUrl) {
    const error = 'DATABASE_URL is required for MISSION_003_6_DATABASE_PRODUCTION_READY.';
    const { health, smoke } = createBlockedReports(error);
    health.drizzlePushStatus = 'blocked_database_url_missing';
    health.healthScore = 0;
    health.counts = { wallets: 0, transactions: 0, ledgerEntries: 0 };
    health.risks = [error];
    writeJson(artifactPaths.health, health);
    writeJson(artifactPaths.smoke, smoke);
    writeMarkdown({ health, smoke });
    console.error(JSON.stringify(smoke, null, 2));
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  let connected = false;
  let schema = null;
  let seed = null;
  let rollback = null;
  let latency = null;
  let counts = { wallets: 0, transactions: 0, ledgerEntries: 0 };

  try {
    await client.connect();
    connected = true;
    latency = await measureLatency(client, 5);
    schema = await validateSchema(client);

    const schemaLoaded = schema.tables.missing.length === 0
      && schema.enums.missing.length === 0
      && Object.keys(schema.enums.missingValues).length === 0
      && schema.indexes.missing.length === 0
      && schema.foreignKeys.missing.length === 0;

    if (!schemaLoaded) {
      throw new Error('Financial schema is incomplete. Run `pnpm --filter @workspace/db run push` and re-run validation.');
    }

    seed = await seedAndValidate(client);
    rollback = await validateRollback(client);
    counts = await collectCounts(client);

    const checks = {
      database_connection: connected,
      schema_loaded: schemaLoaded,
      wallet_insert: seed.wallet.inserted,
      wallet_update: seed.wallet.updated,
      wallet_select: seed.wallet.selected,
      transaction_insert: seed.transaction.inserted,
      transaction_update: seed.transaction.updated,
      transaction_select: seed.transaction.selected,
      ledger_insert: seed.ledger.inserted,
      ledger_update: seed.ledger.updated,
      ledger_select: seed.ledger.selected,
      rollback_test: rollback.passed,
      foreign_keys: seed.foreignKeyValidation.passed && schema.foreignKeys.missing.length === 0,
      indexes: schema.indexes.missing.length === 0,
    };

    const healthScore = Math.max(0, 100
      - (latency.averageMs > 50 ? Math.min(30, Math.ceil((latency.averageMs - 50) / 10)) : 0)
      - (Object.values(checks).every(Boolean) ? 0 : 40));
    const financialRuntimeHealthy = healthScore >= 95 && counts.wallets > 0 && counts.transactions > 0 && counts.ledgerEntries > 0;
    const status = Object.values(checks).every(Boolean) && financialRuntimeHealthy ? 'PASS' : 'FAILED';

    const health = {
      report: 'DATABASE_HEALTH_REPORT',
      generatedAt,
      status: status === 'PASS' ? 'healthy' : 'degraded',
      databaseOnline: connected,
      schemaLoaded,
      smokeTestPass: status === 'PASS',
      financialRuntimeHealthy,
      apiStatusExpected: financialRuntimeHealthy ? 200 : 503,
      databaseUrlConfigured: true,
      databaseUrlMasked: maskDatabaseUrl(databaseUrl),
      drizzlePushStatus: 'schema_validated_after_push',
      latency,
      counts,
      healthScore,
      risks: status === 'PASS' ? [] : ['One or more production database validation checks failed.'],
    };

    const smoke = {
      report: 'DATABASE_SMOKE_RESULT',
      generatedAt,
      status,
      checks,
      seed,
      rollback,
      schema,
      latency,
      counts,
    };

    writeJson(artifactPaths.health, health);
    writeJson(artifactPaths.smoke, smoke);
    writeMarkdown({ health, smoke, schema, seed, rollback, latency });
    console.log(JSON.stringify(smoke, null, 2));
    process.exitCode = status === 'PASS' ? 0 : 1;
  } catch (error) {
    const checks = {
      database_connection: connected,
      wallet_insert: false,
      wallet_update: false,
      wallet_select: false,
      transaction_insert: false,
      transaction_update: false,
      transaction_select: false,
      ledger_insert: false,
      ledger_update: false,
      ledger_select: false,
      rollback_test: false,
      foreign_keys: false,
      indexes: false,
    };
    const health = {
      report: 'DATABASE_HEALTH_REPORT',
      generatedAt,
      status: 'degraded',
      databaseOnline: connected,
      schemaLoaded: false,
      smokeTestPass: false,
      financialRuntimeHealthy: false,
      apiStatusExpected: 503,
      databaseUrlConfigured: true,
      databaseUrlMasked: maskDatabaseUrl(databaseUrl),
      drizzlePushStatus: 'required_before_validation',
      latency,
      counts,
      healthScore: 0,
      risks: [error instanceof Error ? error.message : String(error)],
    };
    const smoke = {
      report: 'DATABASE_SMOKE_RESULT',
      generatedAt,
      status: 'FAILED',
      checks,
      schema,
      seed,
      rollback,
      error: error instanceof Error ? error.message : String(error),
    };
    writeJson(artifactPaths.health, health);
    writeJson(artifactPaths.smoke, smoke);
    writeMarkdown({ health, smoke, schema, seed, rollback, latency });
    console.error(JSON.stringify(smoke, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

run();
