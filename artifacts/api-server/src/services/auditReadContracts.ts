/**
 * The Supabase REST JSON boundary returns unknown. Validate collection shape
 * before using it for counts, proposal readiness or returning case summaries.
 * No database writes or privileges are introduced by this module.
 */
export function parseAuditRows(value: unknown): Array<Record<string, unknown>> {
  if (
    !Array.isArray(value) ||
    !value.every((row) => row !== null && typeof row === "object" && !Array.isArray(row))
  ) {
    throw new Error("AUDIT_REST_ROWS_INVALID");
  }
  return value as Array<Record<string, unknown>>;
}

export function parseAuditCaseRows(
  value: unknown,
): Array<Record<string, unknown> & { id: string }> {
  const rows = parseAuditRows(value);
  if (rows.some((row) => typeof row.id !== "string" || row.id.trim().length === 0)) {
    throw new Error("AUDIT_REST_CASE_ID_INVALID");
  }
  return rows as Array<Record<string, unknown> & { id: string }>;
}
