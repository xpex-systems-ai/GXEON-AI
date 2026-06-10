import { Router, type IRouter } from "express";
import { GitHubOpportunityClientError, getGitHubOpportunityStatus, searchGitHubOpportunityPreview } from "../radar/githubOpportunityClient";
import { scoreGitHubOpportunity } from "../radar/githubOpportunityScoring";
import { type GitHubOpportunityCandidate } from "../radar/githubOpportunityTypes";
import { getRadarManualIntakeStatus, previewManualOpportunity } from "../radar/radarManualIntake";

const router: IRouter = Router();

router.use("/radar", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

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

router.get("/radar/github/status", (_req, res) => {
  res.json({ success: true, data: getGitHubOpportunityStatus() });
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
      res.status(400).json({ success: false, error: "GITHUB_CANDIDATE_REQUIRED" });
      return;
    }
    res.json({ success: true, data: scoreGitHubOpportunity(candidate) });
  } catch {
    res.status(400).json({ success: false, error: "GITHUB_SCORE_PREVIEW_FAILED" });
  }
});

export default router;
