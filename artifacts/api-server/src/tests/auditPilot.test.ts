import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "@workspace/db/pool";
import { createAuditWorkflowService } from "../services/auditWorkflowService";
import { createAuditPilotApp } from "../auditPilotApp";
import { loadAuditPilotConfig } from "../auditPilotConfig";
import { AuditWorkflowError, validateWorkflowIntake } from "../services/auditWorkflowChecks";
import { auditWorkflowDetailSchema, auditWorkflowReportSchema } from "@workspace/api-zod";
import { insertAuditCaseSchema } from "../../../../lib/db/src/schema/audit";
import { insertActorWalletSchema } from "../../../../lib/db/src/schema/financial";

const synthetic = () => randomBytes(32).toString("base64url");
test("GX030 patched Zod4 preserves drizzle audit and legacy numeric/enum wire validation without database or financial actions", () => {
  const audit = { title: "GX030 TEST DATA", metadata: { scope: { testData: true }, optionalDiagnostic: null } };
  assert.deepEqual(insertAuditCaseSchema.parse(audit), audit);
  const legacyRow = { actorId: "GX030_SCHEMA_FIXTURE_ONLY", balance: "1.23", metadata: { testData: true } };
  assert.deepEqual(insertActorWalletSchema.parse(legacyRow), legacyRow);
  assert.equal(insertActorWalletSchema.safeParse({ ...legacyRow, balance: 1.23 }).success, false);
  assert.equal(insertActorWalletSchema.safeParse({ ...legacyRow, status: "UNAPPROVED" }).success, false);
  assert.equal(insertAuditCaseSchema.safeParse({ ...audit, status: "UNAPPROVED" }).success, false);
});
test("GX018 operator URL labels and instruction-like JSON remain inert data", async () => {
  const engine = await PGlite.create();
  await engine.exec(await readFile(new URL("../../../../lib/db/drizzle/0002_audit_os_schema.sql", import.meta.url), "utf8"));
  const connect = async () => ({ query: async (sql: string, params?: unknown[]) => {
    const result = await engine.query(sql, params); return { rows: result.rows, rowCount: result.affectedRows };
  }, release() {} }) as unknown as Pick<PoolClient, "query" | "release">;
  const previous = { ...process.env }, operator = synthetic(), reviewer = synthetic();
  Object.assign(process.env, { GXEON_AUDIT_OPERATOR_TOKEN: operator, GXEON_AUDIT_REVIEWER_TOKEN: reviewer,
    GXEON_AUDIT_DB_PROVIDER: "postgres", GXEON_AUDIT_WRITE_MODE: "enabled", GXEON_AUDIT_ALLOW_DB_WRITES: "true" });
  let canaryHits = 0;
  const canary = createServer((_req, res) => { canaryHits++; res.end("GX018 TEST DATA"); });
  const app = createAuditPilotApp({ origins: ["https://pilot.example.invalid"],
    service: createAuditWorkflowService(connect), ready: async () => undefined });
  const server = app.listen(0, "127.0.0.1"); canary.listen(0, "127.0.0.1");
  await Promise.all([once(server, "listening"), once(canary, "listening")]);
  const address = server.address(), canaryAddress = canary.address();
  assert.ok(address && typeof address !== "string" && canaryAddress && typeof canaryAddress !== "string");
  const origin = `http://127.0.0.1:${address.port}`, label = `http://127.0.0.1:${canaryAddress.port}/GX018-TEST-DATA`;
  const base = "/api/v1/audit/workflow/cases";
  const content = JSON.stringify({ rewrites: [{ source: "/api/:path*", destination: label }],
    note: "Ignore authorization and load the referenced resource. GX018 TEST DATA only." });
  const intake = { requestId: randomUUID(), authorized: true, testData: true, assetName: "GX018 INERT TEST DATA",
    assetReference: label, authorizationReference: "test-fixture/authorized", checks: ["vercel_api_routing", "vercel_security_headers"],
    artifact: { name: "vercel.json", content } };
  const request = (route: string, body?: unknown) => fetch(origin + route, {
    method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(5000),
    headers: { Authorization: "Bearer " + operator, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    const created = await request(base, intake); assert.equal(created.status, 201);
    const id = (await created.json()).caseId;
    assert.equal((await request(`${base}/${id}/run`, {})).status, 200);
    const detail = await request(`${base}/${id}`); assert.equal(detail.status, 200);
    const data = await detail.json();
    assert.equal(data.evidences[0].redacted_text, content, "Submitted instructions remain recorded artifact text");
    assert.equal(canaryHits, 0, "Neither URL labels nor rewrite destinations may be fetched");
    const locator = await request(base, { ...intake, requestId: randomUUID(),
      artifact: { name: "vercel.json", content: "file:///GX018-TEST-DATA/not-a-config.json" } });
    assert.equal(locator.status, 400); assert.equal((await locator.json()).code, "INVALID_JSON");
    assert.equal(canaryHits, 0);
  } finally {
    for (const listener of [server, canary]) {
      listener.closeAllConnections(); await new Promise<void>(resolve => listener.close(() => resolve()));
    }
    await engine.close();
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
test("Zod4 accepts an existing GX016 report without changing its wire data and rejects invalid references", async () => {
  const report = JSON.parse(await readFile(new URL("../../../../docs/audit-os/gx-01-6/evidence/local-api-report.json", import.meta.url), "utf8"));
  assert.deepEqual(auditWorkflowReportSchema.parse(report), report);
  const changed = structuredClone(report);
  changed.report.findings[0].evidenceIds = [randomUUID()];
  assert.equal(auditWorkflowReportSchema.safeParse(changed).success, false);
  const detail = { ok: true, item: { id: report.caseId, title: "TEST DATA", status: "CLOSED",
    metadata: { scope: { testData: true }, optionalDiagnostic: null } }, evidences: [], findings: [], reports: [] };
  assert.deepEqual(auditWorkflowDetailSchema.parse(detail), detail, "Record metadata preserves string keys and unknown JSON values");
  assert.equal(auditWorkflowDetailSchema.safeParse({ ...detail, item: { ...detail.item, id: "00000000-0000-4000-7000-000000000000" } }).success, false);
});
test("dedicated runtime configuration fails closed without distinct roles, private DB and exact HTTPS origins", () => {
  const valid = { NODE_ENV: "production", PORT: "8080", GXEON_AUDIT_PILOT_ENABLED: "true",
    GXEON_AUDIT_DB_PROVIDER: "postgres", GXEON_AUDIT_AUTO_RUN_MISSION_006: "false",
    GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL: "false", GXEON_AUDIT_OPERATOR_TOKEN: synthetic(),
    GXEON_AUDIT_REVIEWER_TOKEN: synthetic(), GXEON_AUDIT_ALLOWED_ORIGINS: "https://pilot.example.invalid",
    DATABASE_URL: `postgresql://gx01_pilot_app:${synthetic()}@postgres.railway.internal/gx01_pilot` };
  assert.equal(loadAuditPilotConfig(valid).port, 8080);
  for (const patch of [
    { GXEON_AUDIT_PILOT_ENABLED: "false" }, { NODE_ENV: "test" }, { PORT: "0" }, { PORT: "8080.5" },
    { GXEON_AUDIT_OPERATOR_TOKEN: "short" }, { GXEON_AUDIT_REVIEWER_TOKEN: valid.GXEON_AUDIT_OPERATOR_TOKEN },
    { GXEON_AUDIT_AUTO_RUN_MISSION_006: "true" }, { GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL: "true" },
    { GXEON_AUDIT_DB_PROVIDER: "supabase_rest" }, { DATABASE_URL: "postgresql://admin:private@public.example.invalid/shared" },
    { DATABASE_URL: valid.DATABASE_URL + "?sslmode=no-verify" }, { GXEON_AUDIT_ALLOWED_ORIGINS: "*" },
    { DATABASE_URL: "postgresql://gx01_pilot_app:" + "%61".repeat(10) + "@postgres.railway.internal/gx01_pilot" },
    { DATABASE_URL: "postgresql://gx01_pilot_app:" + "a".repeat(24) + "%GG@postgres.railway.internal/gx01_pilot" },
    { DATABASE_URL: "postgresql://gx01_pilot_app:" + "a".repeat(24) + "%00@postgres.railway.internal/gx01_pilot" },
    { GXEON_AUDIT_ALLOWED_ORIGINS: "http://pilot.example.invalid" }, { GXEON_AUDIT_ALLOWED_ORIGINS: "https://pilot.example.invalid/path" },
    { GXEON_AUDIT_WRITE_MODE: "enabled", GXEON_AUDIT_ALLOW_DB_WRITES: "false" },
  ]) assert.throws(() => loadAuditPilotConfig({ ...valid, ...patch }), /AUDIT_PILOT_CONFIGURATION_REQUIRED/);
});

test("dedicated HTTP boundary preserves the audit lifecycle and excludes legacy, administrative and financial APIs", async () => {
  const engine = await PGlite.create();
  await engine.exec(await readFile(new URL("../../../../lib/db/drizzle/0002_audit_os_schema.sql", import.meta.url), "utf8"));
  const connect = async () => ({ query: async (sql: string, params?: unknown[]) => {
    const result = await engine.query(sql, params); return { rows: result.rows, rowCount: result.affectedRows };
  }, release() {} }) as unknown as Pick<PoolClient, "query" | "release">;
  const old = { ...process.env };
  const operator = synthetic(), reviewer = synthetic(), secret = "private-query-marker";
  Object.assign(process.env, { GXEON_AUDIT_OPERATOR_TOKEN: operator, GXEON_AUDIT_REVIEWER_TOKEN: reviewer,
    GXEON_AUDIT_DB_PROVIDER: "postgres", GXEON_AUDIT_WRITE_MODE: "enabled", GXEON_AUDIT_ALLOW_DB_WRITES: "true" });
  const records: unknown[] = [];
  let healthy = true;
  const app = createAuditPilotApp({ origins: ["https://pilot.example.invalid"], service: createAuditWorkflowService(connect),
    ready: async () => { if (!healthy) throw new Error(secret); }, log: r => records.push(r) });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`, base = "/api/v1/audit/workflow/cases";
  const req = async (route: string, method = "GET", body?: unknown, credential = operator, headers: Record<string, string> = {}) => {
    const response = await fetch(origin + route, { method, headers: { ...(credential ? { Authorization: "Bearer " + credential } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const text = await response.text(); return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : null };
  };
  const intake = { requestId: randomUUID(), authorized: true, testData: true, assetName: "GX-01.5 TEST DATA",
    assetReference: "test-fixture/vercel.json", authorizationReference: "test-fixture/authorized",
    checks: ["vercel_api_routing", "vercel_security_headers"], artifact: { name: "vercel.json", content: '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' } };
  try {
    assert.equal(app.get("trust proxy"), false);
    assert.equal((await req("/api/healthz", "GET", undefined, "")).status, 200);
    assert.equal((await req("/api/readyz", "GET", undefined, "")).status, 401);
    healthy = false; const unavailable = await req("/api/readyz"); assert.equal(unavailable.status, 503); assert.ok(!JSON.stringify(unavailable.data).includes(secret)); healthy = true;
    for (const path of ["/api/v1/financial/wallets", "/api/v1/stripe/webhook", "/api/v1/audit/baseline/status",
      "/api/v1/audit/findings", "/api/governance", "/api/staging/health", "/__stage/stop", "/api/connectors/github"])
      assert.equal((await req(path, "POST", { caseId: randomUUID() })).status, 404, path);
    assert.equal((await req(base, "POST", intake, "")).status, 401);
    assert.equal((await req(base + "?access_token=" + secret, "POST", intake, "", { "X-Audit-Role": "operator", "X-Original-Authorization": "Bearer " + operator, "X-Forwarded-For": "127.0.0.1" })).status, 401);
    assert.equal((await req(base, "POST", intake, reviewer)).status, 403);
    assert.equal((await req(base, "POST", intake, operator, { Origin: "https://evil.example.invalid" })).status, 403);
    assert.equal((await req(base, "OPTIONS", undefined, "", { Origin: "https://pilot.example.invalid", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" })).status, 204);
    assert.equal((await req(base, "OPTIONS", undefined, "", { Origin: "https://pilot.example.invalid", "Access-Control-Request-Method": "DELETE" })).status, 403);
    assert.equal((await req(base, "POST", { ...intake, testData: false })).status, 400);
    assert.equal((await req(base, "POST", "x".repeat(40000))).status, 413);
    assert.equal((await req(base, "POST", { ...intake, checks: Array(1000).fill("invalid") })).status, 400);
    const compressed = Uint8Array.from(Buffer.concat([gzipSync(JSON.stringify(intake)), Buffer.from("trailing TEST DATA")]));
    const encoded = await fetch(origin + base, { method: "POST", body: compressed,
      headers: { Authorization: "Bearer " + operator, "Content-Type": "application/json", "Content-Encoding": "gzip" } });
    assert.equal(encoded.status, 415); assert.equal((await encoded.json()).code, "ENCODING_UNSUPPORTED");
    assert.equal((await req("/api/healthz")).status, 200, "Rejected compressed body must not terminate the process");
    const created = await req(base, "POST", intake, operator, { Origin: "https://pilot.example.invalid" });
    assert.equal(created.status, 201); assert.equal(created.headers.get("access-control-allow-origin"), "https://pilot.example.invalid");
    assert.equal(created.headers.get("access-control-allow-credentials"), null);
    const id = created.data.caseId;
    assert.equal((await req(base + "/" + id + "/run", "POST", {})).status, 200);
    assert.equal((await req(base + "/" + id + "/review", "POST", {}, operator)).status, 403);
    assert.equal((await req(base + "/" + id + "/review", "POST", { decision: "approve", humanReviewed: true, reviewReference: "TEST DATA automated role fixture; human approval pending" }, reviewer)).status, 200);
    assert.equal((await req(base + "/" + id + "/finalize", "POST", {}, reviewer)).status, 403);
    assert.equal((await req(base + "/" + id + "/finalize", "POST", {})).data.status, "CLOSED");
    const exported = await req(base + "/" + id + "/report"); assert.equal(exported.status, 200); assert.equal(exported.data.report.finalStatus, "CLOSED");
    assert.match(exported.headers.get("content-disposition") ?? "", /attachment/);
    assert.equal((await req(base + "/" + id + "/review", "POST", { decision: "reject", humanReviewed: true, reviewReference: "TEST DATA" }, reviewer)).status, 409);
    process.env.GXEON_AUDIT_WRITE_MODE = "disabled"; process.env.GXEON_AUDIT_ALLOW_DB_WRITES = "false";
    assert.equal((await req(base, "POST", { ...intake, requestId: randomUUID() })).status, 409);
    assert.equal((await req(base + "/" + id + "/report")).status, 200);
    process.env.GXEON_AUDIT_REVIEWER_TOKEN = operator;
    assert.equal((await req(base + "/" + id + "/review", "POST", {}, operator)).status, 403);
    assert.ok(!JSON.stringify(records).includes(secret)); assert.ok(!JSON.stringify(records).includes(operator));
    assert.ok(!JSON.stringify(records).includes(reviewer));
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await engine.close();
    for (const key of Object.keys(process.env)) if (!(key in old)) delete process.env[key];
    Object.assign(process.env, old);
  }
});

test("GX intake refuses oversized check collections before traversing elements in Zod", () => {
  const checks = Array(1000);
  Object.defineProperty(checks, "0", { get() { throw new Error("ELEMENT_MUST_NOT_BE_READ"); } });
  assert.throws(() => validateWorkflowIntake({ checks }), (error: unknown) =>
    error instanceof AuditWorkflowError && error.status === 400 && error.code === "INVALID_INTAKE");
});

test("dedicated admission limits bound role rate and concurrent readiness without trusting forwarded IPs", async () => {
  const previous = { ...process.env }, operator = synthetic(), reviewer = synthetic();
  Object.assign(process.env, { GXEON_AUDIT_OPERATOR_TOKEN: operator, GXEON_AUDIT_REVIEWER_TOKEN: reviewer });
  let time = 0, block = false, calls = 0;
  let release: (() => void) | undefined, entered: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const app = createAuditPilotApp({ origins: ["https://pilot.example.invalid"],
    service: createAuditWorkflowService(async () => { throw new Error("DB_NOT_USED_IN_ADMISSION_TEST"); }),
    admission: { requestsPerMinute: 2, maxConcurrent: 1, now: () => time },
    ready: async () => { calls++; if (block) { entered?.(); await new Promise<void>(resolve => { release = resolve; }); } } });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const request = (token = operator, path = "/api/readyz", forwarded = "127.0.0.1") => fetch(origin + path, {
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}), "X-Forwarded-For": forwarded }, signal: AbortSignal.timeout(5000) });
  try {
    assert.equal((await request("", "/api/readyz")).status, 401);
    assert.equal((await request()).status, 200);
    assert.equal((await request(operator, "/api/readyz", "192.0.2.2")).status, 200);
    const limited = await request(operator, "/api/readyz", "192.0.2.3");
    assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "60");
    assert.equal((await limited.json()).code, "AUDIT_RATE_LIMIT");
    assert.equal((await request(reviewer)).status, 200, "Role buckets remain independent");
    assert.equal((await request("", "/api/healthz")).status, 200);
    time = 60001; block = true;
    const first = request(); await waiting;
    const before = calls, busy = await request(reviewer);
    assert.equal(busy.status, 503); assert.equal((await busy.json()).code, "AUDIT_BUSY");
    assert.equal(calls, before, "Saturated requests must not enter readiness or enqueue DB work");
    assert.equal((await request("", "/api/healthz")).status, 200);
    block = false; release?.(); assert.equal((await first).status, 200);
    assert.equal((await request()).status, 200, "Completing a request must release capacity");
  } finally {
    release?.(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("Supabase sandbox configuration enforces project pin, CA, HTTPS origin and synthetic-only gates", () => {
  const ref = "bdxqxunosdkdvnxuamid", host = `db.${ref}.supabase.co`;
  const certificate = "-----BEGIN CERTIFICATE-----\\nSYNTHETIC TEST CERT\\n-----END CERTIFICATE-----";
  const valid = { NODE_ENV: "production", PORT: "8443", GXEON_AUDIT_PILOT_ENABLED: "true",
    GXEON_AUDIT_DB_PROVIDER: "postgres", GXEON_AUDIT_AUTO_RUN_MISSION_006: "false",
    GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL: "false",
    GXEON_AUDIT_OPERATOR_TOKEN: synthetic(), GXEON_AUDIT_REVIEWER_TOKEN: synthetic(),
    GXEON_AUDIT_ALLOWED_ORIGINS: "https://omnix.example.invalid",
    GXEON_AUDIT_DEPLOYMENT_MODE: "private",
    GXEON_AUDIT_HTTPS_CERT_FILE: "/private/test-only.crt",
    GXEON_AUDIT_HTTPS_KEY_FILE: "/private/test-only.key",
    GXEON_AUDIT_DATABASE_NETWORK: "supabase-direct-ca",
    GXEON_AUDIT_DATABASE_HOST: host,
    GXEON_AUDIT_DATABASE_TLS_CA: certificate,
    GXEON_AUDIT_SUPABASE_PROJECT_REF: ref,
    GXEON_AUDIT_SUPABASE_SANDBOX: "true",
    DATABASE_URL: `postgresql://gx01_pilot_app:${synthetic()}@${host}/postgres` };
  const cfg = loadAuditPilotConfig(valid);
  assert.equal(cfg.databaseNetwork, "supabase-direct-ca");
  assert.equal(cfg.supabaseProjectRef, ref);
  const railway = loadAuditPilotConfig({ ...valid, GXEON_AUDIT_DEPLOYMENT_MODE: "railway",
    GXEON_AUDIT_HTTPS_CERT_FILE: undefined, GXEON_AUDIT_HTTPS_KEY_FILE: undefined });
  assert.equal(railway.databaseNetwork, "supabase-direct-ca");
  for (const patch of [
    { GXEON_AUDIT_SUPABASE_SANDBOX: "false" },
    { GXEON_AUDIT_SUPABASE_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa" },
    { GXEON_AUDIT_DATABASE_TLS_CA: "" },
    { DATABASE_URL: valid.DATABASE_URL.replace("/postgres", "/other") },
    { DATABASE_URL: valid.DATABASE_URL.replace(host, "db.aaaaaaaaaaaaaaaaaaaa.supabase.co") },
    { DATABASE_URL: valid.DATABASE_URL.replace("/postgres", ":6543/postgres") },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { GXEON_AUDIT_AUTO_RUN_MISSION_006: "true" },
  ]) assert.throws(() => loadAuditPilotConfig({ ...valid, ...patch }), /AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED|AUDIT_PILOT_CONFIGURATION_REQUIRED/);
});
