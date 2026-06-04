import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  actorWallets,
  closeDb,
  financialLedger,
  getDb,
  globalTransactions,
  isDatabaseConfigured,
} from "@workspace/db";
import { financialMetricsService } from "../services/financial";

async function main() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is required for financial runtime smoke tests");
  }

  const db = getDb();
  await db.execute(sql`select 1`);

  const smokeId = `financial-smoke-${randomUUID()}`;
  const transactionId = `${smokeId}-tx`;
  const ledgerEntryId = `${smokeId}-ledger`;

  const beforeMetrics = await financialMetricsService.collect();

  await db.transaction(async (tx) => {
    const [wallet] = await tx
      .insert(actorWallets)
      .values({
        actorId: smokeId,
        actorCode: "GXEON_FINANCIAL_SMOKE",
        metadata: { source: "financialRuntimeSmoke" },
      })
      .returning();

    if (!wallet?.id) {
      throw new Error("wallet insert smoke failed");
    }

    const [transaction] = await tx
      .insert(globalTransactions)
      .values({
        transactionId,
        actorId: smokeId,
        actorCode: "GXEON_FINANCIAL_SMOKE",
        baseAmount: "42.00",
        externalReference: `${smokeId}-external`,
        description: "Financial runtime smoke transaction",
        metadata: { source: "financialRuntimeSmoke" },
      })
      .returning();

    if (transaction?.transactionId !== transactionId) {
      throw new Error("transaction insert smoke failed");
    }

    const [ledgerEntry] = await tx
      .insert(financialLedger)
      .values({
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
        description: "Financial runtime smoke ledger entry",
        metadata: { source: "financialRuntimeSmoke" },
      })
      .returning();

    if (ledgerEntry?.ledgerEntryId !== ledgerEntryId) {
      throw new Error("ledger insert smoke failed");
    }

    throw new Error("ROLLBACK_VALIDATION_SENTINEL");
  }).catch((error: unknown) => {
    if (!(error instanceof Error) || error.message !== "ROLLBACK_VALIDATION_SENTINEL") {
      throw error;
    }
  });

  const rollbackRows = await db.execute(sql`
    select
      (select count(*)::int from actor_wallets where actor_id = ${smokeId}) as wallets,
      (select count(*)::int from global_transactions where transaction_id = ${transactionId}) as transactions,
      (select count(*)::int from financial_ledger where ledger_entry_id = ${ledgerEntryId}) as ledger_entries
  `);

  const rollbackCounts = rollbackRows.rows[0] as {
    wallets: number;
    transactions: number;
    ledger_entries: number;
  };

  if (
    Number(rollbackCounts.wallets) !== 0 ||
    Number(rollbackCounts.transactions) !== 0 ||
    Number(rollbackCounts.ledger_entries) !== 0
  ) {
    throw new Error("rollback validation failed: smoke rows were persisted");
  }

  const afterMetrics = await financialMetricsService.collect();

  console.log(JSON.stringify({
    status: "PASS",
    checks: {
      connection: true,
      insertWallet: true,
      insertTransaction: true,
      insertLedgerEntry: true,
      rollbackValidation: true,
    },
    beforeMetrics,
    afterMetrics,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
