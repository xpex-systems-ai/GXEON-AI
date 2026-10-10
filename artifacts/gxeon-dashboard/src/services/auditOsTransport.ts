/**
 * Audit OS browser transport safety contract.
 * Do not send JSON Content-Type on bodyless GET requests, which otherwise
 * can trigger unnecessary CORS preflights for a separate API origin.
 * Never surface raw backend errors or HTML to operators.
 */
export function buildAuditOsHeaders(inputHeaders: HeadersInit | undefined, hasBody: boolean): Headers {
  const headers = new Headers(inputHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export async function parseAuditOsResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error("AUDIT_OS_HTTP_" + response.status);

  const contentType = (response.headers.get("Content-Type") ?? "").toLowerCase();
  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    throw new Error("AUDIT_OS_NON_JSON_RESPONSE");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("AUDIT_OS_INVALID_JSON");
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if ((payload as { success?: unknown }).success === false) {
      throw new Error("AUDIT_OS_BACKEND_REJECTED");
    }
  }
  return payload as T;
}
