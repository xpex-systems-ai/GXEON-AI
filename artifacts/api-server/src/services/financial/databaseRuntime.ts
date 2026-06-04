import { getPool, isDatabaseConfigured } from "@workspace/db";
import { financialMetricsService } from "./metrics";

export type DatabaseRuntimeHealth = {
  status: "healthy" | "degraded";
  databaseConfigured: boolean;
  databaseReachable: boolean;
  provider: "supabase_postgres" | "postgres" | "not_configured";
  projectId: string | null;
  pool: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } | null;
  latencyMs: number | null;
  checkedAt: string;
  risks: string[];
};

function detectProvider(databaseUrl: string | undefined): Pick<DatabaseRuntimeHealth, "provider" | "projectId"> {
  if (!databaseUrl) return { provider: "not_configured", projectId: null };

  try {
    const { hostname } = new URL(databaseUrl);
    const supabaseMatch = hostname.match(/^db\.([^.]+)\.supabase\.co$/);
    if (supabaseMatch) {
      return { provider: "supabase_postgres", projectId: supabaseMatch[1] };
    }
  } catch {
    return { provider: "postgres", projectId: null };
  }

  return { provider: "postgres", projectId: null };
}

export async function getDatabaseRuntimeHealth(): Promise<DatabaseRuntimeHealth> {
  const databaseUrl = process.env.DATABASE_URL;
  const provider = detectProvider(databaseUrl);

  if (!isDatabaseConfigured()) {
    return {
      status: "degraded",
      databaseConfigured: false,
      databaseReachable: false,
      ...provider,
      pool: null,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      risks: ["DATABASE_URL is not configured; Supabase activation is blocked."],
    };
  }

  try {
    const pool = getPool();
    const metrics = await financialMetricsService.collect(3);

    return {
      status: metrics.healthScore >= 85 ? "healthy" : "degraded",
      databaseConfigured: true,
      databaseReachable: true,
      ...provider,
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
      latencyMs: metrics.databaseLatencyMs,
      checkedAt: new Date().toISOString(),
      risks: metrics.healthScore >= 85 ? [] : ["Financial database metrics are below healthy threshold."],
    };
  } catch (error) {
    return {
      status: "degraded",
      databaseConfigured: true,
      databaseReachable: false,
      ...provider,
      pool: null,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      risks: [error instanceof Error ? error.message : String(error)],
    };
  }
}
