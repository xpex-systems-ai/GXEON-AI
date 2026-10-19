// Explicit local TEST DATA demo. This entrypoint is never imported by the production server.
import express, { type ErrorRequestHandler } from "express";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { PoolClient } from "@workspace/db";
import { createAuditWorkflowService } from "../services/auditWorkflowService";
import { auditWorkflowRouter } from "../routes/auditWorkflow";

if (
  process.env.NODE_ENV === "production" ||
  process.env.GXEON_AUDIT_DEMO !== "true"
)
  throw new Error(
    "Explicit GXEON_AUDIT_DEMO=true and a non-production process are required.",
  );
const dir = await mkdtemp(path.join(tmpdir(), "gx01-demo-"));
const engine = await PGlite.create(path.join(dir, "postgres"));
await engine.exec(
  await readFile(
    new URL(
      "../../../../lib/db/drizzle/0002_audit_os_schema.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
Object.assign(process.env, {
  GXEON_AUDIT_OPERATOR_TOKEN: "test-only-operator-credential",
  GXEON_AUDIT_REVIEWER_TOKEN: "test-only-reviewer-credential",
  GXEON_AUDIT_DB_PROVIDER: "postgres",
  GXEON_AUDIT_WRITE_MODE: "enabled",
  GXEON_AUDIT_ALLOW_DB_WRITES: "true",
});
let tail = Promise.resolve();
const service = createAuditWorkflowService(async () => {
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  return {
    query: (q: string, values?: unknown[]) => engine.query(q, values),
    release,
  } as Pick<PoolClient, "query" | "release">;
});
const app = express();
app.use(express.json({ limit: "32kb" }));
app.post("/api/v1/audit/workflow/cases", (req, res, next) => {
  if (req.body?.testData !== true) {
    res.status(400).json({ ok: false, code: "DEMO_REQUIRES_TEST_DATA" });
    return;
  }
  next();
});
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", testData: true, engine: "PGlite local TEST DATA" });
});
app.use("/api/v1/audit/workflow", auditWorkflowRouter(service));
app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, code: "API_ROUTE_NOT_FOUND" });
});
const errorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
  res.status(400).json({ ok: false, code: "INVALID_DEMO_REQUEST" });
};
app.use(errorHandler);
const server = app.listen(3478, "127.0.0.1", () => {
  console.log(
    "GX-01 TEST DATA demo listening on 127.0.0.1:3478; no remote database or connector.",
  );
});
async function stop() {
  server.closeAllConnections();
  server.close();
  await tail;
  await engine.close();
  if (
    !path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(dir).startsWith("gx01-demo-")
  )
    throw new Error("Unexpected demo cleanup path");
  await rm(dir, { recursive: true, force: true });
  process.exit(0);
}
process.once("SIGINT", () => {
  void stop();
});
process.once("SIGTERM", () => {
  void stop();
});
