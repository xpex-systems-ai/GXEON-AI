#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const pg = require("../lib/db/node_modules/pg");
const {
  getSupabaseRuntimeStatus,
} = require("../server/runtime/supabaseRuntime.cjs");
const {
  getMercadoPagoRuntimeConfig,
} = require("../server/runtime/mercadoPagoAdapter.cjs");
const {
  getPaymentsRuntimeAsync,
  createPixPayment,
} = require("../server/runtime/paymentRuntime.cjs");
const {
  processWebhook,
} = require("../server/runtime/mercadoWebhookRuntime.cjs");
const { getRecoveryStatus } = require("../server/runtime/runtimeRecovery.cjs");
const {
  getDeploymentIntegrityStatus,
} = require("../server/runtime/deploymentIntegrity.cjs");
const {
  getProductionRuntimeStatus,
} = require("../server/runtime/productionRuntime.cjs");
const {
  getRevenueDashboardMetrics,
} = require("../server/runtime/revenueDashboardRuntime.cjs");

const { Pool } = pg;
const GENERATED_AT = new Date().toISOString();
const ARTIFACT_DIR = path.resolve(__dirname, "../artifacts");
const LOCAL_MIGRATION = path.resolve(
  __dirname,
  "../lib/db/drizzle/0000_financial_foundation.sql",
);
const DRIZZLE_JOURNAL = path.resolve(
  __dirname,
  "../lib/db/drizzle/meta/_journal.json",
);

const EXPECTED_TABLES = [
  "actor_wallets",
  "financial_ledger",
  "global_transactions",
  "payment_attempts",
  "payment_webhook_events",
];

const EXPECTED_LEDGER_TABLES = ["actor_wallets", "financial_ledger"];
const EXPECTED_PAYMENT_TABLES = [
  "global_transactions",
  "payment_attempts",
  "payment_webhook_events",
];

const EXPECTED_INDEXES = [
  "actor_wallets_actor_id_uq",
  "actor_wallets_actor_code_idx",
  "actor_wallets_status_idx",
  "financial_ledger_ledger_entry_id_uq",
  "financial_ledger_idempotency_key_uq",
  "financial_ledger_actor_id_idx",
  "financial_ledger_wallet_id_idx",
  "financial_ledger_transaction_id_idx",
  "financial_ledger_source_idx",
  "financial_ledger_created_at_idx",
  "global_transactions_transaction_id_uq",
  "global_transactions_external_reference_uq",
  "global_transactions_provider_payment_id_idx",
  "global_transactions_actor_id_idx",
  "global_transactions_status_idx",
  "global_transactions_created_at_idx",
  "payment_attempts_idempotency_key_uq",
  "payment_attempts_transaction_id_idx",
  "payment_attempts_provider_payment_id_idx",
  "payment_attempts_status_idx",
  "payment_attempts_created_at_idx",
  "payment_webhook_events_idempotency_key_uq",
  "payment_webhook_events_provider_event_uq",
  "payment_webhook_events_provider_payment_id_idx",
  "payment_webhook_events_processing_status_idx",
  "payment_webhook_events_received_at_idx",
];

const EXPECTED_SUPABASE_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

const REQUIRED_MERCADO_PAGO_KEYS = [
  "DATABASE_URL",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "MERCADO_PAGO_NOTIFICATION_URL",
  "FINANCIAL_AUTH_TOKEN",
];

const REQUIRED_FINANCIAL_SCOPES = [
  "financial:payments:create",
  "financial:payments:auto",
  "financial:credits:wallet",
  "financial:credits:transfer",
  "financial:credits:auto-topup",
  "financial:commissions:settle",
  "financial:revenue:tasks",
  "financial:revenue:scheduler",
  "financial:revenue:radar",
  "financial:payments:followups",
  "financial:x-radar:signals",
  "financial:x-radar:consume",
  "financial:x-radar:scan",
  "financial:x-radar:revenue",
  "financial:monetization:subscriptions",
  "financial:revenue-engine:checkout",
  "financial:revenue-engine:recovery",
  "financial:revenue-engine:subscriptions",
  "financial:revenue-engine:credits",
  "financial:revenue-engine:radar",
  "financial:revenue-engine:entitlements",
];

const FINANCIAL_AUTH_SOURCE = path.resolve(
  __dirname,
  "../artifacts/api-server/src/middlewares/financialAuth.ts",
);
const RUNTIME_ROUTE_SOURCE = path.resolve(
  __dirname,
  "../artifacts/api-server/src/routes/runtime.ts",
);

const RAILWAY_KEYS = [
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
  "RAILWAY_PUBLIC_DOMAIN",
  "RAILWAY_DEPLOYMENT_ID",
  "PORT",
  "NODE_ENV",
];

const REQUIRED_PRODUCTION_ENVS = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_NOTIFICATION_URL",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "FINANCIAL_AUTH_TOKEN",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
];

const MINIMUM_GO_LIVE_SCORE = 95;

function mask(value = "") {
  const text = String(value || "");
  if (!text) return { configured: false, masked: null, length: 0 };
  if (text.length <= 12)
    return {
      configured: true,
      masked: `${text.slice(0, 2)}…${text.slice(-2)}`,
      length: text.length,
    };
  return {
    configured: true,
    masked: `${text.slice(0, 8)}…${text.slice(-6)}`,
    length: text.length,
  };
}

function envPresence(keys) {
  return Object.fromEntries(
    keys.map((key) => [key, Boolean(process.env[key])]),
  );
}

function boolsReady(object) {
  return Object.values(object).every(Boolean);
}

function missingEnvironmentVariables() {
  return REQUIRED_PRODUCTION_ENVS.filter((key) => !process.env[key]);
}

function collectFailedValidations(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  const failures = [];
  if (
    Object.prototype.hasOwnProperty.call(value, "ready") &&
    value.ready === false
  ) {
    failures.push(prefix || "root");
  }
  if (Object.prototype.hasOwnProperty.call(value, "ok") && value.ok === false) {
    failures.push(prefix || "root");
  }
  for (const [key, nested] of Object.entries(value)) {
    if (
      key === "blockers" ||
      key === "missing" ||
      key === "expected" ||
      key === "present"
    )
      continue;
    if (nested && typeof nested === "object") {
      failures.push(
        ...collectFailedValidations(nested, prefix ? `${prefix}.${key}` : key),
      );
    }
  }
  return [...new Set(failures)];
}

function writeJson(name, data) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, name),
    `${JSON.stringify(data, null, 2)}\n`,
  );
}

function detectDatabaseProvider(databaseUrl = process.env.DATABASE_URL || "") {
  if (!databaseUrl)
    return { provider: "NOT_CONFIGURED", host: null, database: null };
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const provider = host.includes("supabase")
    ? "SUPABASE_POSTGRES"
    : host.includes("neon")
      ? "NEON_POSTGRES"
      : host.includes("railway")
        ? "RAILWAY_POSTGRES"
        : host.includes("render")
          ? "RENDER_POSTGRES"
          : host.includes("rds.amazonaws")
            ? "AWS_RDS_POSTGRES"
            : "POSTGRES";
  return {
    provider,
    host,
    database: parsed.pathname.replace(/^\//, "") || null,
  };
}

async function queryRows(pool, text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function validateDatabase() {
  const databaseUrl = process.env.DATABASE_URL || "";
  const provider = detectDatabaseProvider(databaseUrl);
  const localMigrationPresent = fs.existsSync(LOCAL_MIGRATION);
  const journal = fs.existsSync(DRIZZLE_JOURNAL)
    ? JSON.parse(fs.readFileSync(DRIZZLE_JOURNAL, "utf8"))
    : null;
  const localMigrationRegistered = Boolean(
    journal?.entries?.some(
      (entry) => entry.tag === "0000_financial_foundation",
    ),
  );

  const report = {
    report: "DATABASE_PRODUCTION_REPORT",
    generated_at: GENERATED_AT,
    ready: false,
    provider,
    database_url: mask(databaseUrl),
    connection: {
      ok: false,
      status: databaseUrl ? "NOT_TESTED" : "BLOCKED_DATABASE_URL_MISSING",
    },
    migrations: {
      local_migration_present: localMigrationPresent,
      local_journal_registered: localMigrationRegistered,
      remote_valid: false,
      status: databaseUrl ? "NOT_TESTED" : "BLOCKED_DATABASE_URL_MISSING",
    },
    ledger_tables: {
      ready: false,
      expected: EXPECTED_LEDGER_TABLES,
      present: [],
      missing: EXPECTED_LEDGER_TABLES,
    },
    payment_tables: {
      ready: false,
      expected: EXPECTED_PAYMENT_TABLES,
      present: [],
      missing: EXPECTED_PAYMENT_TABLES,
    },
    indexes: {
      ready: false,
      expected: EXPECTED_INDEXES,
      present: [],
      missing: EXPECTED_INDEXES,
    },
    transaction_persistence: {
      ready: false,
      status: databaseUrl ? "NOT_TESTED" : "BLOCKED_DATABASE_URL_MISSING",
    },
    blockers: [],
  };

  if (!databaseUrl) {
    report.blockers.push("DATABASE_URL is not configured.");
    report.blockers.push(
      "Cannot validate connection, remote migrations, financial tables, indexes, or transaction persistence.",
    );
    return report;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    const nowRows = await queryRows(
      pool,
      "select now() as now, current_database() as database, current_schema() as schema",
    );
    report.connection = { ok: true, status: "CONNECTED", details: nowRows[0] };

    const tableRows = await queryRows(
      pool,
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
      [EXPECTED_TABLES],
    );
    const presentTables = tableRows.map((row) => row.table_name).sort();
    const missingTables = EXPECTED_TABLES.filter(
      (table) => !presentTables.includes(table),
    );

    report.ledger_tables = {
      ready: EXPECTED_LEDGER_TABLES.every((table) =>
        presentTables.includes(table),
      ),
      expected: EXPECTED_LEDGER_TABLES,
      present: presentTables.filter((table) =>
        EXPECTED_LEDGER_TABLES.includes(table),
      ),
      missing: EXPECTED_LEDGER_TABLES.filter(
        (table) => !presentTables.includes(table),
      ),
    };
    report.payment_tables = {
      ready: EXPECTED_PAYMENT_TABLES.every((table) =>
        presentTables.includes(table),
      ),
      expected: EXPECTED_PAYMENT_TABLES,
      present: presentTables.filter((table) =>
        EXPECTED_PAYMENT_TABLES.includes(table),
      ),
      missing: EXPECTED_PAYMENT_TABLES.filter(
        (table) => !presentTables.includes(table),
      ),
    };

    const indexRows = await queryRows(
      pool,
      `select indexname from pg_indexes where schemaname = 'public' and indexname = any($1::text[])`,
      [EXPECTED_INDEXES],
    );
    const presentIndexes = indexRows.map((row) => row.indexname).sort();
    const missingIndexes = EXPECTED_INDEXES.filter(
      (index) => !presentIndexes.includes(index),
    );
    report.indexes = {
      ready: missingIndexes.length === 0,
      expected: EXPECTED_INDEXES,
      present: presentIndexes,
      missing: missingIndexes,
    };

    report.migrations.remote_valid =
      missingTables.length === 0 && missingIndexes.length === 0;
    report.migrations.status = report.migrations.remote_valid
      ? "REMOTE_SCHEMA_MATCHES_P0_FINANCIAL_MIGRATION"
      : "REMOTE_SCHEMA_INCOMPLETE";

    if (missingTables.length === 0) {
      const client = await pool.connect();
      const txId = `prod_activation_${Date.now()}_${randomUUID().slice(0, 8)}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `insert into actor_wallets (actor_id, actor_code, metadata)
           values ($1, $2, $3::jsonb)
           on conflict (actor_id) do update set metadata = actor_wallets.metadata || excluded.metadata`,
          [
            `actor_${txId}`,
            "PROD_ACTIVATION",
            JSON.stringify({
              audit: "GXEON_MISSION_005",
              generated_at: GENERATED_AT,
            }),
          ],
        );
        await client.query(
          `insert into global_transactions (transaction_id, actor_id, base_amount, external_reference, description, metadata)
           values ($1, $2, '1.00', $3, $4, $5::jsonb)`,
          [
            txId,
            `actor_${txId}`,
            txId,
            "Production activation rollback probe",
            JSON.stringify({ audit: "GXEON_MISSION_005" }),
          ],
        );
        await client.query(
          `insert into payment_attempts (transaction_id, amount, idempotency_key, request_payload, raw_provider_response)
           values ($1, '1.00', $2, $3::jsonb, $4::jsonb)`,
          [
            txId,
            `idem_${txId}`,
            JSON.stringify({ audit: true }),
            JSON.stringify({ audit: true }),
          ],
        );
        const probeRows = await client.query(
          "select transaction_id from global_transactions where transaction_id = $1",
          [txId],
        );
        report.transaction_persistence = {
          ready: probeRows.rowCount === 1,
          status: "ROLLBACK_PROBE_SUCCEEDED",
          persisted_after_probe: false,
        };
        await client.query("ROLLBACK");
      } catch (error) {
        await client.query("ROLLBACK");
        report.transaction_persistence = {
          ready: false,
          status: "ROLLBACK_PROBE_FAILED",
          error: String(error.message || error),
        };
      } finally {
        client.release();
      }
    } else {
      report.transaction_persistence = {
        ready: false,
        status: "SKIPPED_REMOTE_SCHEMA_INCOMPLETE",
      };
    }
  } catch (error) {
    report.connection = {
      ok: false,
      status: "CONNECTION_FAILED",
      error: String(error.message || error),
    };
  } finally {
    await pool.end();
  }

  if (!report.connection.ok)
    report.blockers.push("Database connection failed.");
  if (!report.migrations.remote_valid)
    report.blockers.push(
      "Remote database schema does not validate against the P0 financial migration.",
    );
  if (!report.ledger_tables.ready)
    report.blockers.push(
      `Ledger tables missing: ${report.ledger_tables.missing.join(", ") || "none"}.`,
    );
  if (!report.payment_tables.ready)
    report.blockers.push(
      `Payment tables missing: ${report.payment_tables.missing.join(", ") || "none"}.`,
    );
  if (!report.indexes.ready)
    report.blockers.push(
      `Financial indexes missing: ${report.indexes.missing.join(", ") || "none"}.`,
    );
  if (!report.transaction_persistence.ready)
    report.blockers.push(
      "Transaction persistence rollback probe did not pass.",
    );

  report.ready =
    report.connection.ok &&
    report.migrations.remote_valid &&
    report.ledger_tables.ready &&
    report.payment_tables.ready &&
    report.indexes.ready &&
    report.transaction_persistence.ready;
  return report;
}

async function fetchJsonProbe(url, options = {}) {
  const timeoutMs = Number(
    process.env.PRODUCTION_ACTIVATION_HTTP_TIMEOUT_MS || 10_000,
  );
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: typeof body === "string" ? body.slice(0, 500) : body,
  };
}

async function validateSupabase(databaseReport) {
  const status = getSupabaseRuntimeStatus();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/+$/, "");
  const report = {
    report: "SUPABASE_PRODUCTION_REPORT",
    generated_at: GENERATED_AT,
    ready: false,
    env: status.checks,
    credentials: {
      SUPABASE_URL: mask(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: mask(serviceRole),
      VITE_SUPABASE_URL: mask(process.env.VITE_SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY: mask(process.env.VITE_SUPABASE_ANON_KEY),
      EXPO_PUBLIC_SUPABASE_URL: mask(process.env.EXPO_PUBLIC_SUPABASE_URL),
      EXPO_PUBLIC_SUPABASE_ANON_KEY: mask(
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      ),
    },
    frontend_integration: Boolean(
      process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY,
    ),
    mobile_integration: Boolean(
      process.env.EXPO_PUBLIC_SUPABASE_URL &&
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ),
    auth: {
      ready: false,
      status:
        supabaseUrl && anonKey
          ? "NOT_TESTED"
          : "BLOCKED_SUPABASE_URL_OR_ANON_KEY_MISSING",
    },
    realtime: {
      ready: false,
      status:
        supabaseUrl && anonKey
          ? "NOT_TESTED"
          : "BLOCKED_SUPABASE_URL_OR_ANON_KEY_MISSING",
    },
    rls_policies: {
      ready: false,
      status: databaseReport.connection.ok
        ? "NOT_TESTED"
        : "BLOCKED_DATABASE_CONNECTION_MISSING",
    },
    storage: {
      ready: false,
      status:
        supabaseUrl && serviceRole
          ? "NOT_TESTED"
          : "BLOCKED_SUPABASE_URL_OR_SERVICE_ROLE_MISSING",
    },
    blockers: [],
  };

  if (supabaseUrl && anonKey) {
    try {
      const authProbe = await fetchJsonProbe(
        `${supabaseUrl}/auth/v1/settings`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      );
      report.auth = {
        ready: authProbe.status < 500,
        status: authProbe.ok
          ? "AUTH_SETTINGS_REACHABLE"
          : "AUTH_ENDPOINT_REACHABLE_NON_2XX",
        http_status: authProbe.status,
      };
    } catch (error) {
      report.auth = {
        ready: false,
        status: "AUTH_PROBE_FAILED",
        error: String(error.message || error),
      };
    }

    try {
      const realtimeProbe = await fetchJsonProbe(`${supabaseUrl}/realtime/v1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      report.realtime = {
        ready: realtimeProbe.status < 500,
        status: realtimeProbe.ok
          ? "REALTIME_REACHABLE"
          : "REALTIME_ENDPOINT_REACHABLE_NON_2XX",
        http_status: realtimeProbe.status,
      };
    } catch (error) {
      report.realtime = {
        ready: false,
        status: "REALTIME_PROBE_FAILED",
        error: String(error.message || error),
      };
    }
  }

  if (supabaseUrl && serviceRole) {
    try {
      const storageProbe = await fetchJsonProbe(
        `${supabaseUrl}/storage/v1/bucket`,
        {
          headers: {
            apikey: serviceRole,
            Authorization: `Bearer ${serviceRole}`,
          },
        },
      );
      report.storage = {
        ready: storageProbe.status < 500,
        status: storageProbe.ok
          ? "STORAGE_REACHABLE"
          : "STORAGE_ENDPOINT_REACHABLE_NON_2XX",
        http_status: storageProbe.status,
      };
    } catch (error) {
      report.storage = {
        ready: false,
        status: "STORAGE_PROBE_FAILED",
        error: String(error.message || error),
      };
    }
  }

  if (databaseReport.connection.ok) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 10_000,
    });
    try {
      const rows = await queryRows(
        pool,
        `select schemaname, tablename, policyname, permissive, roles, cmd
         from pg_policies
         where schemaname = 'public' and tablename = any($1::text[])
         order by tablename, policyname`,
        [EXPECTED_TABLES],
      );
      report.rls_policies = {
        ready: rows.length > 0,
        status:
          rows.length > 0
            ? "RLS_POLICIES_PRESENT"
            : "NO_RLS_POLICIES_FOUND_FOR_FINANCIAL_TABLES",
        count: rows.length,
        tables_with_policies: [...new Set(rows.map((row) => row.tablename))],
      };
    } catch (error) {
      report.rls_policies = {
        ready: false,
        status: "RLS_POLICY_QUERY_FAILED",
        error: String(error.message || error),
      };
    } finally {
      await pool.end();
    }
  }

  if (!boolsReady(status.checks))
    report.blockers.push(
      `Missing Supabase env vars: ${Object.entries(status.checks)
        .filter(([, ok]) => !ok)
        .map(([key]) => key)
        .join(", ")}.`,
    );
  if (!report.frontend_integration)
    report.blockers.push("Web frontend Supabase env pair is incomplete.");
  if (!report.mobile_integration)
    report.blockers.push("Mobile Supabase env pair is incomplete.");
  if (!report.auth.ready)
    report.blockers.push("Supabase auth validation did not pass.");
  if (!report.realtime.ready)
    report.blockers.push("Supabase realtime validation did not pass.");
  if (!report.rls_policies.ready)
    report.blockers.push(
      "Supabase/Postgres RLS policy validation did not pass.",
    );
  if (!report.storage.ready)
    report.blockers.push("Supabase storage validation did not pass.");

  report.ready =
    boolsReady(status.checks) &&
    report.frontend_integration &&
    report.mobile_integration &&
    report.auth.ready &&
    report.realtime.ready &&
    report.rls_policies.ready &&
    report.storage.ready;
  return report;
}

async function validateMercadoPago(databaseReport) {
  const config = getMercadoPagoRuntimeConfig();
  const env = envPresence(REQUIRED_MERCADO_PAGO_KEYS);
  const webhookSecretConfigured = Boolean(
    process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  );
  const report = {
    report: "MERCADOPAGO_PRODUCTION_REPORT",
    generated_at: GENERATED_AT,
    ready: false,
    env,
    config,
    access_token_validation: {
      ready: false,
      status: process.env.MERCADO_PAGO_ACCESS_TOKEN
        ? "NOT_TESTED"
        : "BLOCKED_ACCESS_TOKEN_MISSING",
    },
    webhook: {
      ready: false,
      url_configured: Boolean(process.env.MERCADO_PAGO_NOTIFICATION_URL),
      secret_configured: webhookSecretConfigured,
      signature_probe: "NOT_TESTED",
    },
    pix_runtime: {
      ready: false,
      status: config.ready_for_real_pix ? "CONFIG_READY" : "CONFIG_NOT_READY",
    },
    payment_creation: {
      ready: false,
      status: "SKIPPED_REQUIRES_GXEON_ALLOW_REAL_PIX_VALIDATION_TRUE",
    },
    payment_status: {
      ready: false,
      status: process.env.MERCADO_PAGO_VALIDATION_PAYMENT_ID
        ? "NOT_TESTED"
        : "SKIPPED_MERCADO_PAGO_VALIDATION_PAYMENT_ID_MISSING",
    },
    settlement_flow: {
      ready: false,
      status: databaseReport.transaction_persistence.ready
        ? "DB_READY_PROVIDER_EVENT_REQUIRED"
        : "BLOCKED_DATABASE_NOT_READY",
    },
    recovery_flow: { ready: false, status: "NOT_TESTED" },
    blockers: [],
  };

  if (process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    try {
      const userProbe = await fetchJsonProbe(`${config.api_base}/users/me`, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      });
      report.access_token_validation = {
        ready: userProbe.ok,
        status: userProbe.ok
          ? "ACCESS_TOKEN_ACCEPTED"
          : "ACCESS_TOKEN_REJECTED",
        http_status: userProbe.status,
      };
    } catch (error) {
      report.access_token_validation = {
        ready: false,
        status: "ACCESS_TOKEN_PROBE_FAILED",
        error: String(error.message || error),
      };
    }
  }

  const unsigned = await processWebhook(
    {
      id: "activation_unsigned_probe",
      type: "payment",
      data: { id: "activation_unsigned_probe" },
    },
    {
      signature: "",
      rawBody: "{}",
      requestId: "activation_probe",
      dataId: "activation_unsigned_probe",
    },
  );
  report.webhook.signature_probe = unsigned.accepted
    ? "UNSIGNED_WEBHOOK_ACCEPTED_UNSAFE"
    : webhookSecretConfigured
      ? "UNSIGNED_WEBHOOK_REJECTED_SECRET_CONFIGURED"
      : "UNSIGNED_WEBHOOK_REJECTED_SECRET_MISSING";
  report.webhook.ready =
    report.webhook.url_configured &&
    report.webhook.secret_configured &&
    !report.webhook.signature_probe.includes("UNSAFE");

  try {
    const paymentsRuntime = await getPaymentsRuntimeAsync();
    report.pix_runtime = {
      ready:
        paymentsRuntime.payment_runtime === "ACTIVE" &&
        config.ready_for_real_pix,
      status: paymentsRuntime.payment_runtime,
      storage: paymentsRuntime.storage,
      duplicate_detector: paymentsRuntime.duplicate_detector,
    };
  } catch (error) {
    report.pix_runtime = {
      ready: false,
      status: "PAYMENT_RUNTIME_FAILED",
      error: String(error.message || error),
    };
  }

  if (
    process.env.MERCADO_PAGO_VALIDATION_PAYMENT_ID &&
    process.env.MERCADO_PAGO_ACCESS_TOKEN
  ) {
    try {
      const statusProbe = await fetchJsonProbe(
        `${config.api_base}/v1/payments/${encodeURIComponent(process.env.MERCADO_PAGO_VALIDATION_PAYMENT_ID)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        },
      );
      report.payment_status = {
        ready: statusProbe.ok,
        status: statusProbe.ok
          ? "PAYMENT_STATUS_RETRIEVED"
          : "PAYMENT_STATUS_REJECTED",
        http_status: statusProbe.status,
      };
    } catch (error) {
      report.payment_status = {
        ready: false,
        status: "PAYMENT_STATUS_PROBE_FAILED",
        error: String(error.message || error),
      };
    }
  }

  if (
    process.env.GXEON_ALLOW_REAL_PIX_VALIDATION === "true" &&
    process.env.GXEON_OPERATOR_CONFIRMED_REAL_PIX === "true"
  ) {
    try {
      const payment = await createPixPayment({
        amount: Number(process.env.GXEON_REAL_PIX_VALIDATION_AMOUNT || 1),
        description: "GXEON production activation validation PIX",
        payer_email: process.env.MERCADO_PAGO_DEFAULT_PAYER_EMAIL,
        metadata: {
          audit: "GXEON_MISSION_006_FINAL_PRODUCTION_UNLOCK",
          generated_at: GENERATED_AT,
        },
      });
      report.payment_creation = {
        ready: Boolean(payment.qrCode || payment.copyPastePix),
        status: "REAL_PIX_CREATED_OPERATOR_FLAG_ENABLED",
        payment_id: payment.payment_id,
        provider_payment_id: payment.provider_payment_id,
        has_qr_code: Boolean(payment.qrCode),
        has_copy_paste: Boolean(payment.copyPastePix),
      };
    } catch (error) {
      report.payment_creation = {
        ready: false,
        status: "REAL_PIX_CREATION_FAILED",
        error: String(error.message || error),
      };
    }
  } else if (process.env.GXEON_ALLOW_REAL_PIX_VALIDATION === "true") {
    report.payment_creation = {
      ready: false,
      status: "BLOCKED_OPERATOR_CONFIRMATION_REQUIRED",
      required_confirmation_env: "GXEON_OPERATOR_CONFIRMED_REAL_PIX=true",
    };
  }

  report.recovery_flow = {
    ready: report.pix_runtime.ready && report.webhook.ready,
    status:
      report.pix_runtime.ready && report.webhook.ready
        ? "READY_FOR_PENDING_PIX_FOLLOWUP_RUNTIME"
        : "BLOCKED_PIX_RUNTIME_OR_WEBHOOK_NOT_READY",
  };
  report.settlement_flow.ready =
    databaseReport.transaction_persistence.ready &&
    report.webhook.ready &&
    report.access_token_validation.ready;
  report.settlement_flow.status = report.settlement_flow.ready
    ? "READY_FOR_APPROVED_WEBHOOK_SETTLEMENT"
    : report.settlement_flow.status;

  const missing = Object.entries(env)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  if (missing.length)
    report.blockers.push(
      `Missing Mercado Pago / financial env vars: ${missing.join(", ")}.`,
    );
  if (!report.access_token_validation.ready)
    report.blockers.push("Mercado Pago access token validation did not pass.");
  if (!report.webhook.ready)
    report.blockers.push(
      "Mercado Pago webhook URL/secret/signature validation did not pass.",
    );
  if (!report.pix_runtime.ready)
    report.blockers.push("PIX runtime is not production-ready.");
  if (!report.payment_creation.ready)
    report.blockers.push("Real PIX payment creation was not validated.");
  if (!report.settlement_flow.ready)
    report.blockers.push("Settlement flow is not ready.");
  if (!report.recovery_flow.ready)
    report.blockers.push("PIX recovery flow is not ready.");

  report.ready =
    report.access_token_validation.ready &&
    report.webhook.ready &&
    report.pix_runtime.ready &&
    report.payment_creation.ready &&
    report.settlement_flow.ready &&
    report.recovery_flow.ready;
  return report;
}

async function validateFinancialSecurity() {
  const middlewareSource = fs.existsSync(FINANCIAL_AUTH_SOURCE)
    ? fs.readFileSync(FINANCIAL_AUTH_SOURCE, "utf8")
    : "";
  const routeSource = fs.existsSync(RUNTIME_ROUTE_SOURCE)
    ? fs.readFileSync(RUNTIME_ROUTE_SOURCE, "utf8")
    : "";

  const protectedScopes = [
    ...routeSource.matchAll(/financialMutation\("([^"\n]+)"\)/g),
  ].map((match) => match[1]);
  const missingScopes = REQUIRED_FINANCIAL_SCOPES.filter(
    (scope) => !protectedScopes.includes(scope),
  );
  const duplicateScopes = protectedScopes.filter(
    (scope, index) => protectedScopes.indexOf(scope) !== index,
  );

  const middlewareChecks = {
    source_present: Boolean(middlewareSource),
    exports_financial_auth: middlewareSource.includes(
      "export function financialAuth",
    ),
    exports_rate_limit: middlewareSource.includes(
      "export function financialRateLimit",
    ),
    exports_idempotency: middlewareSource.includes(
      "export function financialIdempotency",
    ),
    exports_financial_mutation: middlewareSource.includes(
      "export function financialMutation",
    ),
    token_fail_closed:
      middlewareSource.includes("FINANCIAL_AUTH_TOKEN not set") &&
      middlewareSource.includes("status(503)"),
    scope_validation:
      middlewareSource.includes("function hasScope") &&
      middlewareSource.includes("Insufficient financial scope"),
    rate_limit_headers:
      middlewareSource.includes("X-RateLimit-Limit") &&
      middlewareSource.includes("status(429)"),
    idempotency_required:
      middlewareSource.includes("Idempotency-Key header is required") &&
      middlewareSource.includes("status(428)"),
    idempotency_replay:
      middlewareSource.includes("Idempotency-Replayed") &&
      middlewareSource.includes("Idempotency-Key payload mismatch"),
  };

  const env = {
    FINANCIAL_AUTH_TOKEN: Boolean(process.env.FINANCIAL_AUTH_TOKEN),
    FINANCIAL_AUTH_SCOPES: Boolean(
      process.env.FINANCIAL_AUTH_SCOPES || process.env.FINANCIAL_API_SCOPES,
    ),
    FINANCIAL_RATE_LIMIT_WINDOW_MS: Boolean(
      process.env.FINANCIAL_RATE_LIMIT_WINDOW_MS,
    ),
    FINANCIAL_RATE_LIMIT_MAX_REQUESTS: Boolean(
      process.env.FINANCIAL_RATE_LIMIT_MAX_REQUESTS,
    ),
  };

  const scopeReady =
    middlewareChecks.scope_validation && missingScopes.length === 0;
  const rateLimitReady =
    middlewareChecks.exports_rate_limit && middlewareChecks.rate_limit_headers;
  const idempotencyReady =
    middlewareChecks.exports_idempotency &&
    middlewareChecks.idempotency_required &&
    middlewareChecks.idempotency_replay;
  const mutationProtectionReady =
    routeSource.includes("import { financialMutation }") &&
    protectedScopes.length >= REQUIRED_FINANCIAL_SCOPES.length &&
    missingScopes.length === 0;

  const report = {
    report: "FINANCIAL_SECURITY_REPORT",
    generated_at: GENERATED_AT,
    ready: false,
    env,
    token: {
      ready: env.FINANCIAL_AUTH_TOKEN,
      status: env.FINANCIAL_AUTH_TOKEN
        ? "FINANCIAL_AUTH_TOKEN_CONFIGURED"
        : "BLOCKED_FINANCIAL_AUTH_TOKEN_MISSING",
    },
    middleware: {
      ready: Object.values(middlewareChecks).every(Boolean),
      checks: middlewareChecks,
    },
    scopes: {
      ready: scopeReady,
      required: REQUIRED_FINANCIAL_SCOPES,
      protected: protectedScopes,
      missing: missingScopes,
      duplicates: [...new Set(duplicateScopes)],
    },
    rate_limit: {
      ready: rateLimitReady,
      status: rateLimitReady
        ? "RATE_LIMIT_MIDDLEWARE_PRESENT"
        : "RATE_LIMIT_MIDDLEWARE_INCOMPLETE",
      configured_window_ms:
        process.env.FINANCIAL_RATE_LIMIT_WINDOW_MS || "DEFAULT_60000",
      configured_max_requests:
        process.env.FINANCIAL_RATE_LIMIT_MAX_REQUESTS || "DEFAULT_30",
    },
    idempotency: {
      ready: idempotencyReady,
      status: idempotencyReady
        ? "IDEMPOTENCY_MIDDLEWARE_PRESENT"
        : "IDEMPOTENCY_MIDDLEWARE_INCOMPLETE",
      required_header: "Idempotency-Key",
    },
    mutation_protection: {
      ready: mutationProtectionReady,
      protected_route_count: protectedScopes.length,
      expected_route_count: REQUIRED_FINANCIAL_SCOPES.length,
    },
    blockers: [],
  };

  if (!report.token.ready)
    report.blockers.push("FINANCIAL_AUTH_TOKEN is not configured.");
  if (!report.middleware.ready)
    report.blockers.push(
      "FinancialAuthMiddleware static validation did not pass.",
    );
  if (!report.scopes.ready)
    report.blockers.push(
      `Financial scope coverage missing: ${missingScopes.join(", ") || "none"}.`,
    );
  if (!report.rate_limit.ready)
    report.blockers.push(
      "Financial mutation rate limit validation did not pass.",
    );
  if (!report.idempotency.ready)
    report.blockers.push(
      "Financial mutation idempotency validation did not pass.",
    );
  if (!report.mutation_protection.ready)
    report.blockers.push(
      "Financial mutation route protection coverage did not pass.",
    );

  report.ready =
    report.token.ready &&
    report.middleware.ready &&
    report.scopes.ready &&
    report.rate_limit.ready &&
    report.idempotency.ready &&
    report.mutation_protection.ready;

  return report;
}

async function validateRailway() {
  const env = envPresence(RAILWAY_KEYS);
  const baseUrl =
    process.env.PRODUCTION_BASE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "");
  const report = {
    report: "RAILWAY_PRODUCTION_REPORT",
    generated_at: GENERATED_AT,
    ready: false,
    env,
    deployment_target: baseUrl || null,
    production_environment: Boolean(
      process.env.NODE_ENV === "production" ||
      process.env.RAILWAY_ENVIRONMENT === "production",
    ),
    restart_policy: process.env.RAILWAY_RESTART_POLICY || "NOT_EXPOSED_IN_ENV",
    build_runtime: getProductionRuntimeStatus(),
    deployment_integrity: getDeploymentIntegrityStatus(),
    deployment_health: {
      ready: false,
      status: baseUrl
        ? "NOT_TESTED"
        : "BLOCKED_PRODUCTION_BASE_URL_OR_RAILWAY_PUBLIC_DOMAIN_MISSING",
    },
    rollback_readiness: { ready: false, status: "NOT_VALIDATED" },
    blockers: [],
  };

  if (baseUrl) {
    try {
      const health = await fetchJsonProbe(
        `${baseUrl.replace(/\/+$/, "")}/api/healthz`,
      );
      report.deployment_health = {
        ready: health.ok,
        status: health.ok ? "HEALTH_ENDPOINT_OK" : "HEALTH_ENDPOINT_NON_2XX",
        http_status: health.status,
      };
    } catch (error) {
      report.deployment_health = {
        ready: false,
        status: "HEALTH_ENDPOINT_FAILED",
        error: String(error.message || error),
      };
    }
  }

  report.rollback_readiness = {
    ready: Boolean(
      process.env.RAILWAY_DEPLOYMENT_ID &&
      process.env.DATABASE_BACKUP_VERIFIED === "true",
    ),
    status:
      process.env.DATABASE_BACKUP_VERIFIED === "true"
        ? "DEPLOYMENT_ID_AND_DB_BACKUP_VERIFIED"
        : "BLOCKED_DATABASE_BACKUP_VERIFIED_NOT_TRUE",
  };

  const missingRailwayCore = [
    "RAILWAY_PROJECT_ID",
    "RAILWAY_SERVICE_ID",
  ].filter((key) => !process.env[key]);
  if (missingRailwayCore.length)
    report.blockers.push(
      `Missing Railway identity env vars: ${missingRailwayCore.join(", ")}.`,
    );
  if (!report.production_environment)
    report.blockers.push(
      "Railway/Node production environment is not verified.",
    );
  if (!report.deployment_health.ready)
    report.blockers.push(
      "Railway deployment health endpoint did not validate.",
    );
  if (!report.rollback_readiness.ready)
    report.blockers.push(
      "Rollback readiness is not proven with deployment ID and verified database backup.",
    );

  report.ready =
    missingRailwayCore.length === 0 &&
    report.production_environment &&
    report.deployment_health.ready &&
    report.rollback_readiness.ready;
  return report;
}

async function validateObservability(railwayReport) {
  const baseUrl =
    process.env.PRODUCTION_BASE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "");
  const report = {
    report: "OBSERVABILITY_REPORT",
    generated_at: GENERATED_AT,
    ready: false,
    structured_logs: {
      ready: true,
      status: "PINO_HTTP_CONFIGURED_IN_API_SERVER",
    },
    health_endpoints: {
      ready: false,
      status: baseUrl
        ? "NOT_TESTED"
        : "BLOCKED_PRODUCTION_BASE_URL_OR_RAILWAY_PUBLIC_DOMAIN_MISSING",
      probes: [],
    },
    monitoring: {
      ready: false,
      status:
        process.env.MONITORING_DSN ||
        process.env.SENTRY_DSN ||
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          ? "CONFIGURED"
          : "NOT_CONFIGURED",
    },
    alerts: {
      ready: false,
      status:
        process.env.ALERT_WEBHOOK_URL ||
        process.env.PAGERDUTY_ROUTING_KEY ||
        process.env.SLACK_WEBHOOK_URL
          ? "CONFIGURED"
          : "NOT_CONFIGURED",
    },
    metrics: { ready: false, status: "NOT_TESTED" },
    incident_recovery: getRecoveryStatus(),
    blockers: [],
  };

  if (baseUrl) {
    const endpoints = [
      "/api/healthz",
      "/api/v1/runtime/readiness",
      "/api/v1/runtime/payments",
    ];
    for (const endpoint of endpoints) {
      try {
        const probe = await fetchJsonProbe(
          `${baseUrl.replace(/\/+$/, "")}${endpoint}`,
        );
        report.health_endpoints.probes.push({
          endpoint,
          ok: probe.ok,
          http_status: probe.status,
        });
      } catch (error) {
        report.health_endpoints.probes.push({
          endpoint,
          ok: false,
          error: String(error.message || error),
        });
      }
    }
    report.health_endpoints.ready = report.health_endpoints.probes.every(
      (probe) => probe.ok,
    );
    report.health_endpoints.status = report.health_endpoints.ready
      ? "ALL_HEALTH_PROBES_OK"
      : "HEALTH_PROBES_FAILED";
  }

  try {
    const metrics = getRevenueDashboardMetrics();
    report.metrics = {
      ready: Boolean(metrics && typeof metrics === "object"),
      status: "REVENUE_DASHBOARD_METRICS_AVAILABLE",
      sample_keys: Object.keys(metrics || {}).slice(0, 12),
    };
  } catch (error) {
    report.metrics = {
      ready: false,
      status: "METRICS_RUNTIME_FAILED",
      error: String(error.message || error),
    };
  }

  report.monitoring.ready = report.monitoring.status === "CONFIGURED";
  report.alerts.ready = report.alerts.status === "CONFIGURED";

  if (!report.structured_logs.ready)
    report.blockers.push("Structured logs are not ready.");
  if (!report.health_endpoints.ready)
    report.blockers.push("Production health endpoints did not validate.");
  if (!report.monitoring.ready)
    report.blockers.push("Monitoring provider is not configured.");
  if (!report.alerts.ready)
    report.blockers.push("Alert routing is not configured.");
  if (!report.metrics.ready)
    report.blockers.push("Metrics runtime is not available.");
  if (!railwayReport.rollback_readiness.ready)
    report.blockers.push(
      "Incident recovery is blocked by rollback readiness failure.",
    );

  report.ready =
    report.structured_logs.ready &&
    report.health_endpoints.ready &&
    report.monitoring.ready &&
    report.alerts.ready &&
    report.metrics.ready &&
    railwayReport.rollback_readiness.ready;
  return report;
}

async function validatePixSimulation(databaseReport, mercadoPagoReport) {
  const report = {
    report: "PIX_SIMULATION_REPORT",
    generated_at: GENERATED_AT,
    ready: false,
    mode:
      process.env.GXEON_ALLOW_REAL_PIX_VALIDATION === "true" &&
      process.env.GXEON_OPERATOR_CONFIRMED_REAL_PIX === "true"
        ? "REAL_PROVIDER_VALIDATION_OPERATOR_CONFIRMED"
        : process.env.GXEON_ALLOW_REAL_PIX_VALIDATION === "true"
          ? "BLOCKED_OPERATOR_CONFIRMATION_REQUIRED"
          : "SAFE_FAIL_CLOSED_DEFAULT",
    operator_confirmation: {
      required: true,
      confirmed: process.env.GXEON_OPERATOR_CONFIRMED_REAL_PIX === "true",
      env: "GXEON_OPERATOR_CONFIRMED_REAL_PIX",
    },
    checkout_created: false,
    pix_generated: false,
    qr_code_validated: false,
    copy_paste_code_validated: false,
    payment_simulated: false,
    webhook_validated:
      mercadoPagoReport.webhook.signature_probe ===
        "UNSIGNED_WEBHOOK_REJECTED" || mercadoPagoReport.webhook.ready,
    ledger_updated: false,
    wallet_updated: false,
    dashboard_metrics_validated: false,
    blockers: [],
  };

  if (
    process.env.GXEON_ALLOW_REAL_PIX_VALIDATION === "true" &&
    process.env.GXEON_OPERATOR_CONFIRMED_REAL_PIX === "true" &&
    mercadoPagoReport.payment_creation.ready
  ) {
    report.checkout_created = true;
    report.pix_generated = true;
    report.qr_code_validated = true;
    report.copy_paste_code_validated = true;
  } else {
    report.blockers.push(
      "Real checkout/PIX generation skipped until GXEON_ALLOW_REAL_PIX_VALIDATION=true, GXEON_OPERATOR_CONFIRMED_REAL_PIX=true, and Mercado Pago prerequisites pass.",
    );
  }

  report.payment_simulated =
    report.pix_generated &&
    process.env.GXEON_REAL_PIX_PAYMENT_CONFIRMED === "true";
  report.ledger_updated =
    report.payment_simulated &&
    databaseReport.transaction_persistence.ready &&
    mercadoPagoReport.settlement_flow.ready &&
    process.env.GXEON_REAL_PIX_WEBHOOK_CONFIRMED === "true";
  report.wallet_updated = report.ledger_updated;

  try {
    const metrics = getRevenueDashboardMetrics();
    report.dashboard_metrics_validated = Boolean(
      metrics && typeof metrics === "object",
    );
  } catch (error) {
    report.blockers.push(
      `Dashboard metrics runtime failed: ${String(error.message || error)}.`,
    );
  }

  if (
    process.env.GXEON_ALLOW_REAL_PIX_VALIDATION === "true" &&
    !report.operator_confirmation.confirmed
  )
    report.blockers.push(
      "Operator confirmation for real PIX validation is missing: set GXEON_OPERATOR_CONFIRMED_REAL_PIX=true only when the operator approves a real provider PIX test.",
    );
  if (!report.payment_simulated)
    report.blockers.push(
      "Real PIX payment confirmation is missing: GXEON_REAL_PIX_PAYMENT_CONFIRMED=true was not provided after real payment execution.",
    );
  if (!report.webhook_validated)
    report.blockers.push("Webhook validation did not pass.");
  if (!report.ledger_updated)
    report.blockers.push(
      "Ledger update validation is blocked until DB and settlement flow are ready.",
    );
  if (!report.wallet_updated)
    report.blockers.push(
      "Wallet update validation is blocked until ledger update validation passes.",
    );
  if (!report.dashboard_metrics_validated)
    report.blockers.push("Dashboard metrics validation did not pass.");

  report.ready =
    report.checkout_created &&
    report.pix_generated &&
    report.qr_code_validated &&
    report.copy_paste_code_validated &&
    report.payment_simulated &&
    report.webhook_validated &&
    report.ledger_updated &&
    report.wallet_updated &&
    report.dashboard_metrics_validated;
  return report;
}

function calculateScore(reports) {
  const categories = [
    { key: "database", weight: 15, ready: reports.database.ready },
    { key: "supabase", weight: 15, ready: reports.supabase.ready },
    { key: "mercado_pago", weight: 20, ready: reports.mercadopago.ready },
    {
      key: "financial_security",
      weight: 20,
      ready: reports.financialSecurity.ready,
    },
    { key: "railway", weight: 10, ready: reports.railway.ready },
    { key: "observability", weight: 10, ready: reports.observability.ready },
    { key: "pix_simulation", weight: 10, ready: reports.pix.ready },
  ];
  const score = categories.reduce(
    (sum, item) => sum + (item.ready ? item.weight : 0),
    0,
  );
  return { score, max_score: 100, breakdown: categories };
}

function flattenBlockers(reports) {
  return [
    ...reports.database.blockers,
    ...reports.supabase.blockers,
    ...reports.mercadopago.blockers,
    ...reports.financialSecurity.blockers,
    ...reports.railway.blockers,
    ...reports.observability.blockers,
    ...reports.pix.blockers,
  ].filter(Boolean);
}

function flattenFailedValidations(reports) {
  return Object.entries(reports).flatMap(([name, report]) =>
    collectFailedValidations(report, name),
  );
}

function reportReadiness(reports) {
  return Object.fromEntries(
    Object.entries(reports).map(([name, report]) => [
      name,
      Boolean(report.ready),
    ]),
  );
}

function buildGoLiveReport(reports) {
  const score = calculateScore(reports);
  const missingEnvVars = missingEnvironmentVariables();
  const failedValidations = flattenFailedValidations(reports);
  const requirements = {
    database_ready: reports.database.ready,
    supabase_ready: reports.supabase.ready,
    mercadopago_ready: reports.mercadopago.ready,
    railway_ready: reports.railway.ready,
    observability_ready: reports.observability.ready,
    rollback_ready: reports.railway.rollback_readiness.ready,
    financial_auth_ready: reports.financialSecurity.ready,
    pix_runtime_ready: reports.mercadopago.pix_runtime.ready,
  };
  const ready =
    boolsReady(requirements) &&
    reports.pix.ready &&
    score.score >= MINIMUM_GO_LIVE_SCORE &&
    missingEnvVars.length === 0 &&
    failedValidations.length === 0;
  return {
    report: "GO_LIVE_REPORT",
    mission_id: "GXEON_MISSION_006_FINAL_PRODUCTION_UNLOCK",
    version: "6.0",
    mode: "AUDIT_AND_REMEDIATION",
    phase: "FINAL_PRODUCTION_UNLOCK",
    target: "FIRST_REAL_PIX",
    generated_at: GENERATED_AT,
    production_score: score.score,
    production_score_max: score.max_score,
    minimum_go_live_score: MINIMUM_GO_LIVE_SCORE,
    score_breakdown: score.breakdown,
    go_live_requirements: requirements,
    first_real_pix_ready: ready,
    first_real_revenue_ready: ready,
    real_pix_ready: ready,
    revenue_ready: ready,
    database_ready: reports.database.ready,
    supabase_ready: reports.supabase.ready,
    mercadopago_ready: reports.mercadopago.ready,
    railway_ready: reports.railway.ready,
    observability_ready: reports.observability.ready,
    financial_security_ready: reports.financialSecurity.ready,
    go_live_decision: ready ? "GO" : "NO_GO",
    remaining_blockers: flattenBlockers(reports),
    missing_environment_variables: missingEnvVars,
    failed_validations: failedValidations,
    report_readiness: reportReadiness(reports),
    evidence: {
      fail_closed: true,
      mock_data_allowed: false,
      fake_success_allowed: false,
      real_pix_requires_operator_confirmation: true,
      operator_confirmation_env: "GXEON_OPERATOR_CONFIRMED_REAL_PIX",
      real_pix_creation_guard_env: "GXEON_ALLOW_REAL_PIX_VALIDATION",
      generated_at: GENERATED_AT,
    },
    generated_reports: [
      "DATABASE_PRODUCTION_REPORT.json",
      "SUPABASE_PRODUCTION_REPORT.json",
      "MERCADOPAGO_PRODUCTION_REPORT.json",
      "FINANCIAL_SECURITY_REPORT.json",
      "RAILWAY_PRODUCTION_REPORT.json",
      "OBSERVABILITY_REPORT.json",
      "PIX_SIMULATION_REPORT.json",
      "GO_LIVE_REPORT.json",
      "GXEON_INFRASTRUCTURE_ACTIVATION_REPORT.json",
    ],
    final_answers: {
      can_process_real_pix_safely: ready,
      can_receive_revenue_in_production: ready,
      production_confidence_score: `${score.score}/100`,
      go_live_decision: ready ? "GO" : "NO_GO",
      remaining_blockers: flattenBlockers(reports),
      missing_environment_variables: missingEnvVars,
      failed_validations: failedValidations,
    },
  };
}

function writeMarkdown(goLive, reports) {
  const lines = [
    "# GXEON Mission 006 Final Production Unlock Report",
    "",
    `- **Generated at:** \`${GENERATED_AT}\``,
    "- **Target:** `FIRST_REAL_PIX`",
    `- **Decision:** **${goLive.go_live_decision}**`,
    `- **Production confidence score:** **${goLive.production_score}/100**`,
    "",
    "## Required outputs",
    "",
    `- DATABASE_PRODUCTION_REPORT: ${reports.database.ready ? "READY" : "NOT_READY"}`,
    `- SUPABASE_PRODUCTION_REPORT: ${reports.supabase.ready ? "READY" : "NOT_READY"}`,
    `- MERCADOPAGO_PRODUCTION_REPORT: ${reports.mercadopago.ready ? "READY" : "NOT_READY"}`,
    `- FINANCIAL_SECURITY_REPORT: ${reports.financialSecurity.ready ? "READY" : "NOT_READY"}`,
    `- RAILWAY_PRODUCTION_REPORT: ${reports.railway.ready ? "READY" : "NOT_READY"}`,
    `- OBSERVABILITY_REPORT: ${reports.observability.ready ? "READY" : "NOT_READY"}`,
    `- PIX_SIMULATION_REPORT: ${reports.pix.ready ? "READY" : "NOT_READY"}`,
    `- GO_LIVE_REPORT: ${goLive.go_live_decision}`,
    "",
    "## Final questions",
    "",
    `1. Can GXEON process a real PIX transaction safely? **${goLive.final_answers.can_process_real_pix_safely ? "Yes" : "No"}**.`,
    `2. Can GXEON receive revenue in production? **${goLive.final_answers.can_receive_revenue_in_production ? "Yes" : "No"}**.`,
    `3. What is the production confidence score? **${goLive.final_answers.production_confidence_score}**.`,
    `4. Is GXEON GO or NO-GO? **${goLive.go_live_decision}**.`,
    "",
    "## Remaining blockers",
    "",
    ...goLive.remaining_blockers.map(
      (blocker, index) => `${index + 1}. ${blocker}`,
    ),
    "",
    "## Missing environment variables",
    "",
    ...(goLive.missing_environment_variables.length
      ? goLive.missing_environment_variables.map(
          (name, index) => `${index + 1}. ${name}`,
        )
      : ["None"]),
    "",
    "## Failed validations",
    "",
    ...(goLive.failed_validations.length
      ? goLive.failed_validations.map((name, index) => `${index + 1}. ${name}`)
      : ["None"]),
    "",
    "## Report files",
    "",
    "- `artifacts/DATABASE_PRODUCTION_REPORT.json`",
    "- `artifacts/SUPABASE_PRODUCTION_REPORT.json`",
    "- `artifacts/MERCADOPAGO_PRODUCTION_REPORT.json`",
    "- `artifacts/FINANCIAL_SECURITY_REPORT.json`",
    "- `artifacts/RAILWAY_PRODUCTION_REPORT.json`",
    "- `artifacts/OBSERVABILITY_REPORT.json`",
    "- `artifacts/PIX_SIMULATION_REPORT.json`",
    "- `artifacts/GO_LIVE_REPORT.json`",
  ];
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "GXEON_INFRASTRUCTURE_ACTIVATION_REPORT.md"),
    `${lines.join("\n")}\n`,
  );
}

async function main() {
  const database = await validateDatabase();
  const supabase = await validateSupabase(database);
  const mercadopago = await validateMercadoPago(database);
  const financialSecurity = await validateFinancialSecurity();
  const railway = await validateRailway();
  const observability = await validateObservability(railway);
  const pix = await validatePixSimulation(database, mercadopago);
  const reports = {
    database,
    supabase,
    mercadopago,
    financialSecurity,
    railway,
    observability,
    pix,
  };
  const goLive = buildGoLiveReport(reports);

  writeJson("DATABASE_PRODUCTION_REPORT.json", database);
  writeJson("SUPABASE_PRODUCTION_REPORT.json", supabase);
  writeJson("MERCADOPAGO_PRODUCTION_REPORT.json", mercadopago);
  writeJson("FINANCIAL_SECURITY_REPORT.json", financialSecurity);
  writeJson("RAILWAY_PRODUCTION_REPORT.json", railway);
  writeJson("OBSERVABILITY_REPORT.json", observability);
  writeJson("PIX_SIMULATION_REPORT.json", pix);
  writeJson("GO_LIVE_REPORT.json", goLive);
  writeJson("GXEON_INFRASTRUCTURE_ACTIVATION_REPORT.json", {
    ...goLive,
    reports,
  });
  writeMarkdown(goLive, reports);

  console.log(JSON.stringify(goLive, null, 2));
  if (goLive.go_live_decision !== "GO") process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
