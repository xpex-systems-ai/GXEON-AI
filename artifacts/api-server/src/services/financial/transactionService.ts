import { desc } from "drizzle-orm";
import {
  getDb,
  globalTransactions,
  type GlobalTransaction,
  type NewGlobalTransaction,
} from "@workspace/db";
import type { ServiceLimitOptions } from "./types";

function normalizeLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(Number(limit ?? 100), 500));
}

export class TransactionService {
  async listTransactions(options: ServiceLimitOptions = {}): Promise<GlobalTransaction[]> {
    return getDb()
      .select()
      .from(globalTransactions)
      .orderBy(desc(globalTransactions.createdAt))
      .limit(normalizeLimit(options.limit));
  }

  async createTransaction(input: NewGlobalTransaction): Promise<GlobalTransaction> {
    const rows = await getDb().insert(globalTransactions).values(input).returning();
    return rows[0];
  }
}

export const transactionService = new TransactionService();
