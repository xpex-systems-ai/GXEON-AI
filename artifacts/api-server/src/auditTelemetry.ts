export type OperationalRecord = {
  event: "omnix_operation" | "omnix_failure_alert";
  operation: "product_visit" | "authenticated_entry" | "request_started" | "audit_started" | "audit_completed" | "report_exported" | "operation_failed";
  outcome: "success" | "failure";
  duration: "lt100ms" | "lt1s" | "lt5s" | "gte5s";
  count: number;
  testData: true;
};

// Private API observations. No Google Analytics destination, user/case identifiers,
// filenames, URLs, bodies, headers, IP addresses or arbitrary labels are emitted.
export function createAuditTelemetry(write: (record: OperationalRecord) => void, now = () => performance.now()) {
  const counters = new Map<OperationalRecord["operation"], number>();
  let windowAt = now(), failures = 0;
  return (method: string, path: string, status: number, elapsedMs: number) => {
    if (!Number.isInteger(status) || status < 200 || status > 599 || !Number.isFinite(elapsedMs) || elapsedMs < 0) return;
    const success = status >= 200 && status < 300;
    const cases = /^\/api\/(?:omnix|v1\/audit\/workflow)\/cases/;
    let operation: OperationalRecord["operation"] | undefined;
    if (success && method === "GET" && path === "/omnix") operation = "product_visit";
    else if (success && method === "POST" && path === "/api/omnix/login") operation = "authenticated_entry";
    else if (success && method === "POST" && cases.test(path)) {
      if (/\/cases\/?$/.test(path)) operation = "request_started";
      else if (/\/cases\/[a-f0-9-]{36}\/run\/?$/i.test(path)) operation = "audit_started";
      else if (/\/cases\/[a-f0-9-]{36}\/finalize\/?$/i.test(path)) operation = "audit_completed";
    } else if (success && method === "GET" && cases.test(path) && /\/cases\/[a-f0-9-]{36}\/report\/?$/i.test(path)) operation = "report_exported";
    if (!success && path.startsWith("/api/")) operation = "operation_failed";
    if (!operation) return;
    const count = Math.min(Number.MAX_SAFE_INTEGER, (counters.get(operation) ?? 0) + 1);
    counters.set(operation, count);
    const record: OperationalRecord = { event: "omnix_operation", operation, outcome: success ? "success" : "failure",
      duration: elapsedMs < 100 ? "lt100ms" : elapsedMs < 1000 ? "lt1s" : elapsedMs < 5000 ? "lt5s" : "gte5s", count, testData: true };
    // Telemetry failures cannot change audit results or terminate a response.
    try { write(record); } catch { /* independent logging sink */ }
    if (now() - windowAt >= 60000) { windowAt = now(); failures = 0; }
    if (status >= 500 && ++failures === 3) {
      try { write({ ...record, event: "omnix_failure_alert", operation: "operation_failed", outcome: "failure", count: failures }); }
      catch { /* independent logging sink */ }
    }
  };
}
