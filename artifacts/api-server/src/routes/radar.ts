import { Router, type IRouter, type Response } from "express";
import { GitHubOpportunityClientError, getGitHubOpportunityStatus, searchGitHubOpportunityPreview } from "../radar/githubOpportunityClient";
import { scoreGitHubOpportunity } from "../radar/githubOpportunityScoring";
import { type GitHubOpportunityCandidate } from "../radar/githubOpportunityTypes";
import { getRadarManualIntakeStatus, previewManualOpportunity } from "../radar/radarManualIntake";

const router: IRouter = Router();

function safeError(res: Response, error: unknown, fallback: string, statusCode = 400) {
  const message = error instanceof Error ? error.message : fallback;
  res.status(statusCode).json({ success: false, error: message, message });
}

router.use("/radar", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/radar/status", (_req, res) => {
  try {
    res.json({ success: true, data: getRadarManualIntakeStatus() });
  } catch (error) {
    safeError(res, error, "RADAR_STATUS_FAILED", 500);
  }
});

router.post("/radar/manual-intake/preview", (req, res) => {
  try {
    res.json({ success: true, data: previewManualOpportunity(req.body) });
  } catch (error) {
    safeError(res, error, "RADAR_PREVIEW_FAILED");
  }
});

router.get("/radar/github/status", (_req, res) => {
  try {
    res.json({ success: true, data: getGitHubOpportunityStatus() });
  } catch (error) {
    safeError(res, error, "GITHUB_OPPORTUNITY_STATUS_FAILED", 500);
  }
});

router.post("/radar/github/search-preview", async (req, res) => {
  try {
    const data = await searchGitHubOpportunityPreview(req.body ?? {});
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof GitHubOpportunityClientError) {
      res.status(error.statusCode).json({ success: false, error: error.code, message: error.message });
      return;
    }
    res.status(502).json({ success: false, error: "GITHUB_OPPORTUNITY_PREVIEW_FAILED", message: "GitHub opportunity preview failed closed before returning candidates." });
  }
});

router.post("/radar/github/score-preview", (req, res) => {
  try {
    const candidate = (req.body as { candidate?: GitHubOpportunityCandidate } | undefined)?.candidate;
    if (!candidate || typeof candidate !== "object") {
      res.status(400).json({ success: false, error: "GITHUB_CANDIDATE_REQUIRED", message: "GITHUB_CANDIDATE_REQUIRED" });
      return;
    }
    res.json({ success: true, data: scoreGitHubOpportunity(candidate) });
  } catch (error) {
    safeError(res, error, "GITHUB_SCORE_PREVIEW_FAILED");
  }
});

router.use("/radar", (_req, res) => {
  res.status(404).json({ success: false, error: "RADAR_ROUTE_NOT_FOUND", message: "RADAR_ROUTE_NOT_FOUND" });
});

export default router;
