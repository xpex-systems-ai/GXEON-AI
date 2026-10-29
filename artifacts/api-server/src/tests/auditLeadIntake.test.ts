import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import express from "express";
import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "@workspace/db/pool";
import { createLeadIntakeService, validateLeadInput, leadPrivacyVersion, leadStates, type LeadChannel, type LeadPrincipal, type ValidatedLeadEvidence } from "../omnixLeadIntake";
import { omnixLeadIntakeRouter } from "../omnixLeadIntakeRouter";

const secret = () => randomBytes(32).toString("base64url"), origin = "https://leads.example.invalid";
const owner: LeadPrincipal = { userId: "TEST-DATA-owner", organizationId: "TEST-DATA-org", role: "owner" };
const otherOwner: LeadPrincipal = { userId: "TEST-DATA-other", organizationId: "TEST-DATA-other-org", role: "admin" };
const input = (challengeToken = secret()) => ({ requestId: randomUUID(), name: "TEST DATA Contact", company: "TEST DATA Company", email: "contact@example.invalid",
  needType: "configuration-integrity", description: "TEST DATA general configuration integrity inquiry, without technical files.", consent: true, privacyVersion: leadPrivacyVersion, website: "", challengeToken });
async function database() {
  const migration = await readFile(new URL("../../../../lib/db/drizzle/0005_omnix_lead_intake.sql", import.meta.url), "utf8");
  if (process.env.TEST_AUDIT_DATABASE_URL) {
    const target = new URL(process.env.TEST_AUDIT_DATABASE_URL);
    assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname === "/gx01_test" && target.username === "gx01_test" && !target.search && !target.hash);
    const pool = new Pool({ connectionString: process.env.TEST_AUDIT_DATABASE_URL, max: 4, connectionTimeoutMillis: 5000 });
    const schema = "leads_" + randomUUID().replaceAll("-", ""); await pool.query(`CREATE SCHEMA ${schema}`);
    const connect = async () => { const client = await pool.connect(); await client.query(`SET search_path TO ${schema},public`); return client; };
    const query = async (sql: string, params?: unknown[]) => { const client = await connect(); try { return await client.query(sql, params); } finally { client.release(); } };
    await query(migration); return { connect, query, close: () => pool.end() };
  }
  const db = await PGlite.create(); await db.exec(migration); let tail = Promise.resolve();
  const connect = async () => { const previous = tail; let release!: () => void; tail = new Promise<void>(resolve => { release = resolve; }); await previous;
    return { query: async (sql: string, params?: unknown[]) => { const result = await db.query(sql, params); return { rows: result.rows, rowCount: result.affectedRows }; }, release } as unknown as Pick<PoolClient, "query" | "release">; };
  return { connect, query: (sql: string, params?: unknown[]) => db.query(sql, params), close: () => db.close() };
}

test("separate lead contract allows contact-only real shape; synthetic restrictions and all authority/secrets/file exclusions remain explicit", () => {
  const value = input(); assert.deepEqual(validateLeadInput(value, "synthetic"), value);
  const fixtureRealShape = { ...value, name: "Fixture Contact", company: "Fixture Company" };
  assert.deepEqual(validateLeadInput(fixtureRealShape, "real"), fixtureRealShape);
  assert.throws(() => validateLeadInput(fixtureRealShape, "synthetic"), /SYNTHETIC_DATA_REQUIRED/);
  for (const patch of [{ consent: false }, { website: "spam.invalid" }, { recipientUserId: "attacker" }, { organizationId: "attacker" },
    { auditCustomerDataAllowed: true }, { signed: true }, { paymentConfirmed: true }, { artifact: { content: "private" } },
    { description: "password=PRIVATE_VALUE" }, { description: '{"token":"PRIVATE_VALUE"}' }, { description: '{"rewrites":[]}' },
    { description: "postgresql://private-database.invalid" }, { description: "https://name:password@private.invalid" },
    { description: "x".repeat(1001) }, { email: "invalid" }, { challengeToken: "" }, { privacyVersion: "other" }])
    assert.throws(() => validateLeadInput({ ...value, ...patch }, "real"), /LEAD_/);
});

test("lead router defaults closed, authenticates readiness before SQL and sanitizes private storage failures", async () => {
  const token = secret(); let reads = 0;
  const service = createLeadIntakeService(async () => { reads++; throw Error("PRIVATE_DB_PASSWORD"); }, { channelId: randomUUID(), mode: "real", resolveRecipient: async () => owner });
  const app = express(); app.use("/closed", omnixLeadIntakeRouter()); app.use("/leads", omnixLeadIntakeRouter({ service, token, sourceOrigin: origin }));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); const address = server.address(); assert.ok(address && typeof address !== "string");
  try {
    for (const route of ["/closed/status", "/closed/inbox"]) {
      const response: Response = await fetch(`http://127.0.0.1:${address.port}` + route); assert.equal(response.status, 503); assert.equal((await response.json()).leadDataAllowed, false);
    }
    const denied = await fetch(`http://127.0.0.1:${address.port}/leads/status`); assert.equal(denied.status, 401); assert.equal(reads, 0);
    const error = await fetch(`http://127.0.0.1:${address.port}/leads/status`, { headers: { Authorization: "Bearer " + token } });
    assert.equal(error.status, 503); assert.equal(reads, 1); assert.ok(!(await error.text()).includes("PRIVATE_DB_PASSWORD"));
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("lead HTTP/SQL gates, one-use approved anti-spam, idempotent receipts, evidence states and verifiable scoped purge", async () => {
  const db = await database(), channelId = randomUUID(), otherChannelId = randomUUID(), technical = secret(), ownerToken = secret(), otherToken = secret();
  const recipients = new Map<string, LeadPrincipal>([[channelId, owner], [otherChannelId, otherOwner]]), evidence = new Map<string, ValidatedLeadEvidence>();
  const resolveRecipient = async (channel: LeadChannel) => recipients.get(channel.id);
  const service = createLeadIntakeService(db.connect, { channelId, mode: "real", resolveRecipient,
    // Explicit synthetic evidence catalog for tests; no real signature, client,
    // payment, identity-provider or human-delivery verification is claimed.
    resolveEvidence: async (_actor, request) => evidence.get(request.evidenceId) });
  const closed = createLeadIntakeService(db.connect, { channelId, mode: "off", resolveRecipient });
  const unverifiedEvidence = createLeadIntakeService(db.connect, { channelId, mode: "real", resolveRecipient });
  const other = createLeadIntakeService(db.connect, { channelId: otherChannelId, mode: "synthetic", resolveRecipient });
  const app = express(); app.use("/api/omnix-leads", omnixLeadIntakeRouter({ service, token: technical, sourceOrigin: origin,
    authorizeInbox: async request => ({ [ownerToken]: owner, [otherToken]: otherOwner })[(request.get("authorization") ?? "").replace(/^Bearer /, "")] }));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); const address = server.address(); assert.ok(address && typeof address !== "string");
  const call = (route: string, token = technical, body?: unknown, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${address.port}/api/omnix-leads` + route,
    { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer " + token, ...(body === undefined ? {} : { Origin: origin, "Content-Type": "application/json" }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  const seed = async (id: string, principal: LeadPrincipal, mode: string) => db.query(`INSERT INTO omnix_lead_channels
    (id,recipient_user_id,recipient_organization_id,admission_mode,privacy_version,privacy_notice_url,recipient_approval_ref,founder_approval_ref,privacy_approval_ref,durable_database_ref,antispam_approval_ref,approved_at,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,'TEST-DATA/recipient','TEST-DATA/founder','TEST-DATA/privacy','TEST-DATA/isolated-SQL','TEST-DATA/institutional-antispam',now()-interval '1 day',now()+interval '14 days')`,
    [id, principal.userId, principal.organizationId, mode, leadPrivacyVersion, origin + "/privacy"]);
  const matured = async (target = service) => { const result = await target.challenge(); await db.query("UPDATE omnix_lead_challenges SET created_at=now()-interval '3 seconds' WHERE token_sha256 IS NOT NULL AND consumed_at IS NULL"); return result.challengeToken; };
  try {
    await assert.rejects(service.ready(), /APPROVED_CHANNEL_REQUIRED/);
    await seed(channelId, owner, "real"); await seed(otherChannelId, otherOwner, "synthetic");
    await assert.rejects(closed.submit(input()), /ADMISSION_CLOSED/);
    await db.query("UPDATE omnix_lead_channels SET privacy_approval_ref='' WHERE id=$1", [channelId]);
    await assert.rejects(service.ready(), /APPROVED_CHANNEL_REQUIRED/);
    await db.query("UPDATE omnix_lead_channels SET privacy_approval_ref='TEST-DATA/privacy',expires_at=now()-interval '1 second' WHERE id=$1", [channelId]);
    await assert.rejects(service.ready(), /APPROVED_CHANNEL_REQUIRED/);
    await db.query("UPDATE omnix_lead_channels SET expires_at=now()+interval '14 days' WHERE id=$1", [channelId]);
    const ready = await service.ready(); assert.equal(ready.leadDataAllowed, true); assert.equal(ready.auditCustomerDataAllowed, false); assert.equal(ready.retentionDays, 30);
    const challenge = await service.challenge(); const tooSoon = input(challenge.challengeToken);
    await assert.rejects(service.submit(tooSoon), /CHALLENGE_REQUIRED/);
    await db.query("UPDATE omnix_lead_challenges SET created_at=now()-interval '3 seconds'");
    const value = { ...tooSoon, name: "Fixture Contact", company: "Fixture Company" };
    const responses = await Promise.all([call("/requests", technical, value), call("/requests", technical, value)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]); const receipts = await Promise.all(responses.map(r => r.json())), receipt = receipts[0];
    assert.equal(receipt.receiptId, receipts[1].receiptId); assert.equal(receipt.delivery, "QUEUED"); assert.equal(receipt.state, "leadReceived"); assert.equal(receipt.humanDeliveryVerified, false);
    for (const privateValue of [value.name, value.company, value.email, value.description, technical, ownerToken]) assert.ok(!JSON.stringify(receipts).includes(privateValue));
    await assert.rejects(service.submit({ ...value, description: "TEST DATA changed general need for same ID." }), /IDEMPOTENCY_CONFLICT/);
    await assert.rejects(service.submit(input(value.challengeToken)), /CHALLENGE_REQUIRED/);
    assert.equal((await call("/inbox", technical)).status, 401);
    assert.equal((await call("/inbox", otherToken, undefined, { "X-User-Id": owner.userId, "X-Organization-Id": owner.organizationId })).status, 403);
    const inbox = await call("/inbox", ownerToken); assert.equal(inbox.status, 200); assert.equal((await inbox.json()).items[0].email, value.email);
    const acknowledged = await service.acknowledge(owner, receipt.receiptId); assert.equal(acknowledged.delivery, "ACKNOWLEDGED"); assert.equal(acknowledged.humanDeliveryVerified, false);
    const targetKinds = ["proposal-document", "contract-signature-record", "scope-authorization", "canonical-audit-case", "delivery-record", "client-acceptance-record", "payment-receipt-record"];
    const transition = (state: typeof leadStates[number], kind: string) => {
      const evidenceId = randomUUID(), reviewReference = "TEST-DATA/review/" + state;
      evidence.set(evidenceId, { leadId: receipt.receiptId, state: state as Exclude<typeof state, "leadReceived">, evidenceId, reviewReference, kind, sha256: "a".repeat(64),
        reference: "TEST-DATA/evidence/" + evidenceId, authorizedHumanReviewRef: reviewReference, verificationMode: state === "auditInReview" ? "canonical-audit-record" : "authorized-human-record" });
      return { eventId: randomUUID(), state, evidenceId, reviewReference };
    };
    const proposal = transition("proposalPrepared", targetKinds[0]);
    await assert.rejects(unverifiedEvidence.advance(owner, receipt.receiptId, proposal), /VERIFIER_UNAVAILABLE/);
    await assert.rejects(service.advance(owner, receipt.receiptId, { ...proposal, signed: true }), /INVALID_INPUT/);
    await assert.rejects(service.advance(otherOwner, receipt.receiptId, proposal), /INBOX_DENIED/);
    const verifiedProposal = evidence.get(proposal.evidenceId)!;
    evidence.set(proposal.evidenceId, { ...verifiedProposal, authorizedHumanReviewRef: "TEST-DATA/another-review" });
    await assert.rejects(service.advance(owner, receipt.receiptId, proposal), /VALIDATED_HUMAN_EVIDENCE_REQUIRED/);
    evidence.set(proposal.evidenceId, { ...verifiedProposal, sha256: "not-a-hash" });
    await assert.rejects(service.advance(owner, receipt.receiptId, proposal), /VALIDATED_HUMAN_EVIDENCE_REQUIRED/);
    evidence.set(proposal.evidenceId, verifiedProposal);
    await assert.rejects(service.advance(owner, receipt.receiptId, transition("paymentConfirmed", targetKinds[6])), /SEQUENCE_REQUIRED/);
    const firstState = await service.advance(owner, receipt.receiptId, proposal); assert.equal(firstState.state, "proposalPrepared");
    assert.equal((await service.advance(owner, receipt.receiptId, proposal)).reused, true);
    for (let i = 2; i < leadStates.length; i++) {
      const state = leadStates[i], result = await service.advance(owner, receipt.receiptId, transition(state, targetKinds[i - 1]));
      assert.equal(result.state, state); assert.match(result.assurance, /verification are not automated/);
    }
    assert.equal(Number(((await db.query("SELECT count(*)::text AS count FROM omnix_lead_events")).rows[0] as { count: string }).count), 7);
    const otherReceipt = await other.submit(input(await matured(other)));
    await assert.rejects(service.acknowledge(owner, otherReceipt.receiptId), /NOT_FOUND/);
    recipients.delete(channelId); await assert.rejects(service.ready(), /RECIPIENT_UNAVAILABLE/); recipients.set(channelId, owner);
    await db.query("UPDATE omnix_leads SET expires_at=now()-interval '1 day' WHERE id=$1", [receipt.receiptId]);
    assert.equal((await service.inbox(owner)).items.length, 0);
    await assert.rejects(closed.purgeExpired(otherOwner, { confirmLeadRetentionPurge: true, reviewReference: "TEST-DATA/purge" }), /INBOX_DENIED/);
    const purge = await closed.purgeExpired(owner, { confirmLeadRetentionPurge: true, reviewReference: "TEST-DATA/purge" });
    assert.equal(purge.deletedLeads, 1); assert.equal(purge.remainingExpiredLeads, 0);
    assert.equal(Number(((await db.query("SELECT count(*)::text AS count FROM omnix_lead_events")).rows[0] as { count: string }).count), 0);
    assert.equal(Number(((await db.query("SELECT count(*)::text AS count FROM omnix_leads WHERE id=$1", [otherReceipt.receiptId])).rows[0] as { count: string }).count), 1);
    await db.query("UPDATE omnix_lead_challenges SET created_at=now()-interval '2 minutes' WHERE channel_id=$1", [channelId]);
    for (let i = 0; i < 8; i++) await service.challenge();
    await assert.rejects(service.challenge(), /CHALLENGE_RATE_LIMIT/);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await db.close(); }
});
