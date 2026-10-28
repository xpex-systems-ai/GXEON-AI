import { Router, json, type Request, type Response, type ErrorRequestHandler } from "express";
import type { AuditWorkflowService } from "./services/auditWorkflowService";
import { createOmnixReadGateway, OmnixReadError, type OmnixReadPrincipal } from "./omnixReadGateway";
import { EnterpriseIdentityError } from "./enterpriseIdentity";

export function createOmnixDistributionRouter(options: {
  resolve: (req: Request, res: Response) => Promise<OmnixReadPrincipal>;
  workflow: AuditWorkflowService;
  origins: readonly string[];
}) {
  if (!options.origins.length || options.origins.includes("*")) throw new Error("EXACT_DISTRIBUTION_ORIGIN_REQUIRED");
  const router = Router(); let windowAt = performance.now(), count = 0, active = 0;
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    const now = performance.now(); if (now - windowAt >= 60000) { windowAt = now; count = 0; }
    if (++count > 60) { res.setHeader("Retry-After", "60"); res.status(429).json({ ok: false, code: "DISTRIBUTION_RATE_LIMIT" }); return; }
    if (active >= 4) { res.setHeader("Retry-After", "1"); res.status(503).json({ ok: false, code: "DISTRIBUTION_BUSY" }); return; }
    const origin = req.get("origin");
    if (origin && !options.origins.includes(origin)) { res.status(403).json({ ok: false, code: "DISTRIBUTION_ORIGIN_DENIED" }); return; }
    if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); res.status(405).json({ ok: false, code: "DISTRIBUTION_METHOD_DENIED" }); return; }
    if (req.method === "POST" && (!req.is("application/json") || (req.get("content-encoding") && req.get("content-encoding") !== "identity"))) {
      res.status(415).json({ ok: false, code: "DISTRIBUTION_JSON_REQUIRED" }); return;
    }
    active++; let released = false;
    const release = () => { if (!released) { active--; released = true; } };
    res.once("finish", release); res.once("close", release); next();
  });
  router.use(json({ limit: "16kb", strict: true, inflate: false }));
  const gateway = (req: Request, res: Response) => createOmnixReadGateway(() => options.resolve(req, res), options.workflow);
  router.get("/capabilities", async (req, res) => res.json(await gateway(req, res).callTool("omnix_get_capabilities", {})));
  router.post("/mcp", async (req, res) => {
    const result = await gateway(req, res).handleRpc(req.body);
    if (result.status === 401) res.setHeader("WWW-Authenticate", "Bearer");
    if (result.body === undefined) res.status(result.status).end(); else res.status(result.status).json(result.body);
  });
  router.post("/assistant", async (req, res) => res.json(await gateway(req, res).converse(req.body)));
  router.use((_req, res) => res.status(404).json({ ok: false, code: "DISTRIBUTION_ROUTE_NOT_FOUND" }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const known = error instanceof OmnixReadError || error instanceof EnterpriseIdentityError;
    const bodyStatus = (error as { status?: number })?.status;
    const status = known ? error.status : bodyStatus === 413 || bodyStatus === 400 ? bodyStatus : 503;
    if (status === 401) res.setHeader("WWW-Authenticate", "Bearer");
    res.status(status).json({ ok: false, code: known ? error.code : status === 400 || status === 413 ? "DISTRIBUTION_INVALID_BODY" : "DISTRIBUTION_UNAVAILABLE" });
  }; router.use(errors); return router;
}
