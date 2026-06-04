import { desc } from "drizzle-orm";
import { actorWallets, getDb, type ActorWallet, type NewActorWallet } from "@workspace/db";
import type { ServiceLimitOptions } from "./types";

function normalizeLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(Number(limit ?? 100), 500));
}

export class WalletService {
  async listWallets(options: ServiceLimitOptions = {}): Promise<ActorWallet[]> {
    return getDb()
      .select()
      .from(actorWallets)
      .orderBy(desc(actorWallets.createdAt))
      .limit(normalizeLimit(options.limit));
  }

  async createWallet(input: NewActorWallet): Promise<ActorWallet> {
    const rows = await getDb().insert(actorWallets).values(input).returning();
    return rows[0];
  }
}

export const walletService = new WalletService();
