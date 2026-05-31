#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");

const requireDb = createRequire(path.join(__dirname, "../lib/db/package.json"));
const { Client } = requireDb("pg");

const EXPECTED_TABLES = [
  "actor_wallets",
  "global_transactions",
  "payment_attempts",
  "financial_ledger",
  "payment_webhook_events",
];

const EXPECTED_ENUMS = [
  "ledger_entry_type",
  "ledger_source_type",
  "payment_attempt_status",
  "transaction_status",
  "wallet_status",
  "webhook_processing_status",
];

const EXPECTED_ENUM_VALUES = {
  ledger_entry_type: [
    "CREDIT",
    "DEBIT",
    "TRANSFER",
    "HOLD",
    "RELEASE",
    "REFUND",
    "COMMISSION",
    "PAYOUT",
    "ADJUSTMENT",
  ],
  ledger_source_type: [
    "PAYMENT",
    "COMMISSION",
    "TASK",
    "SUBSCRIPTION",
    "MANUAL",
    "REFUND",
  ],
  payment_attempt_status: [
    "CREATED",
    "PENDING",
    "APPROVED",
    "FAILED",
    "EXPIRED",
    "REFUNDED",
    "CANCELED",
  ],
  transaction_status: [
    "PENDING",
    "PAID",
    "FAILED",
    "CANCELED",
    "EXPIRED",
    "REFUNDED",
  ],
  wallet_status: ["ACTIVE", "SUSPENDED", "CLOSED"],
  webhook_processing_status: [
    "RECEIVED",
    "PROCESSED",
    "DUPLICATE",
    "REJECTED",
    "FAILED",
  ],
};

const argv = new Set(process.argv.slice(2));
const writeSmoke = argv.has("--write-smoke");
const rootDir = path.join(__dirname, "..");
const artifactPath = path.resolve(
  rootDir,
  process.env["GXEON_DB_PROVISIONING_REPORT"] ?? "artifacts/DATABASE_PROVISIONING_REPORT.json",
);
const databaseUrl = process.env["DATABASE_URL"];

function maskDatabaseUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.password) {
      url.password = "***";
    }
    if (url.username) {
      url.username = "***";
    }
    return url.toString();
  } catch {
    return value.replace(/:\/\/([^:@]+):([^@]+)@/, "://***:***@");
  }
}

function missing(expected, actual) {
  return expected.filter((item) => !actual.includes(item));
}

async function validate() {
  const report = {
    report: "DATABASE_PROVISIONING_REPORT",
    generated_at: new Date().toISOString(),
    status: "FAILED",
    database_url_configured: Boolean(databaseUrl),
    database_url_masked: maskDatabaseUrl(databaseUrl),
    expected: {
      tables: EXPECTED_TABLES,
      enums: EXPECTED_ENUMS,
      enum_count: EXPECTED_ENUMS.length,
    },
    actual: {
      tables: [],
      enums: {},
    },
    checks: {
      connection: false,
      tables_present: false,
      enums_present: false,
      enum_values_present: false,
      write_smoke_requested: writeSmoke,
      write_smoke_passed: false,
    },
    missing: {
      tables: EXPECTED_TABLES,
      enums: EXPECTED_ENUMS,
      enum_values: {},
    },
    notes: [
      "The schema currently defines 6 financial ENUM types; the step-01 checklist text says 7 but lists 6 names.",
      "Write smoke uses a rolled-back transaction so production data is not retained.",
    ],
  };

  if (!databaseUrl) {
    report.blocker = "DATABASE_URL is not configured.";
    return report;
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    report.checks.connection = true;

    const tablesResult = await client.query(
      `select table_name
         from information_schema.tables
        where table_schema = 'public'
          and table_type = 'BASE TABLE'
          and table_name = any($1::text[])
        order by table_name`,
      [EXPECTED_TABLES],
    );
    report.actual.tables = tablesResult.rows.map((row) => row.table_name);
    report.missing.tables = missing(EXPECTED_TABLES, report.actual.tables);
    report.checks.tables_present = report.missing.tables.length === 0;

    const enumResult = await client.query(
      `select t.typname as enum_name, e.enumlabel as enum_value
         from pg_type t
         join pg_enum e on e.enumtypid = t.oid
         join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typname = any($1::text[])
        order by t.typname, e.enumsortorder`,
      [EXPECTED_ENUMS],
    );

    for (const row of enumResult.rows) {
      report.actual.enums[row.enum_name] ??= [];
      report.actual.enums[row.enum_name].push(row.enum_value);
    }

    report.missing.enums = missing(EXPECTED_ENUMS, Object.keys(report.actual.enums));
    report.checks.enums_present = report.missing.enums.length === 0;

    for (const [enumName, expectedValues] of Object.entries(EXPECTED_ENUM_VALUES)) {
      const actualValues = report.actual.enums[enumName] ?? [];
      const missingValues = missing(expectedValues, actualValues);
      if (missingValues.length > 0) {
        report.missing.enum_values[enumName] = missingValues;
      }
    }
    report.checks.enum_values_present = Object.keys(report.missing.enum_values).length === 0;

    if (writeSmoke) {
      await client.query("begin");
      try {
        await client.query(
          `insert into actor_wallets (actor_id, actor_code, metadata)
           values ($1, $2, $3::jsonb)`,
          [
            `provisioning-smoke-${Date.now()}`,
            "GXEON_PROVISIONING_SMOKE",
            JSON.stringify({ source: "scripts/validate_financial_db.cjs" }),
          ],
        );
        report.checks.write_smoke_passed = true;
      } finally {
        await client.query("rollback");
      }
    }

    const requiredChecks = [
      report.checks.connection,
      report.checks.tables_present,
      report.checks.enums_present,
      report.checks.enum_values_present,
    ];

    if (writeSmoke) {
      requiredChecks.push(report.checks.write_smoke_passed);
    }

    report.status = requiredChecks.every(Boolean) ? "PASS" : "FAILED";
    return report;
  } finally {
    await client.end();
  }
}

validate()
  .then((report) => {
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === "PASS" ? 0 : 1;
  })
  .catch((error) => {
    const report = {
      report: "DATABASE_PROVISIONING_REPORT",
      generated_at: new Date().toISOString(),
      status: "FAILED",
      database_url_configured: Boolean(databaseUrl),
      database_url_masked: maskDatabaseUrl(databaseUrl),
      error: error instanceof Error ? error.message : String(error),
    };
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  });
