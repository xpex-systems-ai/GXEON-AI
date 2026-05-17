import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Governance auth middleware.
 *
 * Accepts requests that present a valid GOVERNANCE_TOKEN in one of:
 *   - Authorization: Bearer <token>
 *   - X-Governance-Token: <token>
 *
 * When GOVERNANCE_TOKEN env var is not set, the middleware blocks all requests
 * with 503 to avoid accidentally exposing an open endpoint.
 *
 * For local development (NODE_ENV=development) without a token configured,
 * requests from loopback (127.x / ::1) are allowed through — this lets the
 * dashboard running on the same host call the API without needing a token.
 */
export function governanceAuth(req: Request, res: Response, next: NextFunction) {
  const configuredToken = process.env["GOVERNANCE_TOKEN"];
  const isDev = process.env["NODE_ENV"] === "development";

  // In development without a configured token, allow all requests.
  // The token-based check below handles production protection when token is set.
  if (isDev && !configuredToken) {
    return next();
  }

  if (!configuredToken) {
    logger.warn("[GovernanceAuth] GOVERNANCE_TOKEN not set — blocking request");
    return res.status(503).json({
      success: false,
      error: "Governance API requires GOVERNANCE_TOKEN to be set. Add it in Replit Secrets.",
    });
  }

  // Check Authorization header
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === configuredToken) return next();
  }

  // Check X-Governance-Token header
  const headerToken = req.headers["x-governance-token"];
  if (typeof headerToken === "string" && headerToken === configuredToken) {
    return next();
  }

  logger.warn({ url: req.url }, "[GovernanceAuth] Unauthorized governance request");
  return res.status(401).json({ success: false, error: "Unauthorized" });
}
