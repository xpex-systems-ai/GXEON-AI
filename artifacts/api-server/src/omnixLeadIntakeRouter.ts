import { Router, json, type ErrorRequestHandler, type Request, type RequestHandler } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { LeadIntakeError, type LeadIntakeService, type LeadPrincipal } from "./omnixLeadIntake";

export type LeadRouterOptions = {
  service?: LeadIntakeService; token?: string; sourceOrigin?: string;
  authorizeInbox?: (request: Request) => Promise<LeadPrincipal | undefined>;
  now?: () => number;
};
const unavailable = { ok: false, code: "LEAD_ADMISSION_CLOSED", leadDataAllowed: false, auditCustomerDataAllowed: false, humanDeliveryVerified: false };
export function omnixLeadIntakeRouter(options: LeadRouterOptions = {}) {
  const router = Router(), now = options.now ?? (() => performance.now());
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "no-referrer"); next(); });
  if (!options.service || !options.token || !options.sourceOrigin) { router.use((_req, res) => res.status(503).json(unavailable)); return router; }
  const { service } = options;
  let origin: URL; try { origin = new URL(options.sourceOrigin); } catch { throw new Error("LEAD_SERVER_CONFIGURATION_REQUIRED"); }
  if (origin.protocol !== "https:" || origin.origin !== options.sourceOrigin || origin.username || origin.password || !/^[A-Za-z0-9_-]{43,128}$/.test(options.token)) throw new Error("LEAD_SERVER_CONFIGURATION_REQUIRED");
  const expected = createHash("sha256").update(options.token).digest();
  let started = now(), attempts = 0, active = 0, healthAt: number | undefined, probing = false;
  let readiness: Awaited<ReturnType<LeadIntakeService["ready"]>> | undefined;
  router.use((req, res, next) => {
    if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); res.status(405).json({ ok: false, code: "LEAD_METHOD_DENIED" }); return; }
    if (req.method === "POST" && req.get("origin") !== options.sourceOrigin) { res.status(403).json({ ok: false, code: "LEAD_ORIGIN_DENIED" }); return; }
    if (req.method === "POST" && (!req.is("application/json") || (req.get("content-encoding") && req.get("content-encoding") !== "identity"))) {
      res.status(415).json({ ok: false, code: "LEAD_JSON_REQUIRED" }); return;
    }
    next();
  });
  const technical: RequestHandler = (req, res, next) => {
    const header = req.get("authorization") ?? "", value = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(value) || !timingSafeEqual(createHash("sha256").update(value).digest(), expected)) { res.status(401).json({ ok: false, code: "LEAD_TECHNICAL_AUTH_REQUIRED" }); return; }
    next();
  };
  const admit: RequestHandler = (_req, res, next) => {
    if (now() - started >= 60000) { started = now(); attempts = 0; }
    if (++attempts > 20 || active >= 2) { res.setHeader("Retry-After", "60"); res.status(429).json({ ok: false, code: "LEAD_RATE_LIMIT" }); return; }
    active++; let released = false;
    const release = () => { if (!released) { active--; released = true; } }; res.once("close", release); res.once("finish", release); next();
  };
  router.get("/status", technical, async (_req, res) => {
    if (probing) { res.status(503).json(unavailable); return; }
    if (healthAt === undefined || now() - healthAt >= 5000) {
      probing = true; try { readiness = await service.ready(); } catch { readiness = undefined; }
      finally { probing = false; healthAt = now(); }
    }
    res.status(readiness ? 200 : 503).json(readiness ?? unavailable);
  });
  router.post("/challenge", technical, admit, json({ limit: "128b", strict: true, inflate: false }), async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length) throw new LeadIntakeError(400, "LEAD_INVALID_INPUT");
    res.status(201).json(await service.challenge());
  });
  router.post("/requests", technical, admit, json({ limit: "4kb", strict: true, inflate: false }), async (req, res) => {
    const result = await service.submit(req.body); res.status(result.reused ? 200 : 201).json(result);
  });
  const inbox: RequestHandler = async (req, res, next) => {
    const actor = await options.authorizeInbox?.(req).catch(() => undefined);
    if (!actor) { res.status(401).json({ ok: false, code: "LEAD_INBOX_AUTH_REQUIRED" }); return; }
    res.locals.leadActor = actor; next();
  };
  router.get("/inbox", inbox, admit, async (_req, res) => res.json(await service.inbox(res.locals.leadActor)));
  router.post("/requests/:leadId/ack", inbox, admit, json({ limit: "128b", strict: true, inflate: false }), async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length) throw new LeadIntakeError(400, "LEAD_INVALID_INPUT");
    res.json(await service.acknowledge(res.locals.leadActor, String(req.params.leadId)));
  });
  router.post("/requests/:leadId/state", inbox, admit, json({ limit: "2kb", strict: true, inflate: false }), async (req, res) => res.json(await service.advance(res.locals.leadActor, String(req.params.leadId), req.body)));
  router.post("/inbox/purge-expired", inbox, admit, json({ limit: "1kb", strict: true, inflate: false }), async (req, res) => res.json(await service.purgeExpired(res.locals.leadActor, req.body)));
  router.use((_req, res) => res.status(404).json({ ok: false, code: "LEAD_ROUTE_NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const known = error instanceof LeadIntakeError, status = (error as { status?: number })?.status;
    res.status(known ? error.status : status === 400 || status === 413 ? status : 503).json({ ok: false,
      code: known ? error.code : status === 400 || status === 413 ? "LEAD_INVALID_INPUT" : "LEAD_STORAGE_UNAVAILABLE" });
  };
  router.use(errors); return router;
}
