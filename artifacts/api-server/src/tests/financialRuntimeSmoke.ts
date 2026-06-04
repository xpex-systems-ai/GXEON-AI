import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  actorWallets,
  closeDb,
  financialLedger,
  getDb,
  getPool,
  globalTransactions,
  isDatabaseConfigured,
} from "@workspace/db";
import {
  financialMetricsService,
  ledgerService,
  transactionService,
  walletService,
} from "../services/financial";

const expectedTables = ["actor_wallets", "global_transactions", "financial_ledger"];
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../..");
const smokeReportPath = path.resolve(
  rootDir,
  process.env.GXEON_FINANCIAL_SMOKE_REPORT ?? "artifacts/FINANCIAL_RUNTIME_SMOKE_RESULT.json",
);
const dbReportPath = path.resolve(
  rootDir,
  process.env.GXEON_DATABASE_VALIDATION_REPORT ?? "artifacts/DATABASE_VALIDATION_REPORT.json",
);

function maskDatabaseUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.username) url.username = "***";
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return value.replace(/:\/\/([^:@]+):([^@]+)@/, "://***:***@");
  }
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function validateSchema() {
  const db = getDb();
  const tableRows = await db.execute(sql`
    select table_name
      from information_schema.tables
     where table_schema = 'public'
       and table_type = 'BASE TABLE'
       and table_name = any(${expectedTables}::text[])
     order by table_name
  `);
  const actualTables = tableRows.rows.map((row) => String(row.table_name));
  const missingTables = expectedTables.filter((table) => !actualTables.includes(table));

  return {
    expectedTables,
    actualTables,
    missingTables,
    schemaReady: missingTables.length === 0,
  };
}

async function validatePoolConnection(): Promise<number> {
  const latencyStart = performance.now();
  await getPool().query("select 1");
  return Math.round((performance.now() - latencyStart) * 100) / 100;
}

async function validateRollback(smokeId: string) {
  const db = getDb();
  const rollbackActorId = `${smokeId}-rollback`;
  const rollbackTransactionId = `${rollbackActorId}-tx`;
  const rollbackLedgerEntryId = `${rollbackActorId}-ledger`;

  await db.transaction(async (tx) => {
    const [wallet] = await tx
      .insert(actorWallets)
      .values({
        actorId: rollbackActorId,
        actorCode: "GXEON_ROLLBACK_SMOKE",
        metadata: { source: "financialRuntimeSmoke", mode: "rollback" },
      })
      .returning();

    await tx.insert(globalTransactions).values({
      transactionId: rollbackTransactionId,
      actorId: rollbackActorId,
      actorCode: "GXEON_ROLLBACK_SMOKE",
      baseAmount: "13.00",
      externalReference: `${rollbackActorId}-external`,
      description: "Financial runtime rollback transaction",
      metadata: { source: "financialRuntimeSmoke", mode: "rollback" },
    });

    await tx.insert(financialLedger).values({
      ledgerEntryId: rollbackLedgerEntryId,
      actorId: rollbackActorId,
      walletId: wallet.id,
      transactionId: rollbackTransactionId,
      entryType: "CREDIT",
      sourceType: "PAYMENT",
      sourceId: rollbackTransactionId,
      amount: "13.00",
      balanceAfter: "13.00",
      idempotencyKey: `${rollbackActorId}-idempotency`,
      description: "Financial runtime rollback ledger entry",
      metadata: { source: "financialRuntimeSmoke", mode: "rollback" },
    });

    throw new Error("ROLLBACK_VALIDATION_SENTINEL");
  }).catch((error: unknown) => {
    if (!(error instanceof Error) || error.message !== "ROLLBACK_VALIDATION_SENTINEL") {
      throw error;
    }
  });

  const rollbackRows = await db.execute(sql`
    select
      (select count(*)::int from actor_wallets where actor_id = ${rollbackActorId}) as wallets,
      (select count(*)::int from global_transactions where transaction_id = ${rollbackTransactionId}) as transactions,
      (select count(*)::int from financial_ledger where ledger_entry_id = ${rollbackLedgerEntryId}) as ledger_entries
  `);
  const row = rollbackRows.rows[0] as Record<string, unknown>;
  const counts = {
    wallets: Number(row.wallets),
    transactions: Number(row.transactions),
    ledgerEntries: Number(row.ledger_entries),
  };

  return {
    rollbackActorId,
    rollbackTransactionId,
    rollbackLedgerEntryId,
    counts,
    passed: counts.wallets === 0 && counts.transactions === 0 && counts.ledgerEntries === 0,
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const databaseUrlConfigured = isDatabaseConfigured();

  if (!databaseUrlConfigured) {
    throw new Error("DATABASE_URL is required for financial runtime real validation");
  }

  const db = getDb();
  const poolLatencyMs = await validatePoolConnection();
  await db.execute(sql`select 1`);
  const schema = await validateSchema();

  if (!schema.schemaReady) {
    throw new Error(`Financial schema is missing tables: ${schema.missingTables.join(", ")}`);
  }

  const smokeId = `financial-real-smoke-${randomUUID()}`;
  const transactionId = `${smokeId}-tx`;
  const ledgerEntryId = `${smokeId}-ledger`;
  const beforeMetrics = await financialMetricsService.collect(5);

  const wallet = await walletService.createWallet({
    actorId: smokeId,
    actorCode: "GXEON_REAL_VALIDATION",
    metadata: { source: "financialRuntimeSmoke", mode: "persistent" },
  });

  const transaction = await transactionService.createTransaction({
    transactionId,
    actorId: smokeId,
    actorCode: "GXEON_REAL_VALIDATION",
    baseAmount: "42.00",
    externalReference: `${smokeId}-external`,
    description: "Financial runtime real validation transaction",
    metadata: { source: "financialRuntimeSmoke", mode: "persistent" },
  });

  const ledgerEntry = await ledgerService.createLedgerEntry({
    ledgerEntryId,
    actorId: smokeId,
    walletId: wallet.id,
    transactionId,
    entryType: "CREDIT",
    sourceType: "PAYMENT",
    sourceId: transactionId,
    amount: "42.00",
    balanceAfter: "42.00",
    idempotencyKey: `${smokeId}-idempotency`,
    description: "Financial runtime real validation ledger entry",
    metadata: { source: "financialRuntimeSmoke", mode: "persistent" },
  });

  const persistedRows = await db.execute(sql`
    select
      (select count(*)::int from actor_wallets where actor_id = ${smokeId}) as wallets,
      (select count(*)::int from global_transactions where transaction_id = ${transactionId}) as transactions,
      (select count(*)::int from financial_ledger where ledger_entry_id = ${ledgerEntryId}) as ledger_entries
  `);
  const persistedRow = persistedRows.rows[0] as Record<string, unknown>;
  const persistedCounts = {
    wallets: Number(persistedRow.wallets),
    transactions: Number(persistedRow.transactions),
    ledgerEntries: Number(persistedRow.ledger_entries),
  };

  const rollback = await validateRollback(smokeId);
  const afterMetrics = await financialMetricsService.collect(5);
  const health = await financialMetricsService.health();
  const checks = {
    databaseConnection: true,
    drizzleConnection: true,
    poolConnection: true,
    schemaReady: schema.schemaReady,
    walletInsert: Boolean(wallet.id) && persistedCounts.wallets === 1,
    transactionInsert: transaction.transactionId === transactionId && persistedCounts.transactions === 1,
    ledgerInsert: ledgerEntry.ledgerEntryId === ledgerEntryId && persistedCounts.ledgerEntries === 1,
    persistenceSelect: persistedCounts.wallets === 1 && persistedCounts.transactions === 1 && persistedCounts.ledgerEntries === 1,
    rollbackValidation: rollback.passed,
    metricsHealthy: health.status === "healthy" && afterMetrics.healthScore >= 85,
  };
  const status = Object.values(checks).every(Boolean) ? "PASS" : "FAILED";

  const databaseReport = {
    report: "DATABASE_VALIDATION_REPORT",
    generatedAt,
    status: status === "PASS" ? "online" : "degraded",
    databaseUrlConfigured,
    databaseUrlMasked: maskDatabaseUrl(process.env.DATABASE_URL),
    poolLatencyMs,
    schema,
    persistedCounts,
    metrics: afterMetrics,
  };

  const smokeReport = {
    report: "FINANCIAL_RUNTIME_SMOKE_RESULT",
    generatedAt,
    status,
    smokeId,
    persisted: {
      walletId: wallet.id,
      transactionId: transaction.transactionId,
      ledgerEntryId: ledgerEntry.ledgerEntryId,
      counts: persistedCounts,
    },
    rollback,
    health,
    checks,
    beforeMetrics,
    afterMetrics,
  };

  await writeJson(dbReportPath, databaseReport);
  await writeJson(smokeReportPath, smokeReport);

  console.log(JSON.stringify(smokeReport, null, 2));
  process.exitCode = status === "PASS" ? 0 : 1;
}

main()
  .catch(async (error) => {
    const generatedAt = new Date().toISOString();
    const failureReport = {
      report: "FINANCIAL_RUNTIME_SMOKE_RESULT",
      generatedAt,
      status: "FAILED",
      databaseUrlConfigured: isDatabaseConfigured(),
      databaseUrlMasked: maskDatabaseUrl(process.env.DATABASE_URL),
      error: error instanceof Error ? error.message : String(error),
    };
    await writeJson(smokeReportPath, failureReport);
    await writeJson(dbReportPath, {
      report: "DATABASE_VALIDATION_REPORT",
      generatedAt,
      status: "blocked",
      databaseUrlConfigured: isDatabaseConfigured(),
      databaseUrlMasked: maskDatabaseUrl(process.env.DATABASE_URL),
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(JSON.stringify(failureReport, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
