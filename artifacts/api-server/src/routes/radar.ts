import { Router, type IRouter, type Response } from "express";
import { GitHubOpportunityClientError, getGitHubOpportunityStatus, searchGitHubOpportunityPreview } from "../radar/githubOpportunityClient";
import { scoreGitHubOpportunity } from "../radar/githubOpportunityScoring";
import { type GitHubOpportunityCandidate } from "../radar/githubOpportunityTypes";
import { getRadarManualIntakeStatus, previewManualOpportunity } from "../radar/radarManualIntake";
import { classifyBazaarPreview, MAX_BAZAAR_PREVIEW_ITEMS } from "../radar/gxeonBazaarClassifier";

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

// x402 Bazaar discovery is a SELLER API catalog, not a buyer inbox.
router.get("/radar/x402/status", (_req, res) => {
  res.json({
    success: true,
    data: {
      mode: "READ_ONLY_DISCOVERY",
      provider: "CDP_BAZAAR",
      source: "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources",
      authenticatedLiveCatalogConfigured: Boolean(process.env.CDP_X402_BAZAAR_ACCESS_TOKEN),
      classifyEndpoint: "/api/radar/x402/classify-preview",
      liveCatalogEndpoint: "/api/radar/x402/catalog-preview",
      maxPreviewItems: MAX_BAZAAR_PREVIEW_ITEMS,
      sellerApisAreBounties: false,
      paidExecutionEnabled: false,
      fundedJobsVerified: 0,
      revenueVerifiedUsdc: null,
    },
  });
});

// Optional authenticated GET-only proxy to the exact official Coinbase CDP endpoint.
// It does not call resource URLs, sign transactions or send a payment payload.
router.get("/radar/x402/catalog-preview", async (_req, res) => {
  const token = (process.env.CDP_X402_BAZAAR_ACCESS_TOKEN || "").trim();
  if (!token) {
    res.status(503).json({ success: false, error: "CDP_BAZAAR_AUTH_REQUIRED",
      message: "Provider access token not configured. Use classify-preview with a saved catalog response." });
    return;
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 6500);
  try {
    const response = await fetch("https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?limit=20&offset=0", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: abort.signal,
    });
    if (!response.ok) {
      res.status(502).json({ success: false, error: "CDP_BAZAAR_PROVIDER_UNAVAILABLE" });
      return;
    }
    const maxChars = 400_000;
    const length = Number(response.headers.get("content-length") || 0);
    if (length > maxChars) throw new Error("BAZAAR_RESPONSE_TOO_LARGE");
    const raw = await response.text();
    if (raw.length > maxChars) throw new Error("BAZAAR_RESPONSE_TOO_LARGE");
    const preview = classifyBazaarPreview(JSON.parse(raw), ["verification", "json", "url", "api", "csv"]);
    res.json({ success: true, data: { ...preview, origin: "COINBASE_CDP_BAZAAR",
      authenticatedDiscovery: true, providerReportedUsageNotSettledGxeonRevenue: true } });
  } catch {
    res.status(502).json({ success: false, error: "CDP_BAZAAR_PREVIEW_UNAVAILABLE" });
  } finally {
    clearTimeout(timer);
  }
});

router.post("/radar/x402/classify-preview", (req, res) => {
  try {
    const preview = classifyBazaarPreview(req.body, ["verification", "json", "url", "api", "csv"]);
    res.json({ success: true, data: preview });
  } catch (error) {
    const code = error instanceof Error ? error.message : "BAZAAR_INVALID_CATALOG";
    res.status(400).json({ success: false, error: code });
  }
});

router.use("/radar", (_req, res) => {
  res.status(404).json({ success: false, error: "RADAR_ROUTE_NOT_FOUND", message: "RADAR_ROUTE_NOT_FOUND" });
});

export default router;
