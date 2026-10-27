import express, { type ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { resolve, join, isAbsolute } from "node:path";
import { statSync } from "node:fs";
import { auditAccess } from "./middlewares/auditAccess";
import { auditWorkflowRouter } from "./routes/auditWorkflow";
import type { AuditWorkflowService } from "./services/auditWorkflowService";
import { omnixPreviewRouter, type OmnixPreviewConfig } from "./omnixPreview";

type Options = {
  frontendRoot?: string;
  portal?: OmnixPreviewConfig;
  origins: readonly string[];
  service: AuditWorkflowService;
  ready: () => Promise<void>;
  // Testable process-local limits; runtime uses defaults with one replica.
  admission?: { requestsPerMinute?: number; maxConcurrent?: number; now?: () => number };
  log?: (record: { event: string; requestId: string; method: string; route: string; status: number }) => void;
};
export function createAuditPilotApp(options: Options) {
  if (!options.origins.length || options.origins.includes("*")) throw new Error("EXACT_AUDIT_ORIGINS_REQUIRED");
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  const requestsPerMinute = options.admission?.requestsPerMinute ?? 60;
  const maxConcurrent = options.admission?.maxConcurrent ?? 4;
  const now = options.admission?.now ?? (() => performance.now());
  if (!Number.isInteger(requestsPerMinute) || requestsPerMinute < 1 || requestsPerMinute > 600 ||
      !Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 8) throw new Error("BOUNDED_ADMISSION_REQUIRED");
  const buckets = new Map<string, { started: number; count: number }>();
  let active = 0;
  const admit: express.RequestHandler = (req, res, next) => {
    // Invoked only after auditAccess. Two role buckets, never IP/query/token map keys.
    const role = req.get("authorization") === "Bearer " + process.env.GXEON_AUDIT_OPERATOR_TOKEN ? "operator" : "reviewer";
    const time = now();
    let bucket = buckets.get(role);
    if (!bucket || time - bucket.started >= 60000) { bucket = { started: time, count: 0 }; buckets.set(role, bucket); }
    if (bucket.count >= requestsPerMinute) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((60000 - (time - bucket.started)) / 1000))));
      res.status(429).json({ ok: false, code: "AUDIT_RATE_LIMIT" }); return;
    }
    bucket.count++;
    if (active >= maxConcurrent) {
      res.setHeader("Retry-After", "1"); res.status(503).json({ ok: false, code: "AUDIT_BUSY" }); return;
    }
    active++;
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    res.once("finish", release); res.once("close", release);
    next();
  };
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Request-Id", requestId);
    // Fixed categories only: never log query, path parameters, headers, body or errors.
    res.on("finish", () => options.log?.({ event: "audit_http", requestId,
      method: ["GET", "POST", "OPTIONS"].includes(req.method) ? req.method : "OTHER",
      route: req.path === "/api/healthz" ? "health" : req.path === "/api/readyz" ? "ready" :
        req.path.startsWith("/api/v1/audit/workflow/") ? "workflow" : "unknown", status: res.statusCode }));
    const origin = req.get("origin");
    if (origin && !options.origins.includes(origin)) { res.status(403).json({ ok: false, code: "ORIGIN_DENIED" }); return; }
    if (origin) {
      res.vary("Origin");
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Request-Id");
    }
    if (!["GET", "POST", "OPTIONS"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, OPTIONS"); res.status(405).json({ ok: false, code: "METHOD_DENIED" }); return;
    }
    if (req.method === "OPTIONS") {
      const method = req.get("access-control-request-method");
      const headers = (req.get("access-control-request-headers") ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!origin || !["GET", "POST"].includes(method ?? "") ||
          headers.some(h => !["authorization", "content-type"].includes(h))) {
        res.status(403).json({ ok: false, code: "PREFLIGHT_DENIED" }); return;
      }
      if (!req.path.startsWith("/api/v1/audit/workflow/")) { res.status(404).json({ ok: false, code: "AUDIT_ROUTE_NOT_FOUND" }); return; }
      res.setHeader("Access-Control-Allow-Methods", "GET, POST");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.status(204).end(); return;
    }
    next();
  });
  app.get("/api/healthz", (_req, res) => res.json({ ok: true, service: "gxeon-audit-pilot" }));
  if (options.portal) app.use("/api/omnix", omnixPreviewRouter(options.portal, options.service, options.origins));
  app.get("/api/readyz", auditAccess("read"), admit, async (_req, res) => {
    try { await options.ready(); res.json({ ok: true }); }
    catch { res.status(503).json({ ok: false, code: "AUDIT_NOT_READY" }); }
  });
  app.use("/api/v1/audit/workflow", auditAccess("read"), admit, (req, res, next) => {
    const encoding = req.get("content-encoding");
    if (encoding && encoding.toLowerCase() !== "identity") {
      res.status(415).json({ ok: false, code: "ENCODING_UNSUPPORTED" }); return;
    }
    if (req.method === "POST" && !req.is("application/json")) { res.status(415).json({ ok: false, code: "JSON_REQUIRED" }); return; }
    next();
  }, express.json({ limit: "32kb", strict: true, inflate: false }), (req, res, next) => {
    if (req.method === "POST" && /^\/cases\/?$/i.test(req.path) && req.body?.testData !== true) {
      res.status(400).json({ ok: false, code: "PILOT_REQUIRES_TEST_DATA" }); return;
    }
    next();
  }, auditWorkflowRouter(options.service));
  if (options.frontendRoot) {
    const root = resolve(options.frontendRoot);
    if (!isAbsolute(options.frontendRoot) || !statSync(join(root, "index.html")).isFile() ||
        !statSync(join(root, "assets")).isDirectory()) throw new Error("AUDIT_FRONTEND_BUILD_REQUIRED");
    app.use((_req, res, next) => {
      res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      res.setHeader("X-Frame-Options", "DENY"); next();
    });
    app.get("/", (_req, res) => res.redirect(302, "/omnix"));
    app.get("/omnix", (_req, res, next) => res.sendFile("index.html", { root }, error => { if (error) next(error); }));
    app.use("/assets", express.static(join(root, "assets"), { dotfiles: "deny", index: false, fallthrough: false,
      immutable: true, maxAge: "1y", setHeaders: res => res.setHeader("Cache-Control", "public, max-age=31536000, immutable") }));
  }
  app.use((_req, res) => res.status(404).json({ ok: false, code: "AUDIT_ROUTE_NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const status = (error as { status?: number })?.status;
    res.status(status === 404 ? 404 : status === 400 || status === 413 ? status : 503).json({ ok: false,
      code: status === 404 ? "AUDIT_ROUTE_NOT_FOUND" : status === 400 || status === 413 ? "INVALID_REQUEST_BODY" : "AUDIT_UNAVAILABLE" });
  };
  app.use(errors);
  return app;
}
