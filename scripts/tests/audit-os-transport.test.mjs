import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAuditOsHeaders,
  parseAuditOsResponse,
} from "../../artifacts/gxeon-dashboard/src/services/auditOsTransport.ts";

test("GET read stays simple, no JSON Content-Type", () => {
  const headers = buildAuditOsHeaders(undefined, false);
  assert.equal(headers.get("Accept"), "application/json");
  assert.equal(headers.get("Content-Type"), null);
});
test("JSON POST has Content-Type and retains operator bearer header", () => {
  const headers = buildAuditOsHeaders({ Authorization: "Bearer test-token" }, true);
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(headers.get("Authorization"), "Bearer test-token");
});
test("preserves explicit content type", () => {
  const headers = buildAuditOsHeaders({ "Content-Type": "application/merge-patch+json" }, true);
  assert.equal(headers.get("Content-Type"), "application/merge-patch+json");
});
test("parses valid Audit OS JSON", async () => {
  const data = await parseAuditOsResponse(new Response(
    JSON.stringify({ success: true, data: { mode: "P0_SAFE_PREVIEW_ONLY" } }),
    { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } },
  ));
  assert.equal(data.data.mode, "P0_SAFE_PREVIEW_ONLY");
});
test("rejects SPA HTML fallback with HTTP 200", async () => {
  const res = new Response("<html>login page</html>", { headers: { "Content-Type": "text/html" } });
  await assert.rejects(() => parseAuditOsResponse(res), /AUDIT_OS_NON_JSON_RESPONSE/);
});
test("never leaks raw server error text to UI", async () => {
  const res = new Response("token=SECRET", { status: 503, headers: { "Content-Type": "text/plain" } });
  await assert.rejects(() => parseAuditOsResponse(res), (err) => {
    assert.equal(err.message, "AUDIT_OS_HTTP_503");
    assert.doesNotMatch(err.message, /SECRET/);
    return true;
  });
});
test("rejects invalid JSON and explicit API errors safely", async () => {
  await assert.rejects(() => parseAuditOsResponse(new Response("{bad}", {
    headers: { "Content-Type": "application/json" },
  })), /AUDIT_OS_INVALID_JSON/);
  await assert.rejects(() => parseAuditOsResponse(new Response(
    JSON.stringify({ success: false, message: "secret details" }),
    { headers: { "Content-Type": "application/json" } },
  )), /AUDIT_OS_BACKEND_REJECTED/);
});
