import { Router, json, type ErrorRequestHandler } from "express";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  auditWorkflowActionSchema,
  auditWorkflowDetailSchema,
  auditWorkflowReportSchema,
  omnixCasesSchema,
  omnixSessionSchema,
  omnixPreviewIdentitySchema,
  omnixPreviewIdentitiesSchema,
  omnixPreviewLoginSchema,
  omnixCaseIdSchema,
} from "@workspace/api-zod";
import type { AuditWorkflowService } from "./services/auditWorkflowService";
import { AuditWorkflowError } from "./services/auditWorkflowChecks";

type Identity = typeof omnixPreviewIdentitySchema._output;
// Synthetic identities only. This is NOT customer registration/password recovery or an enterprise IdP.
export type OmnixPreviewConfig = {
  identities: readonly Identity[];
  secureCookies: boolean;
  now?: () => number;
};
export function loadOmnixPreviewConfig(
  env: NodeJS.ProcessEnv = process.env,
): OmnixPreviewConfig | undefined {
  if (
    !env.GXEON_OMNIX_PREVIEW_ENABLED ||
    env.GXEON_OMNIX_PREVIEW_ENABLED === "false"
  )
    return;
  if (env.GXEON_OMNIX_PREVIEW_ENABLED !== "true")
    throw new Error("OMNIX_PREVIEW_CONFIGURATION_REQUIRED");
  const raw = env.GXEON_OMNIX_PREVIEW_IDENTITIES ?? "";
  if (!raw || raw.length > 12000)
    throw new Error("OMNIX_PREVIEW_CONFIGURATION_REQUIRED");
  try {
    return {
      identities: omnixPreviewIdentitiesSchema.parse(JSON.parse(raw)),
      secureCookies: true,
    };
  } catch {
    throw new Error("OMNIX_PREVIEW_CONFIGURATION_REQUIRED");
  }
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const cookieName = "omnix_preview_session",
  ttl = 30 * 60 * 1000;
export function omnixPreviewRouter(
  config: OmnixPreviewConfig,
  service: AuditWorkflowService,
  origins: readonly string[],
) {
  const identities = omnixPreviewIdentitiesSchema.parse(config.identities);
  if (
    new Set(identities.map((i) => i.id)).size !== identities.length ||
    !identities.some((i) => i.role === "operator") ||
    !identities.some((i) => i.role === "reviewer")
  )
    throw new Error("UNIQUE_SYNTHETIC_IDENTITIES_REQUIRED");
  const now = config.now ?? Date.now;
  const sessions = new Map<
    string,
    { identity: Identity; expires: number; started: number; requests: number }
  >();
  let loginStarted = now(),
    loginAttempts = 0,
    active = 0;
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use((req, res, next) => {
    if (
      !config.secureCookies &&
      !["127.0.0.1", "localhost", "[::1]"].includes(req.hostname)
    ) {
      res.status(503).json({ ok: false, code: "LOOPBACK_PREVIEW_ONLY" });
      return;
    }
    if (
      req.method === "POST" &&
      (!req.get("origin") || !origins.includes(req.get("origin")!))
    ) {
      res.status(403).json({ ok: false, code: "PREVIEW_ORIGIN_REQUIRED" });
      return;
    }
    if (
      req.method === "POST" &&
      (!req.is("application/json") ||
        (req.get("content-encoding") &&
          req.get("content-encoding") !== "identity"))
    ) {
      res.status(415).json({ ok: false, code: "JSON_REQUIRED" });
      return;
    }
    next();
  });
  router.use(json({ limit: "32kb", strict: true, inflate: false }));
  const publicIdentity = (i: Identity) => ({
    id: i.id,
    organizationId: i.organizationId,
    name: i.name,
    role: i.role,
  });
  const cookie = {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "strict" as const,
    path: "/api/omnix",
  };
  router.get("/status", (_req, res) =>
    res.json({ ok: true, preview: true, customerDataAllowed: false }),
  );
  router.post("/login", (req, res) => {
    const time = now();
    if (time - loginStarted >= 60000) {
      loginStarted = time;
      loginAttempts = 0;
    }
    if (++loginAttempts > 10) {
      res.setHeader("Retry-After", "60");
      res.status(429).json({ ok: false, code: "PREVIEW_LOGIN_LIMIT" });
      return;
    }
    const input = omnixPreviewLoginSchema.safeParse(req.body);
    const user = input.success
      ? identities.find((i) => i.id === input.data.identity)
      : undefined;
    const actual = Buffer.from(
      hash(input.success ? input.data.code : "invalid"),
      "hex",
    );
    if (
      !timingSafeEqual(
        actual,
        Buffer.from(user?.accessCodeSha256 ?? "0".repeat(64), "hex"),
      ) ||
      !user
    ) {
      res.status(401).json({ ok: false, code: "INVALID_PREVIEW_LOGIN" });
      return;
    }
    // One active session per synthetic identity; no user-controlled map growth.
    for (const [key, s] of sessions)
      if (s.identity.id === user.id || s.expires <= time) sessions.delete(key);
    const secret = randomBytes(32).toString("base64url"),
      expires = time + ttl;
    sessions.set(hash(secret), {
      identity: user,
      expires,
      started: time,
      requests: 0,
    });
    res.cookie(cookieName, secret, { ...cookie, maxAge: ttl });
    res.json(
      omnixSessionSchema.parse({
        ok: true,
        preview: true,
        customerDataAllowed: false,
        user: publicIdentity(user),
        expiresAt: new Date(expires).toISOString(),
      }),
    );
  });
  router.use((req, res, next) => {
    const values = (req.get("cookie") ?? "")
      .split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith(cookieName + "="));
    const raw =
      values.length === 1 ? values[0]!.slice(cookieName.length + 1) : "";
    const key = hash(raw),
      session = /^[A-Za-z0-9_-]{43}$/.test(raw) ? sessions.get(key) : undefined;
    if (!session || session.expires <= now()) {
      sessions.delete(key);
      res.status(401).json({ ok: false, code: "PREVIEW_LOGIN_REQUIRED" });
      return;
    }
    if (now() - session.started >= 60000) {
      session.started = now();
      session.requests = 0;
    }
    if (++session.requests > 60) {
      res.setHeader("Retry-After", "60");
      res.status(429).json({ ok: false, code: "PREVIEW_RATE_LIMIT" });
      return;
    }
    if (active >= 4) {
      res.status(503).json({ ok: false, code: "PREVIEW_BUSY" });
      return;
    }
    active++;
    let released = false;
    const release = () => {
      if (!released) {
        active--;
        released = true;
      }
    };
    res.once("finish", release);
    res.once("close", release);
    res.locals.preview = { key, session };
    res.locals.workflow = service.forActor({
      userId: session.identity.id,
      organizationId: session.identity.organizationId,
      role: session.identity.role,
    });
    next();
  });
  router.get("/session", (_req, res) => {
    const s = res.locals.preview.session;
    res.json(
      omnixSessionSchema.parse({
        ok: true,
        preview: true,
        customerDataAllowed: false,
        user: publicIdentity(s.identity),
        expiresAt: new Date(s.expires).toISOString(),
      }),
    );
  });
  router.post("/logout", (_req, res) => {
    sessions.delete(res.locals.preview.key);
    res.clearCookie(cookieName, cookie);
    res.json({ ok: true });
  });
  router.get("/cases", async (_req, res) =>
    res.json(
      omnixCasesSchema.parse(
        await (res.locals.workflow as AuditWorkflowService).list(),
      ),
    ),
  );
  router.post("/cases", async (req, res) =>
    res
      .status(201)
      .json(
        auditWorkflowActionSchema.parse(
          await (res.locals.workflow as AuditWorkflowService).create(req.body),
        ),
      ),
  );
  router.param("caseId", (_req, res, next, id: string) => {
    if (!omnixCaseIdSchema.safeParse(id).success) {
      res.status(400).json({ ok: false, code: "INVALID_CASE_ID" });
      return;
    }
    next();
  });
  router.get("/cases/:caseId", async (req, res) =>
    res.json(
      auditWorkflowDetailSchema.parse(
        await (res.locals.workflow as AuditWorkflowService).detail(
          String(req.params.caseId),
        ),
      ),
    ),
  );
  router.post("/cases/:caseId/run", async (req, res) =>
    res.json(
      auditWorkflowActionSchema.parse(
        await (res.locals.workflow as AuditWorkflowService).run(
          String(req.params.caseId),
        ),
      ),
    ),
  );
  router.post("/cases/:caseId/review", async (req, res) =>
    res.json(
      auditWorkflowActionSchema.parse(
        await (res.locals.workflow as AuditWorkflowService).review(
          String(req.params.caseId),
          req.body,
        ),
      ),
    ),
  );
  router.post("/cases/:caseId/finalize", async (req, res) =>
    res.json(
      auditWorkflowActionSchema.parse(
        await (res.locals.workflow as AuditWorkflowService).finalize(
          String(req.params.caseId),
        ),
      ),
    ),
  );
  router.get("/cases/:caseId/report", async (req, res) => {
    const report = auditWorkflowReportSchema.parse(
      await (res.locals.workflow as AuditWorkflowService).exportReport(
        String(req.params.caseId),
      ),
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-${report.caseId}.json"`,
    );
    res.json(report);
  });
  router.use((_req, res) =>
    res.status(404).json({ ok: false, code: "PREVIEW_ROUTE_NOT_FOUND" }),
  );
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const known = error instanceof AuditWorkflowError,
      status = (error as { status?: number })?.status;
    res
      .status(
        known ? error.status : status === 400 || status === 413 ? status : 503,
      )
      .json({
        ok: false,
        code: known
          ? error.code
          : status === 400 || status === 413
            ? "INVALID_REQUEST_BODY"
            : "AUDIT_STORAGE_UNAVAILABLE",
        message: known
          ? error.message
          : "A prévia não conseguiu confirmar a operação. Nenhuma conclusão é declarada.",
      });
  };
  router.use(errors);
  return router;
}
