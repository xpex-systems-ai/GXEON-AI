import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "@workspace/db/pool";

export const leadPrivacyVersion = "gx050-lead-v1";
export const leadStates = ["leadReceived", "proposalPrepared", "contractSigned", "accessAuthorized", "auditInReview", "reportDelivered", "clientAccepted", "paymentConfirmed"] as const;
export type LeadState = typeof leadStates[number];
export type LeadMode = "off" | "synthetic" | "real";
export type LeadPrincipal = { userId: string; organizationId: string; role: "owner" | "admin" };
type Connection = Pick<PoolClient, "query" | "release">;
export type LeadChannel = {
  id: string; recipient_user_id: string; recipient_organization_id: string; admission_mode: Exclude<LeadMode, "off">;
  privacy_version: string; privacy_notice_url: string; recipient_approval_ref: string; founder_approval_ref: string;
  privacy_approval_ref: string; durable_database_ref: string; antispam_approval_ref: string;
};
export type LeadInput = {
  requestId: string; name: string; company: string; email: string;
  needType: "configuration-integrity" | "enterprise-proposal" | "general-question";
  description: string; consent: true; privacyVersion: typeof leadPrivacyVersion; website: ""; challengeToken: string;
};
export type LeadEvidenceRequest = { leadId: string; state: Exclude<LeadState, "leadReceived">; evidenceId: string; reviewReference: string };
export type ValidatedLeadEvidence = LeadEvidenceRequest & {
  kind: string; sha256: string; reference: string; authorizedHumanReviewRef: string;
  verificationMode: "authorized-human-record" | "canonical-audit-record";
};
export type LeadServiceOptions = {
  channelId: string; mode: LeadMode;
  // Must resolve the configured recipient against the canonical active identity
  // and membership records, never user headers or a client-supplied organization.
  resolveRecipient: (channel: LeadChannel, client: Connection) => Promise<LeadPrincipal | undefined>;
  // Default absent: signature/payment/delivery transitions stay unavailable.
  // Adapter must read a scoped evidence record AND its authorized human review.
  resolveEvidence?: (actor: LeadPrincipal, request: LeadEvidenceRequest) => Promise<ValidatedLeadEvidence | undefined>;
};
export class LeadIntakeError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const fail = (status: number, code: string): never => { throw new LeadIntakeError(status, code); };
export const leadUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const token = /^[A-Za-z0-9_-]{43}$/;
const reference = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{7,179}$/;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = /(?:-----BEGIN[^\n]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]{12,}|\b(?:sk_live_|sk_test_|gh[pousr]_|github_pat_)[A-Za-z0-9_]{12,}|\b(?:password|passwd|senha|token|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key|mnemonic|database_url)["']?\s*[:=]\s*["']?\S+|postgres(?:ql)?:\/\/|https?:\/\/[^\s/@:]+:[^\s/@]+@|["'](?:rewrites|headers|routes)["']\s*:)/i;
function keys(value: unknown, expected: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== expected.length || Object.keys(value).some(k => !expected.includes(k))) return fail(400, "LEAD_INVALID_INPUT");
  return value as Record<string, unknown>;
}
export function validateLeadInput(value: unknown, mode: Exclude<LeadMode, "off">): LeadInput {
  const input = keys(value, ["requestId", "name", "company", "email", "needType", "description", "consent", "privacyVersion", "website", "challengeToken"]);
  if (typeof input.requestId !== "string" || !leadUuid.test(input.requestId) || input.consent !== true || input.privacyVersion !== leadPrivacyVersion || input.website !== "" ||
      typeof input.challengeToken !== "string" || !token.test(input.challengeToken) || !["configuration-integrity", "enterprise-proposal", "general-question"].includes(String(input.needType))) return fail(400, "LEAD_INVALID_INPUT");
  const text = (key: string, min: number, max: number) => {
    const raw = input[key];
    if (typeof raw !== "string" || raw.trim().length < min || raw.trim().length > max || Array.from(raw).some(c => {
      const code = c.codePointAt(0)!; return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
    })) return fail(400, "LEAD_INVALID_INPUT");
    return raw.trim();
  };
  const name = text("name", 2, 120), company = text("company", 2, 160), email = text("email", 3, 254), description = text("description", 10, 1000);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(name + company + email) || secret.test([name, company, email, description].join("\n"))) return fail(400, "LEAD_PRIVATE_OR_INVALID_INPUT");
  if (mode === "synthetic" && (!name.startsWith("TEST DATA ") || !company.startsWith("TEST DATA ") || !email.toLowerCase().endsWith("@example.invalid"))) return fail(400, "LEAD_SYNTHETIC_DATA_REQUIRED");
  return { requestId: input.requestId.toLowerCase(), name, company, email, needType: input.needType as LeadInput["needType"], description,
    consent: true, privacyVersion: leadPrivacyVersion, website: "", challengeToken: input.challengeToken };
}
type LeadRow = { id: string; request_id: string; payload_sha256: string; delivery: "QUEUED" | "ACKNOWLEDGED"; commercial_state: LeadState; expires_at: string; data_mode: string };
const rowFields = "id,request_id,payload_sha256,delivery,commercial_state,expires_at,data_mode";
const evidenceKinds: Record<Exclude<LeadState, "leadReceived">, string> = {
  proposalPrepared: "proposal-document", contractSigned: "contract-signature-record", accessAuthorized: "scope-authorization",
  auditInReview: "canonical-audit-case", reportDelivered: "delivery-record", clientAccepted: "client-acceptance-record", paymentConfirmed: "payment-receipt-record",
};
export function createLeadIntakeService(connect: () => Promise<Connection>, options: LeadServiceOptions) {
  if (!leadUuid.test(options.channelId) || !["off", "synthetic", "real"].includes(options.mode)) throw new Error("LEAD_CHANNEL_CONFIGURATION_REQUIRED");
  async function transaction<T>(fn: (client: Connection) => Promise<T>): Promise<T> {
    const client = await connect().catch(() => fail(503, "LEAD_STORAGE_UNAVAILABLE"));
    try {
      await client.query("BEGIN"); await client.query("SET LOCAL statement_timeout='5s'"); await client.query("SET LOCAL lock_timeout='3s'");
      const result = await fn(client); await client.query("COMMIT"); return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (error instanceof LeadIntakeError) throw error;
      return fail(503, "LEAD_STORAGE_UNAVAILABLE");
    } finally { client.release(); }
  }
  async function channel(client: Connection, admission: boolean, actor?: LeadPrincipal) {
    if (!admission && !actor) return fail(403, "LEAD_INBOX_DENIED");
    if (admission && options.mode === "off") return fail(503, "LEAD_ADMISSION_CLOSED");
    const record = (await client.query<LeadChannel>(`SELECT * FROM omnix_lead_channels WHERE id=$1${admission ? " AND admission_mode=$2 AND approved_at<=now() AND expires_at>now()" : ""}`,
      admission ? [options.channelId, options.mode] : [options.channelId])).rows[0];
    if (!record) return fail(503, "LEAD_APPROVED_CHANNEL_REQUIRED");
    const recipient = await options.resolveRecipient(record, client).catch(() => undefined);
    if (!recipient || !["owner", "admin"].includes(recipient.role) || recipient.userId !== record.recipient_user_id || recipient.organizationId !== record.recipient_organization_id) return fail(503, "LEAD_RECIPIENT_UNAVAILABLE");
    if (actor && (actor.userId !== recipient.userId || actor.organizationId !== recipient.organizationId || !["owner", "admin"].includes(actor.role))) return fail(403, "LEAD_INBOX_DENIED");
    if (admission) {
      let notice: URL; try { notice = new URL(record.privacy_notice_url); } catch { return fail(503, "LEAD_APPROVED_CHANNEL_REQUIRED"); }
      if (record.privacy_version !== leadPrivacyVersion || notice.protocol !== "https:" || notice.username || notice.password || notice.hash || record.privacy_notice_url.length > 500 ||
          ![record.recipient_approval_ref, record.founder_approval_ref, record.privacy_approval_ref, record.durable_database_ref, record.antispam_approval_ref].every(value => reference.test(value))) return fail(503, "LEAD_APPROVED_CHANNEL_REQUIRED");
    }
    return record;
  }
  const receipt = (row: LeadRow, reused: boolean) => ({ ok: true as const, receiptId: row.id, requestId: row.request_id, delivery: row.delivery,
    recipientAcknowledged: row.delivery === "ACKNOWLEDGED", state: row.commercial_state, reused, dataMode: row.data_mode,
    auditCustomerDataAllowed: false as const, humanDeliveryVerified: false as const, expiresAt: row.expires_at });
  const existing = async (client: Connection, input: LeadInput) => (await client.query<LeadRow>(`SELECT ${rowFields} FROM omnix_leads WHERE request_id=$1 AND channel_id=$2 AND expires_at>now() FOR UPDATE`, [input.requestId, options.channelId])).rows[0];
  return {
    ready: () => transaction(async client => {
      const row = await channel(client, true);
      await client.query("SELECT id FROM omnix_leads WHERE false");
      return { ok: true as const, persistenceReady: true as const, leadDataAllowed: row.admission_mode === "real", dataMode: row.admission_mode,
        auditCustomerDataAllowed: false as const, humanDeliveryVerified: false as const, privacyVersion: leadPrivacyVersion,
        privacyNoticeUrl: row.privacy_notice_url, retentionDays: 30, antiSpam: "approved-institutional-challenge-v1" };
    }),
    challenge: () => transaction(async client => {
      await channel(client, true);
      // Serialize the shared channel's challenge budget across processes.
      await client.query("LOCK TABLE omnix_lead_challenges IN SHARE ROW EXCLUSIVE MODE");
      await client.query("DELETE FROM omnix_lead_challenges WHERE channel_id=$1 AND expires_at<=now()", [options.channelId]);
      const count = (await client.query<{ count: string }>("SELECT count(*)::text AS count FROM omnix_lead_challenges WHERE channel_id=$1 AND created_at>now()-interval '1 minute'", [options.channelId])).rows[0];
      if (Number(count.count) >= 8) return fail(429, "LEAD_CHALLENGE_RATE_LIMIT");
      const value = randomBytes(32).toString("base64url");
      await client.query("INSERT INTO omnix_lead_challenges(token_sha256,channel_id) VALUES($1,$2)", [sha(value), options.channelId]);
      return { ok: true as const, challengeToken: value, minimumWaitMs: 2000, expiresInSeconds: 300 };
    }),
    submit: (value: unknown) => {
      if (options.mode === "off") return Promise.reject(new LeadIntakeError(503, "LEAD_ADMISSION_CLOSED"));
      const input = validateLeadInput(value, options.mode), { challengeToken: challenge, ...fields } = input, fingerprint = sha(JSON.stringify(fields));
      return transaction(async client => {
        const approved = await channel(client, true), previous = await existing(client, input);
        if (previous) {
          if (previous.payload_sha256 !== fingerprint) return fail(409, "LEAD_IDEMPOTENCY_CONFLICT");
          return receipt(previous, true);
        }
        const consumed = await client.query(`UPDATE omnix_lead_challenges SET consumed_at=now() WHERE token_sha256=$1 AND channel_id=$2
          AND consumed_at IS NULL AND created_at<=now()-interval '2 seconds' AND expires_at>now() RETURNING token_sha256`, [sha(challenge), options.channelId]);
        if (!consumed.rows.length) {
          const raced = await existing(client, input);
          if (raced?.payload_sha256 === fingerprint) return receipt(raced, true);
          return fail(400, "LEAD_CHALLENGE_REQUIRED");
        }
        const inserted = await client.query<LeadRow>(`INSERT INTO omnix_leads(request_id,channel_id,payload_sha256,interested_name,company,contact_email,need_type,general_description,privacy_version,data_mode)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(request_id) DO NOTHING RETURNING ${rowFields}`,
          [input.requestId, options.channelId, fingerprint, input.name, input.company, input.email, input.needType, input.description, leadPrivacyVersion, approved.admission_mode]);
        const row = inserted.rows[0] ?? await existing(client, input);
        if (!row || row.payload_sha256 !== fingerprint) return fail(409, "LEAD_IDEMPOTENCY_CONFLICT");
        return receipt(row, !inserted.rows.length);
      });
    },
    inbox: (actor: LeadPrincipal) => transaction(async client => {
      await channel(client, false, actor);
      return { ok: true as const, items: (await client.query(`SELECT id,request_id,interested_name AS name,company,contact_email AS email,need_type,general_description,
        privacy_version,consented_at,data_mode,delivery,commercial_state,created_at,acknowledged_at,expires_at FROM omnix_leads
        WHERE channel_id=$1 AND expires_at>now() ORDER BY created_at DESC,id DESC LIMIT 25`, [options.channelId])).rows };
    }),
    acknowledge: (actor: LeadPrincipal, leadId: string) => transaction(async client => {
      if (!leadUuid.test(leadId)) return fail(400, "LEAD_INVALID_INPUT");
      await channel(client, false, actor);
      const row = (await client.query<LeadRow>(`UPDATE omnix_leads SET delivery='ACKNOWLEDGED',acknowledged_at=COALESCE(acknowledged_at,now())
        WHERE id=$1 AND channel_id=$2 AND expires_at>now() RETURNING ${rowFields}`, [leadId, options.channelId])).rows[0];
      if (!row) return fail(404, "LEAD_NOT_FOUND"); return receipt(row, false);
    }),
    advance: (actor: LeadPrincipal, leadId: string, value: unknown) => transaction(async client => {
      await channel(client, false, actor);
      const input = keys(value, ["eventId", "state", "evidenceId", "reviewReference"]);
      if (!leadUuid.test(leadId) || typeof input.eventId !== "string" || !leadUuid.test(input.eventId) || typeof input.evidenceId !== "string" || !leadUuid.test(input.evidenceId) ||
          typeof input.reviewReference !== "string" || !reference.test(input.reviewReference) || !leadStates.slice(1).includes(input.state as Exclude<LeadState, "leadReceived">)) return fail(400, "LEAD_INVALID_STATE_EVIDENCE");
      const row = (await client.query<LeadRow>(`SELECT ${rowFields} FROM omnix_leads WHERE id=$1 AND channel_id=$2 AND expires_at>now() FOR UPDATE`, [leadId, options.channelId])).rows[0];
      if (!row) return fail(404, "LEAD_NOT_FOUND");
      if (!options.resolveEvidence) return fail(503, "LEAD_EVIDENCE_VERIFIER_UNAVAILABLE");
      const state = input.state as Exclude<LeadState, "leadReceived">;
      const request: LeadEvidenceRequest = { leadId, state, evidenceId: input.evidenceId, reviewReference: input.reviewReference };
      const proof = await options.resolveEvidence(actor, request).catch(() => undefined);
      if (!proof || proof.leadId !== leadId || proof.state !== state || proof.evidenceId !== request.evidenceId || proof.reviewReference !== request.reviewReference ||
          proof.kind !== evidenceKinds[state] || !/^[a-f0-9]{64}$/.test(proof.sha256) || !reference.test(proof.reference) || !reference.test(proof.authorizedHumanReviewRef) ||
          proof.authorizedHumanReviewRef !== request.reviewReference || proof.verificationMode !== (state === "auditInReview" ? "canonical-audit-record" : "authorized-human-record")) return fail(403, "LEAD_VALIDATED_HUMAN_EVIDENCE_REQUIRED");
      const prior = (await client.query<{ id: string }>("SELECT id FROM omnix_lead_events WHERE lead_id=$1 AND target_state=$2 AND evidence_id=$3 AND evidence_sha256=$4 AND authorized_human_review_ref=$5", [leadId, state, proof.evidenceId, proof.sha256, proof.authorizedHumanReviewRef])).rows[0];
      if (prior && row.commercial_state === state) return { ok: true as const, state, reused: true, eventId: prior.id, assurance: "authorized-evidence-record; signature and payment-network verification are not automated" };
      if (leadStates.indexOf(state) !== leadStates.indexOf(row.commercial_state) + 1) return fail(409, "LEAD_STATE_SEQUENCE_REQUIRED");
      await client.query(`INSERT INTO omnix_lead_events(id,lead_id,target_state,actor_user_id,actor_organization_id,evidence_id,evidence_kind,evidence_sha256,evidence_reference,authorized_human_review_ref,verification_mode)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [input.eventId, leadId, state, actor.userId, actor.organizationId, proof.evidenceId, proof.kind, proof.sha256, proof.reference, proof.authorizedHumanReviewRef, proof.verificationMode]);
      await client.query("UPDATE omnix_leads SET commercial_state=$1 WHERE id=$2 AND channel_id=$3", [state, leadId, options.channelId]);
      return { ok: true as const, state, reused: false, eventId: input.eventId, assurance: "authorized-evidence-record; signature and payment-network verification are not automated" };
    }),
    purgeExpired: (actor: LeadPrincipal, value: unknown) => transaction(async client => {
      await channel(client, false, actor);
      const input = keys(value, ["confirmLeadRetentionPurge", "reviewReference"]);
      if (input.confirmLeadRetentionPurge !== true || typeof input.reviewReference !== "string" || !reference.test(input.reviewReference)) return fail(400, "LEAD_PURGE_CONFIRMATION_REQUIRED");
      const deleted = await client.query("DELETE FROM omnix_leads WHERE channel_id=$1 AND expires_at<=now() RETURNING id", [options.channelId]);
      const remaining = (await client.query<{ count: string }>("SELECT count(*)::text AS count FROM omnix_leads WHERE channel_id=$1 AND expires_at<=now()", [options.channelId])).rows[0];
      if (Number(remaining.count) !== 0) return fail(503, "LEAD_PURGE_NOT_VERIFIED");
      await client.query("DELETE FROM omnix_lead_challenges WHERE channel_id=$1 AND expires_at<=now()", [options.channelId]);
      await client.query("DELETE FROM omnix_lead_purge_receipts WHERE channel_id=$1 AND created_at<now()-interval '90 days'", [options.channelId]);
      const proof = (await client.query<{ id: string; created_at: string }>(`INSERT INTO omnix_lead_purge_receipts(channel_id,actor_user_id,review_reference,deleted_leads,remaining_expired_leads)
        VALUES($1,$2,$3,$4,0) RETURNING id,created_at`, [options.channelId, actor.userId, input.reviewReference, deleted.rows.length])).rows[0];
      return { ok: true as const, purgeReceiptId: proof.id, deletedLeads: deleted.rows.length, remainingExpiredLeads: 0, checkedAt: proof.created_at };
    }),
  };
}
export type LeadIntakeService = ReturnType<typeof createLeadIntakeService>;
