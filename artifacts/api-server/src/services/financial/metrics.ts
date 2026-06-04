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

function roundLatency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateHealthScore(metrics: Omit<FinancialMetrics, "healthScore">): number {
  if (metrics.databaseLatencyMs === null) return 0;

  const latencyPenalty = metrics.databaseLatencyMs > 50
    ? Math.min(35, Math.ceil((metrics.databaseLatencyMs - 50) / 10))
    : 0;
  const dataPenalty = metrics.totalWallets > 0 && metrics.totalTransactions > 0 && metrics.totalLedgerEntries > 0
    ? 0
    : 15;

  return Math.max(0, 100 - latencyPenalty - dataPenalty);
}

export class FinancialMetricsService {
  async collect(sampleCount = 3): Promise<FinancialMetrics> {
    const db = getDb();
    const samples = await Promise.all(
      Array.from({ length: Math.max(1, sampleCount) }, async () => {
        const latencyStart = performance.now();
        await db.execute(sql`select 1`);
        return roundLatency(performance.now() - latencyStart);
      }),
    );
    const databaseLatencyMs = roundLatency(
      samples.reduce((total, sample) => total + sample, 0) / samples.length,
    );

    const [walletRows, transactionRows, ledgerRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(actorWallets),
      db.select({ count: sql<number>`count(*)::int` }).from(globalTransactions),
      db.select({ count: sql<number>`count(*)::int` }).from(financialLedger),
    ]);

    const metricsWithoutScore = {
      databaseLatencyMs,
      databaseLatencySamplesMs: samples,
      totalWallets: readCount(walletRows),
      totalTransactions: readCount(transactionRows),
      totalLedgerEntries: readCount(ledgerRows),
    };

    return {
      ...metricsWithoutScore,
      healthScore: calculateHealthScore(metricsWithoutScore),
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
          databaseLatencySamplesMs: [],
          totalWallets: 0,
          totalTransactions: 0,
          totalLedgerEntries: 0,
          healthScore: 0,
        },
        risks,
      };
    }

    try {
      const metrics = await this.collect();
      const healthy = metrics.healthScore >= 85;
      if (!healthy) {
        risks.push("Financial runtime metrics are below the healthy threshold.");
      }

      return {
        status: healthy ? "healthy" : "degraded",
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
          databaseLatencySamplesMs: [],
          totalWallets: 0,
          totalTransactions: 0,
          totalLedgerEntries: 0,
          healthScore: 0,
        },
        risks,
      };
    }
  }
}

export const financialMetricsService = new FinancialMetricsService();
