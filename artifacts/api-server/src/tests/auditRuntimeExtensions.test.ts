import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { loadOmnixRuntimeExtensions } from "../omnixRuntimeExtensions";
import { createAuditPilotApp } from "../auditPilotApp";
import { createAuditWorkflowService } from "../services/auditWorkflowService";
import { omnixCapabilityRegistrySchema } from "@workspace/api-zod";

const origin = "https://portal.example.invalid", secret = () => randomBytes(32).toString("base64url");
test("GX040 extensions require separate identity, recipient and credentials; customer admission cannot be enabled", () => {
  assert.equal(loadOmnixRuntimeExtensions({}).enterprise, undefined);
  assert.throws(() => loadOmnixRuntimeExtensions({ GXEON_OMNIX_ALLOW_CUSTOMER_DATA: "true" }), /CUSTOMER_ADMISSION_REVIEW_REQUIRED/);
  const enterprise = { GXEON_OMNIX_ENTERPRISE_ENABLED: "true", GXEON_OMNIX_OIDC_ISSUER: "https://idp.example.invalid/realm",
    GXEON_OMNIX_OIDC_JWKS_URI: "https://idp.example.invalid/realm/jwks", GXEON_OMNIX_OIDC_AUDIENCE: "omnix-test" };
  const token = secret(), env = { ...enterprise, GXEON_OMNIX_COMMERCIAL_ENABLED: "true", GXEON_OMNIX_COMMERCIAL_TOKEN: token,
    GXEON_OMNIX_COMMERCIAL_RECIPIENT_USER_ID: randomUUID(), GXEON_OMNIX_COMMERCIAL_RECIPIENT_ORGANIZATION_ID: randomUUID() };
  assert.ok(loadOmnixRuntimeExtensions(env).commercial);
  for (const patch of [{ GXEON_OMNIX_ENTERPRISE_ENABLED: "false" }, { GXEON_OMNIX_COMMERCIAL_RECIPIENT_USER_ID: "prompt-owner" },
    { GXEON_AUDIT_OPERATOR_TOKEN: token }, { GXEON_AUDIT_REVIEWER_TOKEN: token }, { GXEON_OMNIX_COMMERCIAL_TOKEN: "" }])
    assert.throws(() => loadOmnixRuntimeExtensions({ ...env, ...patch }), /COMMERCIAL_RUNTIME_CONFIGURATION_REQUIRED/);
});

test("GX040 mounted synthetic distribution uses live protected session, fixed capabilities and JSON fail-closed defaults", async () => {
  const code = secret(), workflow = createAuditWorkflowService(async () => { throw new Error("DATABASE_SECRET_MUST_NOT_LEAK"); });
  const server = createAuditPilotApp({ origins: [origin], ready: async () => undefined, service: workflow,
    portal: { secureCookies: false, identities: [{ id: "test-gx040-reader", organizationId: "test-org-gx040", role: "operator",
      name: "TEST DATA reader", accessCodeSha256: createHash("sha256").update(code).digest("hex") },
      { id: "test-gx040-reviewer", organizationId: "test-org-gx040", role: "reviewer", name: "TEST DATA reviewer",
        accessCodeSha256: createHash("sha256").update(secret()).digest("hex") }] } }).listen(0, "127.0.0.1");
  await once(server, "listening"); const address = server.address(); assert.ok(address && typeof address !== "string");
  const call = (route: string, cookie = "", body?: unknown) => fetch(`http://127.0.0.1:${address.port}` + route, {
    method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(10000),
    headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    for (const route of ["/api/omnix-enterprise/distribution/capabilities", "/api/omnix-commercial/status"]) {
      const response = await call(route); assert.equal(response.status, 404); assert.match(response.headers.get("content-type")!, /application\/json/);
    }
    assert.equal((await call("/api/omnix/distribution/capabilities")).status, 401);
    const login = await call("/api/omnix/login", "", { identity: "test-gx040-reader", code }); assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
    const catalog = await call("/api/omnix/distribution/capabilities", cookie); assert.equal(catalog.status, 200);
    const body = await catalog.json();
    const registry = omnixCapabilityRegistrySchema.parse(body.data ?? body);
    assert.equal(registry.specialists.length, 6); assert.equal(registry.release.customerDataAllowed, false);
    const rpc = await call("/api/omnix/distribution/mcp", cookie, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    assert.equal(rpc.status, 200); assert.equal((await rpc.json()).result.tools.length, 7);
    assert.equal((await call("/api/omnix/distribution/assistant", cookie, { intent: "capabilities", organizationId: "attacker" })).status, 400);
    assert.equal((await call("/api/omnix/distribution/assistant", cookie, { intent: "latest_report" })).status, 503);
    assert.equal((await call("/api/omnix/logout", cookie, {})).status, 200);
    assert.equal((await call("/api/omnix/distribution/capabilities", cookie)).status, 401);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
