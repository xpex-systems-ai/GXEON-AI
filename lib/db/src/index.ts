import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type FinancialDatabase = NodePgDatabase<typeof schema>;
type FinancialPool = pg.Pool;

let poolSingleton: FinancialPool | null = null;
let dbSingleton: FinancialDatabase | null = null;

function assertDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return databaseUrl;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): FinancialPool {
  if (!poolSingleton) {
    poolSingleton = new Pool({ connectionString: assertDatabaseUrl() });
  }
  return poolSingleton;
}

export function getDb(): FinancialDatabase {
  if (!dbSingleton) {
    dbSingleton = drizzle(getPool(), { schema });
  }
  return dbSingleton;
}

export async function closeDb(): Promise<void> {
  if (poolSingleton) {
    await poolSingleton.end();
    poolSingleton = null;
    dbSingleton = null;
  }
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
