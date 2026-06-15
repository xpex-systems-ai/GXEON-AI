import { Router } from "express";
import { createR100DatabaseMirrorProbe, exportSafeR100SnapshotToDatabaseMirror, getLatestR100DatabaseMirrorSnapshot, getR100DatabaseMirrorStatus } from "../durableState/r100DatabaseMirrorService";

const router = Router();
const noStore = (res: { setHeader: (name: string, value: string) => void }) => res.setHeader("Cache-Control", "no-store");
const isConfirmed = (body: unknown, action: string) => Boolean(body && typeof body === "object" && ((body as Record<string, unknown>).action === action || (body as Record<string, unknown>).confirm === action));

router.get("/r100-db/status", (_req, res) => {
  noStore(res);
  res.json({ success: true, data: getR100DatabaseMirrorStatus() });
});

router.get("/r100-db/latest-snapshot", async (_req, res) => {
  noStore(res);
  res.json({ success: true, data: await getLatestR100DatabaseMirrorSnapshot() });
});

router.post("/r100-db/probe", async (req, res) => {
  noStore(res);
  if (!isConfirmed(req.body, "CREATE_SAFE_R100_DB_MIRROR_PROBE")) return res.status(400).json({ success: false, error: "CREATE_SAFE_R100_DB_MIRROR_PROBE_CONFIRMATION_REQUIRED" });
  try {
    res.json({ success: true, data: await createR100DatabaseMirrorProbe() });
  } catch (error) {
    res.status(503).json({ success: false, error: error instanceof Error ? error.message : "R100_DB_MIRROR_UNHEALTHY", data: getR100DatabaseMirrorStatus() });
  }
});

router.post("/r100-db/export-safe-snapshot", async (req, res) => {
  noStore(res);
  if (!isConfirmed(req.body, "EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR")) return res.status(400).json({ success: false, error: "EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR_CONFIRMATION_REQUIRED" });
  try {
    res.json({ success: true, data: await exportSafeR100SnapshotToDatabaseMirror() });
  } catch (error) {
    res.status(503).json({ success: false, error: error instanceof Error ? error.message : "R100_DB_MIRROR_UNHEALTHY", data: getR100DatabaseMirrorStatus() });
  }
});

export default router;
