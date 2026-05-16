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

  // Loopback bypass for local development when no token is configured
  if (isDev && !configuredToken) {
    const ip = req.ip || req.socket?.remoteAddress || "";
    if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "") {
      return next();
    }
  }

  if (!configuredToken) {
    logger.warn("[GovernanceAuth] GOVERNANCE_TOKEN not set — blocking request");
    return res.status(503).json({
      success: false,
      error: "Governance API is not configured. Set GOVERNANCE_TOKEN environment variable.",
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
