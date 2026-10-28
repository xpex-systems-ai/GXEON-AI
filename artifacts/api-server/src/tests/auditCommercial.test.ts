import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import express from "express";
import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "@workspace/db/pool";
import { createCommercialService, omnixCommercialRouter, validateCommercialIntake, commercialPrivacyVersion, type CommercialRecipient } from "../omnixCommercial";

const secret = () => randomBytes(32).toString("base64url"), origin = "https://commercial.example.invalid";
const recipient = { userId: "test-commercial-owner", organizationId: "test-commercial-org" }, actor = { ...recipient, role: "owner" as const };
const intake = () => ({ requestId: randomUUID(), name: "TEST DATA Interessado", company: "TEST DATA Empresa", email: "interessado@example.invalid",
  problem: "TEST DATA — avaliar o roteamento de um projeto Vercel autorizado.", consent: true, privacyVersion: commercialPrivacyVersion, website: "", testData: true });
async function database() {
  const schema = "commercial_" + randomUUID().replaceAll("-", "");
  const migration = await readFile(new URL("../../../../lib/db/drizzle/0004_omnix_commercial_intake.sql", import.meta.url), "utf8");
  if (process.env.TEST_AUDIT_DATABASE_URL) {
    const target = new URL(process.env.TEST_AUDIT_DATABASE_URL);
    assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname === "/gx01_test" &&
      target.username === "gx01_test" && !target.search && !target.hash, "Isolated loopback CI database required");
    const pool = new Pool({ connectionString: process.env.TEST_AUDIT_DATABASE_URL, max: 4, connectionTimeoutMillis: 5000 });
    await pool.query(`CREATE SCHEMA ${schema}`);
    const connect = async () => { const client = await pool.connect(); await client.query(`SET search_path TO ${schema},public`); return client; };
    const client = await connect(); try { await client.query(migration); } finally { client.release(); }
    return { connect, query: async (sql: string, params?: unknown[]) => { const client = await connect(); try { return await client.query(sql, params); } finally { client.release(); } }, close: () => pool.end() };
  }
  const engine = await PGlite.create(); await engine.exec(migration);
  // PGlite exposes one SQL session. Serialize transactions, as a single-client
  // database must; the PostgreSQL branch above exercises actual concurrent clients.
  let tail = Promise.resolve();
  const connect = async () => {
    const previous = tail; let release!: () => void; tail = new Promise<void>(resolve => { release = resolve; }); await previous;
    return { query: async (sql: string, params?: unknown[]) => { const result = await engine.query(sql, params); return { rows: result.rows, rowCount: result.affectedRows }; }, release } as unknown as Pick<PoolClient, "query" | "release">;
  };
  return { connect, query: (sql: string, params?: unknown[]) => engine.query(sql, params), close: () => engine.close() };
}
test("commercial contract requires consent, synthetic contacts, bounded general need and no secrets/files/authority fields", () => {
  const value = intake(); assert.deepEqual(validateCommercialIntake(value), value);
  for (const patch of [{ testData: false }, { consent: false }, { website: "spam.invalid" }, { email: "real@example.com" },
    { name: "Actual person" }, { company: "Actual company" }, { problem: "password=PRIVATE_VALUE" }, { problem: '{"password":"secret"}' },
    { problem: "TEST DATA https://user:secret@fixture.invalid" },
    { problem: '{"rewrites":[{"source":"/api","destination":"https://fixture.invalid"}]}' }, { problem: "x".repeat(1001) },
    { organizationId: "another-org" }, { recipientUserId: "attacker" }, { artifact: { content: "not accepted" } }, { requestId: "not-a-uuid" }])
    assert.throws(() => validateCommercialIntake({ ...value, ...patch }), /COMMERCIAL_|INVALID_COMMERCIAL_REQUEST/);
});

test("synthetic commercial SQL/HTTP receipt is persisted/idempotent; distinct recipient ACK and expiry stay scoped", async () => {
  const db = await database(), technicalToken = secret(), ownerToken = secret(), otherToken = secret(); let clock = 0;
  const service = createCommercialService(db.connect, recipient), otherRecipient = { userId: "test-other-owner", organizationId: "test-other-org" };
  const otherService = createCommercialService(db.connect, otherRecipient);
  const principals = new Map<string, CommercialRecipient>([[ownerToken, actor], [otherToken, { ...otherRecipient, role: "admin" }]]);
  const app = express(); app.use("/api/omnix-commercial", omnixCommercialRouter({ service, token: technicalToken, sourceOrigin: origin, now: () => clock,
    // Explicit synthetic principal resolver for this test. Production uses the
    // per-request verified enterprise identity adapter supplied by the runtime.
    authorizeInbox: async req => principals.get((req.get("authorization") ?? "").replace(/^Bearer /, "")) }));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path: string, token = technicalToken, body?: unknown, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${address.port}/api/omnix-commercial` + path, {
    method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer " + token, ...(body === undefined ? {} : { "Content-Type": "application/json", Origin: origin }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  try {
    assert.equal((await request("/status", "")).status, 401);
    const status = await request("/status"); assert.equal(status.status, 200); const state = await status.json();
    assert.equal(state.humanDeliveryVerified, false); assert.equal(state.customerDataAllowed, false); assert.equal(state.syntheticOnly, true);
    const value = intake(), responses = await Promise.all([request("/requests", technicalToken, value), request("/requests", technicalToken, value)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]); const receipts = await Promise.all(responses.map(r => r.json()));
    assert.equal(receipts[0].receiptId, receipts[1].receiptId); assert.equal(receipts[0].delivery, "QUEUED"); assert.equal(receipts[0].recipientAcknowledged, false);
    const serialized = JSON.stringify(receipts); for (const privateField of [value.email, value.problem, value.name, technicalToken, ownerToken]) assert.ok(!serialized.includes(privateField));
    assert.equal(Number(((await db.query("SELECT count(*) AS count FROM omnix_commercial_requests")).rows[0] as { count: number | string }).count), 1);
    assert.equal((await request("/requests", technicalToken, { ...value, problem: "TEST DATA — outra necessidade geral para o mesmo identificador." })).status, 409);
    assert.equal((await request("/inbox", technicalToken)).status, 401);
    assert.equal((await request("/inbox", otherToken, undefined, { "X-Organization-Id": recipient.organizationId, "X-User-Id": recipient.userId })).status, 403);
    const inbox = await request("/inbox", ownerToken); assert.equal(inbox.status, 200); assert.equal((await inbox.json()).items[0].email, value.email);
    const other = await otherService.submit(intake());
    assert.equal((await request(`/requests/${other.receiptId}/ack`, ownerToken, {})).status, 404);
    assert.equal((await request(`/requests/${receipts[0].receiptId}/ack`, otherToken, {})).status, 403);
    const acknowledged = await request(`/requests/${receipts[0].receiptId}/ack`, ownerToken, {});
    assert.equal(acknowledged.status, 200); assert.equal((await acknowledged.json()).delivery, "ACKNOWLEDGED");
    clock = 60001;
    assert.equal((await request("/requests", technicalToken, { ...intake(), testData: false })).status, 400);
    assert.equal((await request("/requests", technicalToken, { ...intake(), problem: "TEST DATA password=TOP_SECRET_DO_NOT_RETURN" })).status, 400);
    assert.equal((await request("/requests", technicalToken, intake(), { Origin: "https://unapproved.invalid" })).status, 403);
    await db.query("UPDATE omnix_commercial_requests SET expires_at=now()-interval '1 minute'");
    const purge = await request("/inbox/purge-expired", ownerToken, { confirmSyntheticExpiry: true });
    assert.equal(purge.status, 200); assert.equal((await purge.json()).deletedSyntheticRequests, 1);
    assert.equal(Number(((await db.query("SELECT count(*) AS count FROM omnix_commercial_requests")).rows[0] as { count: number | string }).count), 1, "Other recipient data must survive cleanup");
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await db.close(); }
});

test("commercial readiness auth/cache and SQL failure refuse receipts without exposing private errors", async () => {
  let clock = 0, connections = 0;
  const marker = "PRIVATE_DATABASE_URL_OR_CONNECTION_DETAILS", token = secret();
  const service = createCommercialService(async () => { connections++; throw new Error(marker); }, recipient);
  const app = express(); app.use(omnixCommercialRouter({ service, token, sourceOrigin: origin, now: () => clock, authorizeInbox: async () => undefined }));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path: string, auth = token, body?: unknown) => fetch(`http://127.0.0.1:${address.port}` + path, { method: body === undefined ? "GET" : "POST", headers: {
    Authorization: "Bearer " + auth, ...(body === undefined ? {} : { "Content-Type": "application/json", Origin: origin }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    assert.equal((await request("/status", "")).status, 401); assert.equal(connections, 0);
    for (let n = 0; n < 3; n++) { const response = await request("/status"); assert.equal(response.status, 503); assert.ok(!(await response.text()).includes(marker)); }
    assert.equal(connections, 1, "Readiness at time zero must be cached for five seconds");
    const response = await request("/requests", token, intake()); assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes(marker)); clock = 5001; await request("/status"); assert.equal(connections, 3);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
