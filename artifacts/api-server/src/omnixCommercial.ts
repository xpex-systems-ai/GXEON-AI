import { Router, json, type ErrorRequestHandler, type Request } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "@workspace/db/pool";

export const commercialPrivacyVersion = "gx040-commercial-v1";
export type CommercialIntake = {
  requestId: string; name: string; company: string; email: string; problem: string;
  consent: true; privacyVersion: typeof commercialPrivacyVersion; website: ""; testData: true;
};
export type CommercialRecipient = { userId: string; organizationId: string; role: "owner" | "admin" };
type Connection = Pick<PoolClient, "query" | "release">;
type ReceiptRow = { id: string; request_id: string; payload_sha256: string; delivery: "QUEUED" | "ACKNOWLEDGED"; created_at: string; acknowledged_at: string | null };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const id = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,179}$/;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export class CommercialError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const fail = (status: number, code: string): never => { throw new CommercialError(status, code); };
const secretPattern = /(?:-----BEGIN[^\n]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]{12,}|\b(?:sk_live_|sk_test_|gh[pousr]_|github_pat_)[A-Za-z0-9_]{12,}|\b(?:password|passwd|senha|token|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key|mnemonic|database_url)["']?\s*[:=]\s*["']?\S+|postgres(?:ql)?:\/\/|https?:\/\/[^\s/@:]+:[^\s/@]+@|["'](?:rewrites|headers|routes)["']\s*:)/i;
export function validateCommercialIntake(value: unknown): CommercialIntake {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(400, "INVALID_COMMERCIAL_REQUEST");
  const input = value as Record<string, unknown>, keys = ["requestId", "name", "company", "email", "problem", "consent", "privacyVersion", "website", "testData"];
  if (Object.keys(input).length !== keys.length || Object.keys(input).some(key => !keys.includes(key)) ||
      input.consent !== true || input.privacyVersion !== commercialPrivacyVersion || input.website !== "" || input.testData !== true ||
      typeof input.requestId !== "string" || !uuid.test(input.requestId)) return fail(400, "INVALID_COMMERCIAL_REQUEST");
  const text = (key: string, min: number, max: number) => {
    const raw = input[key];
    if (typeof raw !== "string" || raw.trim().length < min || raw.trim().length > max || Array.from(raw).some(c => {
      const code = c.codePointAt(0)!; return code < 32 && ![9, 10, 13].includes(code);
    })) return fail(400, "INVALID_COMMERCIAL_REQUEST");
    return raw.trim();
  };
  const name = text("name", 2, 120), company = text("company", 2, 160), email = text("email", 3, 254), problem = text("problem", 10, 1000);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(name + company + email)) return fail(400, "INVALID_COMMERCIAL_REQUEST");
  if (!name.startsWith("TEST DATA ") || !company.startsWith("TEST DATA ") || !email.toLowerCase().endsWith("@example.invalid"))
    return fail(400, "COMMERCIAL_REQUIRES_SYNTHETIC_DATA");
  if (secretPattern.test([name, company, email, problem].join("\n"))) return fail(400, "COMMERCIAL_PRIVATE_CONTENT_DENIED");
  return { requestId: input.requestId, name, company, email, problem, consent: true,
    privacyVersion: commercialPrivacyVersion, website: "", testData: true };
}

export function createCommercialService(connect: () => Promise<Connection>, recipient: Pick<CommercialRecipient, "userId" | "organizationId">) {
  if (!id.test(recipient.userId) || !id.test(recipient.organizationId)) throw new Error("COMMERCIAL_RECIPIENT_CONFIGURATION_REQUIRED");
  const authorize = (actor: CommercialRecipient) => {
    if (!actor || !["owner", "admin"].includes(actor.role) || actor.userId !== recipient.userId || actor.organizationId !== recipient.organizationId)
      return fail(403, "COMMERCIAL_INBOX_DENIED");
  };
  async function transaction<T>(fn: (client: Connection) => Promise<T>): Promise<T> {
    const client = await connect().catch(() => fail(503, "COMMERCIAL_STORAGE_UNAVAILABLE"));
    try {
      await client.query("BEGIN"); await client.query("SET LOCAL statement_timeout = '5s'"); await client.query("SET LOCAL lock_timeout = '3s'");
      const result = await fn(client); await client.query("COMMIT"); return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (error instanceof CommercialError) throw error;
      return fail(503, "COMMERCIAL_STORAGE_UNAVAILABLE");
    } finally { client.release(); }
  }
  const receipt = (row: ReceiptRow, reused: boolean) => ({ ok: true as const, receiptId: row.id, requestId: row.request_id,
    delivery: row.delivery, recipientAcknowledged: row.delivery === "ACKNOWLEDGED", reused, testData: true as const, customerDataAllowed: false as const });
  return {
    ready: () => transaction(async client => {
      await client.query("SELECT id, request_id, delivery, expires_at FROM omnix_commercial_requests WHERE false");
    }),
    submit: (value: unknown) => transaction(async client => {
      const input = validateCommercialIntake(value), fingerprint = digest(JSON.stringify(input));
      const inserted = await client.query<ReceiptRow>(`INSERT INTO omnix_commercial_requests
        (request_id,payload_sha256,interested_name,company,contact_email,general_problem,privacy_version,recipient_user_id,recipient_organization_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (request_id) DO NOTHING RETURNING id,request_id,payload_sha256,delivery,created_at,acknowledged_at`,
      [input.requestId, fingerprint, input.name, input.company, input.email, input.problem, input.privacyVersion, recipient.userId, recipient.organizationId]);
      const row = inserted.rows[0] ?? (await client.query<ReceiptRow>(`SELECT id,request_id,payload_sha256,delivery,created_at,acknowledged_at
        FROM omnix_commercial_requests WHERE request_id=$1 AND recipient_user_id=$2 AND recipient_organization_id=$3 AND expires_at>now() FOR UPDATE`,
      [input.requestId, recipient.userId, recipient.organizationId])).rows[0];
      if (!row || row.payload_sha256 !== fingerprint) return fail(409, "COMMERCIAL_IDEMPOTENCY_CONFLICT");
      return receipt(row, inserted.rows.length === 0);
    }),
    list: (actor: CommercialRecipient) => {
      authorize(actor);
      return transaction(async client => ({ ok: true as const, testData: true as const, items: (await client.query(`SELECT id,request_id,interested_name AS name,
        company,contact_email AS email,general_problem AS problem,privacy_version,consented_at,delivery,created_at,acknowledged_at,expires_at
        FROM omnix_commercial_requests WHERE recipient_user_id=$1 AND recipient_organization_id=$2 AND expires_at>now() ORDER BY created_at DESC,id DESC LIMIT 25`,
      [recipient.userId, recipient.organizationId])).rows }));
    },
    acknowledge: (actor: CommercialRecipient, receiptId: string) => {
      authorize(actor); if (!uuid.test(receiptId)) return fail(400, "INVALID_COMMERCIAL_RECEIPT");
      return transaction(async client => {
        const row = (await client.query<ReceiptRow>(`UPDATE omnix_commercial_requests SET delivery='ACKNOWLEDGED',acknowledged_at=COALESCE(acknowledged_at,now())
          WHERE id=$1 AND recipient_user_id=$2 AND recipient_organization_id=$3 AND expires_at>now()
          RETURNING id,request_id,payload_sha256,delivery,created_at,acknowledged_at`, [receiptId, recipient.userId, recipient.organizationId])).rows[0];
        if (!row) return fail(404, "COMMERCIAL_RECEIPT_NOT_FOUND"); return receipt(row, false);
      });
    },
    purgeExpired: (actor: CommercialRecipient) => {
      authorize(actor);
      return transaction(async client => ({ ok: true as const, deletedSyntheticRequests: (await client.query(
        "DELETE FROM omnix_commercial_requests WHERE recipient_user_id=$1 AND recipient_organization_id=$2 AND test_data=true AND expires_at<=now() RETURNING id",
        [recipient.userId, recipient.organizationId])).rows.length }));
    },
  };
}
export type CommercialService = ReturnType<typeof createCommercialService>;
export type CommercialRouterOptions = {
  service: CommercialService; token: string; sourceOrigin: string;
  authorizeInbox: (request: Request) => Promise<CommercialRecipient | undefined>;
  now?: () => number;
};
export function omnixCommercialRouter(options: CommercialRouterOptions) {
  const { service } = options, router = Router(), now = options.now ?? (() => performance.now());
  let origin: URL; try { origin = new URL(options.sourceOrigin); } catch { throw new Error("COMMERCIAL_ORIGIN_CONFIGURATION_REQUIRED"); }
  if (origin.protocol !== "https:" || origin.origin !== options.sourceOrigin || origin.username || origin.password || !/^[A-Za-z0-9_-]{43,128}$/.test(options.token))
    throw new Error("COMMERCIAL_ORIGIN_CONFIGURATION_REQUIRED");
  const expected = Buffer.from(digest(options.token), "hex");
  let started = now(), attempts = 0, active = 0, healthAt: number | undefined, healthy = false, probing = false;
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    if (!["GET", "POST"].includes(req.method)) { res.status(405).json({ ok: false, code: "COMMERCIAL_METHOD_DENIED" }); return; }
    if (req.method === "POST" && req.get("origin") !== options.sourceOrigin) { res.status(403).json({ ok: false, code: "COMMERCIAL_ORIGIN_DENIED" }); return; }
    if (req.method === "POST" && (!req.is("application/json") || (req.get("content-encoding") && req.get("content-encoding") !== "identity"))) {
      res.status(415).json({ ok: false, code: "COMMERCIAL_JSON_REQUIRED" }); return;
    }
    next();
  });
  const technical: import("express").RequestHandler = (req, res, next) => {
    const header = req.get("authorization") ?? "", token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(token) || !timingSafeEqual(Buffer.from(digest(token), "hex"), expected)) {
      res.status(401).json({ ok: false, code: "COMMERCIAL_TECHNICAL_AUTH_REQUIRED" }); return;
    }
    next();
  };
  const admit: import("express").RequestHandler = (_req, res, next) => {
    if (now() - started >= 60000) { started = now(); attempts = 0; }
    if (++attempts > 10 || active >= 2) { res.setHeader("Retry-After", "60"); res.status(429).json({ ok: false, code: "COMMERCIAL_RATE_LIMIT" }); return; }
    active++; let released = false; const release = () => { if (!released) { active--; released = true; } };
    res.once("close", release); res.once("finish", release); next();
  };
  router.get("/status", technical, async (_req, res) => {
    if (probing) { res.status(503).json({ ok: false, code: "COMMERCIAL_NOT_READY" }); return; }
    if (healthAt === undefined || now() - healthAt >= 5000) {
      probing = true; try { await service.ready(); healthy = true; } catch { healthy = false; }
      finally { healthAt = now(); probing = false; }
    }
    res.status(healthy ? 200 : 503).json({ ok: healthy, configured: true, persistenceReady: healthy,
      syntheticOnly: true, customerDataAllowed: false, humanDeliveryVerified: false, privacyVersion: commercialPrivacyVersion });
  });
  router.post("/requests", technical, admit, json({ limit: "4kb", strict: true, inflate: false }), async (req, res) => {
    const receipt = await service.submit(req.body); res.status(receipt.reused ? 200 : 201).json(receipt);
  });
  const inbox: import("express").RequestHandler = async (req, res, next) => {
    const actor = await options.authorizeInbox(req).catch(() => undefined);
    if (!actor) { res.status(401).json({ ok: false, code: "COMMERCIAL_INBOX_AUTH_REQUIRED" }); return; }
    res.locals.commercialActor = actor; next();
  };
  router.get("/inbox", inbox, admit, async (_req, res) => res.json(await service.list(res.locals.commercialActor)));
  router.post("/requests/:receiptId/ack", inbox, admit, json({ limit: "1kb", strict: true, inflate: false }), async (req, res) => {
    if (!req.body || Object.keys(req.body).length) return fail(400, "INVALID_COMMERCIAL_REQUEST");
    res.json(await service.acknowledge(res.locals.commercialActor, String(req.params.receiptId)));
  });
  router.post("/inbox/purge-expired", inbox, admit, json({ limit: "1kb", strict: true, inflate: false }), async (req, res) => {
    if (!req.body || req.body.confirmSyntheticExpiry !== true || Object.keys(req.body).length !== 1) return fail(400, "INVALID_COMMERCIAL_REQUEST");
    res.json(await service.purgeExpired(res.locals.commercialActor));
  });
  router.use((_req, res) => res.status(404).json({ ok: false, code: "COMMERCIAL_ROUTE_NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const known = error instanceof CommercialError, status = (error as { status?: number })?.status;
    res.status(known ? error.status : status === 400 || status === 413 ? status : 503).json({ ok: false,
      code: known ? error.code : status === 400 || status === 413 ? "INVALID_COMMERCIAL_REQUEST" : "COMMERCIAL_STORAGE_UNAVAILABLE" });
  };
  router.use(errors); return router;
}
