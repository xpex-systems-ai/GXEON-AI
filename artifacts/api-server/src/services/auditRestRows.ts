export type AuditRestRow = { id: string; [key: string]: unknown };

// A provider error object is not an empty list or a successful audit result.
export async function readAuditRestRows(
  response: Response,
): Promise<AuditRestRow[]> {
  if (!response.ok) throw new Error("AUDIT_REST_READ_FAILED");
  const payload: unknown = await response.json().catch(() => {
    throw new Error("AUDIT_REST_CONTRACT_INVALID");
  });
  if (
    !Array.isArray(payload) ||
    !payload.every(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        !Array.isArray(row) &&
        typeof row.id === "string",
    )
  ) {
    throw new Error("AUDIT_REST_CONTRACT_INVALID");
  }
  return payload;
}
