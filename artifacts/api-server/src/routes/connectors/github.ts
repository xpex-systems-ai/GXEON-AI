import { Router } from "express";
import { getGitHubConnectorConfig, toGitHubConnectorDiagnostics, toSafeGitHubConnectorStatus } from "../../connectors/github/githubConnectorConfig";
import { getGitHubConnectorConfig, toSafeGitHubConnectorStatus } from "../../connectors/github/githubConnectorConfig";
import { GitHubReadonlyClientError, readGitHubReadonlySnapshot } from "../../connectors/github/githubReadonlyClient";
import { createGitHubReadonlyFailedSnapshot, createGitHubReadonlyReadySnapshot, normalizeGitHubReadonlySnapshot } from "../../connectors/github/githubReadonlyNormalizer";

const router = Router();
const cacheHeader = "private, max-age=30, stale-while-revalidate=30";
const diagnosticsCacheHeader = "no-store";

router.get("/connectors/github/diagnostics", (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json(toGitHubConnectorDiagnostics());
});

router.get("/connectors/github/status", (_req, res) => {
  const config = getGitHubConnectorConfig();
  res.setHeader("Cache-Control", cacheHeader);
  res.json(toSafeGitHubConnectorStatus(config));
});

router.get("/connectors/github/snapshot", async (_req, res) => {
  const config = getGitHubConnectorConfig();
  res.setHeader("Cache-Control", cacheHeader);

  if (!config.isConfigured) {
    res.json(createGitHubReadonlyReadySnapshot(config.owner, config.repo, config.missing[0] ?? "MISSING_TOKEN"));
    res.json(createGitHubReadonlyReadySnapshot(config.owner, config.repo));
    return;
  }

  try {
    const rawSnapshot = await readGitHubReadonlySnapshot();
    res.json(normalizeGitHubReadonlySnapshot(rawSnapshot));
  } catch (error) {
    const reason = error instanceof GitHubReadonlyClientError
      ? error.message
      : "GitHub read failed with an unexpected backend error.";
    const errorCode = error instanceof GitHubReadonlyClientError ? error.code : "GITHUB_READ_FAILED";
    res.status(error instanceof GitHubReadonlyClientError ? error.statusCode : 502).json(
      createGitHubReadonlyFailedSnapshot(config.owner, config.repo, reason, errorCode),
    res.status(error instanceof GitHubReadonlyClientError ? error.statusCode : 502).json(
      createGitHubReadonlyFailedSnapshot(config.owner, config.repo, reason),
    );
  }
});

export default router;
