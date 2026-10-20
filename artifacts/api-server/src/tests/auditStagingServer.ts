// Development-only composition of the existing API. Never imported by src/index.ts.
import express from "express";
import { timingSafeEqual } from "node:crypto";
import { getPool, closeDb } from "@workspace/db";
import app from "../app";
import { auditAccess } from "../middlewares/auditAccess";

if (process.env.NODE_ENV !== "test" || process.env.GXEON_AUDIT_STAGING !== "true") throw new Error("EXPLICIT_TEST_STAGING_REQUIRED");
const url = new URL(process.env.DATABASE_URL ?? "invalid:");
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/gx01_staging" ||
    url.username !== "gx01_app" || url.search || url.hash) throw new Error("ISOLATED_STAGING_DATABASE_REQUIRED");
const operator = process.env.GXEON_AUDIT_OPERATOR_TOKEN ?? "";
const reviewer = process.env.GXEON_AUDIT_REVIEWER_TOKEN ?? "";
const control = process.env.GXEON_STAGING_CONTROL_TOKEN ?? "";
if (operator.length < 32 || reviewer.length < 32 || control.length < 32 || operator === reviewer) throw new Error("DISTINCT_STAGING_CREDENTIALS_REQUIRED");
if (process.env.GXEON_AUDIT_AUTO_RUN_MISSION_006 !== "false" ||
    process.env.GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL !== "false") throw new Error("AUTORUNNERS_MUST_BE_DISABLED");
const database = (await getPool().query(
  "SELECT current_database() AS database, current_user AS role, current_setting('server_version_num')::int AS version, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user",
)).rows[0];
if (database.database !== "gx01_staging" || database.role !== "gx01_app" ||
    database.version < 170000 || database.version >= 180000 ||
    database.rolsuper || database.rolcreatedb || database.rolcreaterole) throw new Error("POSTGRES17_RESTRICTED_ROLE_REQUIRED");

const stage = express();
stage.use(express.json({ limit: "32kb" }));
stage.get("/api/staging/health", auditAccess("read"), async (_req, res) => {
  const row = (await getPool().query("SELECT pg_postmaster_start_time()::text AS started_at")).rows[0];
  res.json({
    ok: true, testData: true, instanceId: process.env.GXEON_STAGING_INSTANCE,
    pid: process.pid, database, databaseStartedAt: row.started_at,
    writeEnabled: process.env.GXEON_AUDIT_WRITE_MODE === "enabled",
  });
});
stage.post("/__stage/stop", async (req, res) => {
  const token = Buffer.from(String(req.get("x-gx-stage-control") ?? ""));
  const expected = Buffer.from(control);
  if (token.length !== expected.length || !timingSafeEqual(token, expected)) { res.status(403).end(); return; }
  res.json({ ok: true });
  server.closeAllConnections();
  server.close();
  await closeDb();
  process.exit(0);
});
stage.use((req, res, next) => {
  const allowed = req.path === "/api/healthz" ||
    req.path === "/api/v1/audit/baseline/first-evidence-finding" ||
    req.path.startsWith("/api/v1/audit/workflow/") ||
    /^\/api\/v1\/audit\/(?:cases|findings|evidences|health|modules|schema-diagnostics|mission-control)(?:\/|$)/.test(req.path);
  if (!allowed) { res.status(404).json({ ok: false, code: "STAGING_SCOPE_ONLY" }); return; }
  if (req.method === "POST" && /^\/api\/v1\/audit\/workflow\/cases\/?$/i.test(req.path) && req.body?.testData !== true) {
    res.status(400).json({ ok: false, code: "STAGING_REQUIRES_TEST_DATA" }); return;
  }
  next();
});
stage.use(app);
const server = stage.listen(3479, "127.0.0.1", () => console.log("GX-01.2 existing API TEST DATA; PostgreSQL 17 restricted role; loopback only."));
