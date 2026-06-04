import { desc } from "drizzle-orm";
import {
  financialLedger,
  getDb,
  type FinancialLedgerEntry,
  type NewFinancialLedgerEntry,
} from "@workspace/db";
import type { ServiceLimitOptions } from "./types";

function normalizeLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(Number(limit ?? 100), 500));
}

export class LedgerService {
  async listLedgerEntries(options: ServiceLimitOptions = {}): Promise<FinancialLedgerEntry[]> {
    return getDb()
      .select()
      .from(financialLedger)
      .orderBy(desc(financialLedger.createdAt))
      .limit(normalizeLimit(options.limit));
  }

  async createLedgerEntry(input: NewFinancialLedgerEntry): Promise<FinancialLedgerEntry> {
    const rows = await getDb().insert(financialLedger).values(input).returning();
    return rows[0];
  }
}

export const ledgerService = new LedgerService();
