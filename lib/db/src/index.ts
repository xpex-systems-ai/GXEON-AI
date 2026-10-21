import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";
import { getPool, closePool } from "./pool";
export { getPool, isDatabaseConfigured } from "./pool";
export type { PoolClient } from "./pool";
import * as schema from "./schema";

type FinancialDatabase = NodePgDatabase<typeof schema>;
type FinancialPool = pg.Pool;

let dbSingleton: FinancialDatabase | null = null;

export function getDb(): FinancialDatabase {
  if (!dbSingleton) {
    dbSingleton = drizzle(getPool(), { schema });
  }
  return dbSingleton;
}

export async function closeDb(): Promise<void> {
  await closePool();
  dbSingleton = null;
}

export const pool = new Proxy({} as FinancialPool, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getPool(), prop, receiver);
    return typeof value === "function" ? value.bind(getPool()) : value;
  },
});

export const db = new Proxy({} as FinancialDatabase, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

export * from "./schema";
export * from "./auditModules";
