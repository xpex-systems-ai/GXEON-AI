// Connection-only entrypoint. Importing it never loads schemas or opens a connection.
import pg from "pg";
export type { PoolClient } from "pg";
export const Pool = pg.Pool;
let singleton: pg.Pool | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
export function getPool(): pg.Pool {
  if (!singleton) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    singleton = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    // pg emits errors for idle clients after a database interruption. Handle the
    // event without serializing the client, connection string, or raw error.
    singleton.on("error", () => {
      console.error(JSON.stringify({ event: "database_pool_unavailable" }));
    });
  }
  return singleton;
}
export async function closePool(): Promise<void> {
  if (singleton) { await singleton.end(); singleton = null; }
}
