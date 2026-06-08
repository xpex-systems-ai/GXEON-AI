import { Router, type IRouter } from "express";
import { getRadarManualIntakeStatus, previewManualOpportunity } from "../radar/radarManualIntake";

const router: IRouter = Router();

router.get("/radar/status", (_req, res) => {
  res.json({ success: true, data: getRadarManualIntakeStatus() });
});

router.post("/radar/manual-intake/preview", (req, res) => {
  try {
    res.json({ success: true, data: previewManualOpportunity(req.body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RADAR_PREVIEW_FAILED";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
