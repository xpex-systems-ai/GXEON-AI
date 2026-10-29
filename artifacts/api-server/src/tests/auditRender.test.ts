import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { loadAuditPilotConfig } from "../auditPilotConfig";
import { auditPilotConnectionOptions } from "../auditPilotConnection";
import { createAuditPilotApp } from "../auditPilotApp";
import { createAuditWorkflowService } from "../services/auditWorkflowService";
import { createAuditTelemetry } from "../auditTelemetry";

const secret = () => randomBytes(32).toString("base64url");
// Configuration fixtures only; this URL/review is not a provisioned service or human approval.
const origin = "https://gx030-test-fixture.onrender.com";
test("private operation metrics contain only bounded categories and alert on observed server failures", () => {
  const records: unknown[] = []; let clock = 0;
  const observe = createAuditTelemetry(record => records.push(record), () => clock);
  observe("POST", "/api/omnix/login", 200, 50);
  observe("POST", "/api/omnix/cases", 201, 200);
  observe("POST", "/api/omnix/cases/12345678-1234-1234-1234-123456789012/run", 200, 1200);
  observe("POST", "/api/omnix/cases/12345678-1234-1234-1234-123456789012/finalize", 200, 2000);
  for (let n = 0; n < 3; n++) observe("GET", "/api/omnix/private-customer-secret", 503, 5100);
  assert.equal(records.filter(r => (r as { event: string }).event === "omnix_failure_alert").length, 1);
  const text = JSON.stringify(records);
  for (const value of ["private-customer", "12345678", "/api/", "login"]) assert.ok(!text.includes(value));
  assert.ok(text.includes("audit_completed")); assert.ok(text.includes("authenticated_entry"));
  clock = 60001; observe("GET", "/api/healthz", 503, 5100);
  assert.equal(records.filter(r => (r as { event: string }).event === "omnix_failure_alert").length, 1);
  assert.doesNotThrow(() => createAuditTelemetry(() => { throw new Error("SINK_UNAVAILABLE"); })("GET", "/omnix", 200, 10));
});
function environment() {
  return { NODE_ENV: "production", PORT: "10000", GXEON_AUDIT_PILOT_ENABLED: "true",
    GXEON_AUDIT_DB_PROVIDER: "postgres", GXEON_AUDIT_AUTO_RUN_MISSION_006: "false", GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL: "false",
    GXEON_AUDIT_OPERATOR_TOKEN: secret(), GXEON_AUDIT_REVIEWER_TOKEN: secret(),
    GXEON_AUDIT_ALLOWED_ORIGINS: origin, GXEON_AUDIT_DEPLOYMENT_MODE: "render",
    GXEON_AUDIT_DATABASE_HOST: "postgres", GXEON_AUDIT_DATABASE_TLS_CA: "-----BEGIN CERTIFICATE-----\nTEST FIXTURE\n-----END CERTIFICATE-----",
    GXEON_AUDIT_FRONTEND_ROOT: "/app/public", DATABASE_URL: `postgresql://gx01_pilot_app:${secret()}@postgres/gx01_pilot`,
    RENDER: "true", RENDER_SERVICE_ID: "srv-testfixture12345", RENDER_EXTERNAL_URL: origin,
    RENDER_EXTERNAL_HOSTNAME: new URL(origin).hostname, RENDER_GIT_COMMIT: "a".repeat(40),
    GXEON_AUDIT_RENDER_REVIEW_COMMIT: "a".repeat(40),
    GXEON_AUDIT_RENDER_REVIEW_REFERENCE: "https://github.com/xpex-systems-ai/GXEON-AI/pull/456#pullrequestreview-123" };
}
test("Render candidate requires exact origin/release configuration and retains strict private database TLS", async () => {
  const env = environment(), config = loadAuditPilotConfig(env);
  assert.equal(config.deploymentMode, "render"); assert.equal(config.bindHost, "0.0.0.0"); assert.equal(config.https, undefined);
  for (const patch of [{ RENDER: "false" }, { RENDER_SERVICE_ID: "" }, { RENDER_EXTERNAL_URL: origin + "/" },
    { RENDER_EXTERNAL_HOSTNAME: "unapproved.onrender.com" }, { RENDER_EXTERNAL_URL: "http://gx030-test-fixture.onrender.com" },
    { GXEON_AUDIT_ALLOWED_ORIGINS: origin + ",https://other.example.invalid" },
    { GXEON_AUDIT_RENDER_REVIEW_COMMIT: "b".repeat(40) }, { GXEON_AUDIT_RENDER_REVIEW_REFERENCE: "" },
    { GXEON_AUDIT_RENDER_REVIEW_REFERENCE: "https://github.com/untrusted/repo/pull/1#pullrequestreview-123" },
    { GXEON_AUDIT_DATABASE_TLS_CA: "" }, { GXEON_AUDIT_DATABASE_HOST: "other" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" }, { GXEON_AUDIT_FRONTEND_ROOT: "" }, { GXEON_AUDIT_BIND_HOST: "127.0.0.1" },
    { GXEON_AUDIT_HTTPS_KEY_FILE: "/key", GXEON_AUDIT_HTTPS_CERT_FILE: "/cert" }])
    assert.throws(() => loadAuditPilotConfig({ ...env, ...patch }), /CONFIGURATION_REQUIRED|RENDER_INGRESS_REVIEW_REQUIRED/);
  const connection = await auditPilotConnectionOptions(config, async () => [{ address: "10.0.0.2", family: 4 }]);
  assert.equal(connection.ssl.rejectUnauthorized, true); assert.equal(connection.ssl.servername, "postgres");
  assert.equal(connection.ssl.ca, env.GXEON_AUDIT_DATABASE_TLS_CA);
  assert.ok(connection.ssl.checkServerIdentity("10.0.0.2", { subjectaltname: "DNS:wrong" } as Parameters<typeof connection.ssl.checkServerIdentity>[1]));
  await assert.rejects(auditPilotConnectionOptions(config, async () => [{ address: "8.8.8.8", family: 4 }]), /PRIVATE_AUDIT_DATABASE_ADDRESS_REQUIRED/);
});

test("Render ingress ignores forwarded authority, bounds health probes and preserves secure session/JSON boundaries", async () => {
  const renderIngress = loadAuditPilotConfig(environment()).renderIngress!;
  const code = secret(), records: unknown[] = [];
  let clock = 0, healthy = true, probes = 0, block = false, release: (() => void) | undefined, entered: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const app = createAuditPilotApp({ origins: [origin], renderIngress,
    service: createAuditWorkflowService(async () => { throw new Error("TEST_DATABASE_NOT_USED_FOR_INGRESS"); }),
    admission: { now: () => clock }, log: row => records.push(row),
    ready: async () => { probes++; if (block) { entered?.(); await new Promise<void>(resolve => { release = resolve; }); }
      if (!healthy) throw new Error("PRIVATE_DATABASE_DETAIL_MUST_NOT_LEAK"); },
    portal: { secureCookies: true, identities: ["operator", "reviewer"].map(role => ({ id: "test-render-" + role,
      organizationId: "test-render-org", name: "TEST DATA " + role, role: role as "operator" | "reviewer",
      accessCodeSha256: createHash("sha256").update(role === "operator" ? code : secret()).digest("hex") })) } });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (route: string, body?: unknown, headers: Record<string, string> = {}) => new Promise<Response>((resolve, reject) => {
    // Node's fetch normalizes Host to its URL. Use real HTTP to exercise the raw
    // Host supplied by a platform ingress, with no forwarding-header test bypass.
    const req = httpRequest({ hostname: "127.0.0.1", port: address.port, path: route,
      method: body === undefined ? "GET" : "POST", timeout: 5000,
      headers: { Host: new URL(origin).host, ...(body === undefined ? {} : { "Content-Type": "application/json", Origin: origin }), ...headers } }, res => {
      const chunks: Buffer[] = []; const responseHeaders = new Headers();
      for (const [key, value] of Object.entries(res.headers)) if (value !== undefined)
        for (const item of Array.isArray(value) ? value : [value]) responseHeaders.append(key, item);
      res.on("data", chunk => chunks.push(Buffer.from(chunk)));
      res.on("end", () => resolve(new Response(Uint8Array.from(Buffer.concat(chunks)), { status: res.statusCode, headers: responseHeaders })));
      res.on("error", reject);
    });
    req.on("error", reject); req.on("timeout", () => req.destroy(new Error("INGRESS_TEST_TIMEOUT")));
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
  try {
    assert.equal(app.get("trust proxy"), false);
    const wrong = await request("/api/omnix/status", undefined, { Host: "untrusted.invalid", "X-Forwarded-Host": new URL(origin).host });
    assert.equal(wrong.status, 403); assert.equal((await wrong.json()).code, "RENDER_HOST_DENIED");
    const status = await request("/api/omnix/status", undefined, { "X-Forwarded-Host": "untrusted.invalid", "X-Forwarded-Proto": "http" });
    assert.equal(status.status, 200); assert.equal((await status.json()).customerDataAllowed, false);
    assert.equal(status.headers.get("strict-transport-security"), "max-age=31536000");
    assert.equal((await request("/api/omnix/login", { identity: "test-render-operator", code }, { Origin: "https://evil.invalid" })).status, 403);
    const login = await request("/api/omnix/login", { identity: "test-render-operator", code }, { "X-Forwarded-Proto": "http" });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie") ?? "";
    for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/api/omnix"]) assert.ok(cookie.includes(flag));
    const missing = await request("/api/omnix/unrecognized", undefined, { Cookie: cookie.split(";")[0]! });
    assert.equal(missing.status, 404); assert.match(missing.headers.get("content-type") ?? "", /application\/json/);
    assert.equal((await request("/api/readyz")).status, 401);
    for (const route of ["/api/unknown", "/api/v1/financial/wallets", "/__stage/stop"]) {
      const response = await request(route); assert.equal(response.status, 404);
      assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    }
    assert.equal((await request("/api/healthz", undefined, { Host: "127.0.0.1:10000" })).status, 200); assert.equal(probes, 1);
    assert.equal((await request("/api/healthz")).status, 200); assert.equal(probes, 1, "Time zero is a valid cached probe timestamp");
    healthy = false; clock = 5001;
    const failed = await request("/api/healthz"); assert.equal(failed.status, 503);
    assert.equal((await failed.json()).ok, false); assert.equal(probes, 2);
    healthy = true; clock = 10002; block = true;
    const first = request("/api/healthz"); await waiting;
    const concurrent = await request("/api/healthz"); assert.equal(concurrent.status, 503);
    assert.equal(concurrent.headers.get("retry-after"), "5"); assert.equal(probes, 3);
    release?.(); assert.equal((await first).status, 200);
    const log = JSON.stringify(records);
    for (const privateValue of [code, cookie.split(";")[0]!, "PRIVATE_DATABASE_DETAIL", "test-render-operator"]) assert.ok(!log.includes(privateValue));
  } finally {
    release?.(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
