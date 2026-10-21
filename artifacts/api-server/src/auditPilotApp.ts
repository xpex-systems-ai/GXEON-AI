import express, { type ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { auditAccess } from "./middlewares/auditAccess";
import { auditWorkflowRouter } from "./routes/auditWorkflow";
import type { AuditWorkflowService } from "./services/auditWorkflowService";

type Options = {
  origins: readonly string[];
  service: AuditWorkflowService;
  ready: () => Promise<void>;
  log?: (record: { event: string; requestId: string; method: string; route: string; status: number }) => void;
};
export function createAuditPilotApp(options: Options) {
  if (!options.origins.length || options.origins.includes("*")) throw new Error("EXACT_AUDIT_ORIGINS_REQUIRED");
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
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
  app.get("/api/readyz", auditAccess("read"), async (_req, res) => {
    try { await options.ready(); res.json({ ok: true }); }
    catch { res.status(503).json({ ok: false, code: "AUDIT_NOT_READY" }); }
  });
  app.use("/api/v1/audit/workflow", auditAccess("read"), (req, res, next) => {
    if (req.method === "POST" && !req.is("application/json")) { res.status(415).json({ ok: false, code: "JSON_REQUIRED" }); return; }
    next();
  }, express.json({ limit: "32kb", strict: true }), (req, res, next) => {
    if (req.method === "POST" && /^\/cases\/?$/i.test(req.path) && req.body?.testData !== true) {
      res.status(400).json({ ok: false, code: "PILOT_REQUIRES_TEST_DATA" }); return;
    }
    next();
  }, auditWorkflowRouter(options.service));
  app.use((_req, res) => res.status(404).json({ ok: false, code: "AUDIT_ROUTE_NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const status = (error as { status?: number })?.status;
    res.status(status === 400 || status === 413 ? status : 503).json({ ok: false,
      code: status === 400 || status === 413 ? "INVALID_REQUEST_BODY" : "AUDIT_UNAVAILABLE" });
  };
  app.use(errors);
  return app;
}
