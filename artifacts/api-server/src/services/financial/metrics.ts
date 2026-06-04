import { sql } from "drizzle-orm";
import {
  actorWallets,
  financialLedger,
  getDb,
  globalTransactions,
  isDatabaseConfigured,
} from "@workspace/db";
import type { FinancialHealth, FinancialMetrics } from "./types";

function readCount(rows: Array<{ count: unknown }>): number {
  const value = rows[0]?.count ?? 0;
  return Number(value);
}

export class FinancialMetricsService {
  async collect(): Promise<FinancialMetrics> {
    const db = getDb();
    const latencyStart = performance.now();
    await db.execute(sql`select 1`);
    const databaseLatencyMs = Math.round((performance.now() - latencyStart) * 100) / 100;

    const [walletRows, transactionRows, ledgerRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(actorWallets),
      db.select({ count: sql<number>`count(*)::int` }).from(globalTransactions),
      db.select({ count: sql<number>`count(*)::int` }).from(financialLedger),
    ]);

    return {
      databaseLatencyMs,
      totalWallets: readCount(walletRows),
      totalTransactions: readCount(transactionRows),
      totalLedgerEntries: readCount(ledgerRows),
    };
  }

  async health(): Promise<FinancialHealth> {
    const risks: string[] = [];
    if (!isDatabaseConfigured()) {
      risks.push("DATABASE_URL is not configured; financial runtime is read-blocked.");
      return {
        status: "degraded",
        databaseConfigured: false,
        databaseReachable: false,
        checkedAt: new Date().toISOString(),
        metrics: {
          databaseLatencyMs: null,
          totalWallets: 0,
          totalTransactions: 0,
          totalLedgerEntries: 0,
        },
        risks,
      };
    }

    try {
      const metrics = await this.collect();
      return {
        status: "ok",
        databaseConfigured: true,
        databaseReachable: true,
        checkedAt: new Date().toISOString(),
        metrics,
        risks,
      };
    } catch (error) {
      risks.push(error instanceof Error ? error.message : String(error));
      return {
        status: "degraded",
        databaseConfigured: true,
        databaseReachable: false,
        checkedAt: new Date().toISOString(),
        metrics: {
          databaseLatencyMs: null,
          totalWallets: 0,
          totalTransactions: 0,
          totalLedgerEntries: 0,
        },
        risks,
      };
    }
  }
}

export const financialMetricsService = new FinancialMetricsService();
