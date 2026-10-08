import { Router } from "express";
import { buildR100DatabaseMirrorActivationPlan } from "../durableState/r100DatabaseMirrorActivationPlan";
import { buildR100DatabaseMirrorOperatorSummary } from "../durableState/r100DatabaseMirrorOperatorSummary";
import { getR100DatabaseMirrorReadiness } from "../durableState/r100DatabaseMirrorReadinessService";
import { getR100DatabaseMirrorSchemaDiagnostics } from "../durableState/r100DatabaseMirrorDiagnostics";
import { applyR100DatabaseMirrorSchema, dryRunR100DatabaseMirrorSchema, RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST_ACTION, runR100DatabaseMirrorActivationSmokeTest } from "../durableState/r100DatabaseMirrorOperatorActivationRunner";
import { createR100DatabaseMirrorProbe, exportSafeR100SnapshotToDatabaseMirror, getLatestR100DatabaseMirrorSnapshot, getR100DatabaseMirrorStatus } from "../durableState/r100DatabaseMirrorService";

const router = Router();
const noStore = (res: { setHeader: (name: string, value: string) => void }) => res.setHeader("Cache-Control", "no-store");
const isConfirmed = (body: unknown, action: string) => Boolean(body && typeof body === "object" && ((body as Record<string, unknown>).action === action || (body as Record<string, unknown>).confirm === action));

router.get("/r100-db/status", async (_req, res) => {
  noStore(res);
  res.json({ success: true, data: await getR100DatabaseMirrorStatus() });
});

router.get("/r100-db/readiness", async (_req, res) => {
  noStore(res);
  res.json({ success: true, data: await getR100DatabaseMirrorReadiness() });
});

router.get("/r100-db/activation-plan", async (_req, res) => {
  noStore(res);
  const readiness = await getR100DatabaseMirrorReadiness();
  res.json({ success: true, data: buildR100DatabaseMirrorActivationPlan(readiness) });
});

router.get("/r100-db/operator-summary", async (_req, res) => {
  noStore(res);
  res.json({ success: true, data: await buildR100DatabaseMirrorOperatorSummary() });
});


router.get("/r100-db/schema-diagnostics", async (_req, res) => {
  noStore(res);
  res.json({ success: true, data: await getR100DatabaseMirrorSchemaDiagnostics() });
});

router.post("/r100-db/schema-dry-run", async (_req, res) => {
  noStore(res);
  res.json({ success: true, data: await dryRunR100DatabaseMirrorSchema() });
});

router.post("/r100-db/apply-schema", async (req, res) => {
  noStore(res);
  const result = await applyR100DatabaseMirrorSchema(req.body?.action);
  const statusCode = result.applied ? 200 : result.status === "R100_DB_MIRROR_SCHEMA_APPLY_CONFIRMATION_REQUIRED" ? 400 : 403;
  res.status(statusCode).json({ success: result.applied, data: result, error: result.applied ? undefined : result.status });
});

router.post("/r100-db/activation-smoke-test", async (req, res) => {
  noStore(res);
  if (!isConfirmed(req.body, RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST_ACTION)) return res.status(400).json({ success: false, error: "RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST_CONFIRMATION_REQUIRED" });
  return res.json({ success: true, data: await runR100DatabaseMirrorActivationSmokeTest() });
});

router.get("/r100-db/latest-snapshot", async (_req, res) => {
  noStore(res);
  res.json({ success: true, data: await getLatestR100DatabaseMirrorSnapshot() });
});

router.post("/r100-db/probe", async (req, res) => {
  noStore(res);
  if (!isConfirmed(req.body, "CREATE_SAFE_R100_DB_MIRROR_PROBE")) return res.status(400).json({ success: false, error: "CREATE_SAFE_R100_DB_MIRROR_PROBE_CONFIRMATION_REQUIRED" });
  try {
    return res.json({ success: true, data: await createR100DatabaseMirrorProbe() });
  } catch (error) {
    return res.status(503).json({ success: false, error: error instanceof Error ? error.message : "R100_DB_MIRROR_UNHEALTHY", data: { status: await getR100DatabaseMirrorStatus(), readiness: await getR100DatabaseMirrorReadiness() } });
  }
});

router.post("/r100-db/export-safe-snapshot", async (req, res) => {
  noStore(res);
  if (!isConfirmed(req.body, "EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR")) return res.status(400).json({ success: false, error: "EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR_CONFIRMATION_REQUIRED" });
  try {
    return res.json({ success: true, data: await exportSafeR100SnapshotToDatabaseMirror() });
  } catch (error) {
    res.status(503).json({ success: false, error: error instanceof Error ? error.message : "R100_DB_MIRROR_UNHEALTHY", data: { status: await getR100DatabaseMirrorStatus(), readiness: await getR100DatabaseMirrorReadiness() } });
  }
});

export default router;
