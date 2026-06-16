import { getPool, isDatabaseConfigured } from "@workspace/db";
import { r100DatabaseMirrorSafety } from "./r100DatabaseMirrorService";
import type { R100DatabaseMirrorSchemaDiagnostics, R100DatabaseMirrorTableDiagnostics } from "./r100DatabaseMirrorTypes";

export const r100RequiredColumnsByTable = {
  r100_state_snapshots: ["id", "snapshot_id", "snapshot_mode", "source", "collection_counts", "collections", "metadata", "safety", "created_at", "updated_at"],
  r100_state_audit_events: ["id", "event_id", "event_type", "source", "payload", "safety", "created_at"],
} as const;

const mirrorEnabled = () => process.env.GXEON_R100_DB_MIRROR_ENABLED === "true";
const schemaApplyEnabled = () => process.env.GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED === "true";

function buildTableDiagnostics(tableName: keyof typeof r100RequiredColumnsByTable, availableColumns: string[]): R100DatabaseMirrorTableDiagnostics {
  const requiredColumns = [...r100RequiredColumnsByTable[tableName]];
  const available = [...availableColumns].sort();
  const required = new Set(requiredColumns);
  const availableSet = new Set(available);
  const missingColumns = requiredColumns.filter((column) => !availableSet.has(column));
  const extraColumns = available.filter((column) => !required.has(column));
  return { tableName, exists: available.length > 0, requiredColumns, availableColumns: available, missingColumns, extraColumns, ready: missingColumns.length === 0 };
}

function blocked(databaseConfigured: boolean, tableDiagnostics: R100DatabaseMirrorTableDiagnostics[], warnings: string[], nextManualAction: string): R100DatabaseMirrorSchemaDiagnostics {
  const schemaReady = tableDiagnostics.every((table) => table.ready);
  return {
    status: "R100_DB_MIRROR_SCHEMA_DIAGNOSTICS_P2",
    mode: "MANUAL_FIRST",
    databaseConfigured,
    schemaReady,
    mirrorEnabled: mirrorEnabled(),
    schemaApplyEnabled: schemaApplyEnabled(),
    safeToWrite: databaseConfigured && schemaReady && mirrorEnabled(),
    tables: tableDiagnostics,
    warnings,
    nextManualAction,
    safety: r100DatabaseMirrorSafety,
  };
}

export async function getR100DatabaseMirrorSchemaDiagnostics(): Promise<R100DatabaseMirrorSchemaDiagnostics> {
  const emptyTables = (Object.keys(r100RequiredColumnsByTable) as Array<keyof typeof r100RequiredColumnsByTable>).map((table) => buildTableDiagnostics(table, []));
  const baseWarnings = [
    "Diagnostics are read-only and never expose DATABASE_URL, Pix keys, payment links, email, phone, WhatsApp, notes, or private notes.",
    "This DB mirror is operational memory only; it is not provider settlement or verified revenue.",
  ];
  if (!isDatabaseConfigured()) return blocked(false, emptyTables, [...baseWarnings, "DATABASE_URL is not configured in the backend environment."], "Configure DATABASE_URL in the backend only, redeploy, then run schema diagnostics again.");
  try {
    const result = await getPool().query<{ table_name: string; column_name: string }>(
      "select table_name, column_name from information_schema.columns where table_schema = current_schema() and table_name = any($1::text[]) order by table_name, ordinal_position",
      [Object.keys(r100RequiredColumnsByTable)],
    );
    const byTable = new Map<string, string[]>();
    for (const row of result.rows) byTable.set(row.table_name, [...(byTable.get(row.table_name) ?? []), row.column_name]);
    const tables = (Object.keys(r100RequiredColumnsByTable) as Array<keyof typeof r100RequiredColumnsByTable>).map((table) => buildTableDiagnostics(table, byTable.get(table) ?? []));
    const schemaReady = tables.every((table) => table.ready);
    const warnings = [...baseWarnings];
    if (!schemaReady) warnings.push("One or more R$100 DB mirror tables/columns are missing; use dry-run before any guarded schema apply.");
    if (!mirrorEnabled()) warnings.push("GXEON_R100_DB_MIRROR_ENABLED=true is still required before probe/snapshot writes.");
    if (!schemaApplyEnabled()) warnings.push("GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED is false/unset; guarded schema apply endpoint will stay blocked.");
    return blocked(true, tables, warnings, schemaReady ? (mirrorEnabled() ? "Run activation smoke test, then guarded probe and SAFE_REDACTED snapshot export." : "Set GXEON_R100_DB_MIRROR_ENABLED=true in the backend only, then redeploy.") : "Run schema dry-run; if approved, temporarily set GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true and call apply-schema with the required action.");
  } catch {
    return blocked(true, emptyTables, [...baseWarnings, "Database metadata query failed; no write was attempted."], "Verify backend database connectivity, then run schema diagnostics again.");
  }
}
