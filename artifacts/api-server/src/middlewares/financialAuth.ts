import { createHash } from "node:crypto";
import {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { logger } from "../lib/logger";

type FinancialAuthOptions = {
  requiredScope: string;
};

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
};

type IdempotencyRecord = {
  fingerprint: string;
  statusCode?: number;
  body?: unknown;
  createdAt: number;
  inFlight: boolean;
};

type RateLimitBucket = {
  windowStartedAt: number;
  count: number;
};

type FinancialRequestContext = {
  principal: string;
  scopes: string[];
  requiredScope: string;
};

type FinancialRequest = Request & {
  financialAuth?: FinancialRequestContext;
};

const scopeSeparator = /[\s,]+/;
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const idempotencyRecords = new Map<string, IdempotencyRecord>();

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 30;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function parseScopes(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(scopeSeparator)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = readHeader(req, "authorization");
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  return token || undefined;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function tokenFingerprint(token: string): string {
  return hash(token).slice(0, 16);
}

function routeFingerprint(req: Request): string {
  return hash(
    JSON.stringify({
      method: req.method,
      path: req.originalUrl.split("?")[0],
      body: req.body ?? null,
      query: req.query ?? {},
    }),
  );
}

function hasScope(grantedScopes: string[], requiredScope: string): boolean {
  return grantedScopes.some((scope) => {
    if (scope === "financial:*" || scope === requiredScope) return true;
    if (scope.endsWith(":*")) {
      const prefix = scope.slice(0, -1);
      return requiredScope.startsWith(prefix);
    }
    return false;
  });
}

function cleanupExpiredIdempotencyRecords(now: number) {
  for (const [key, record] of idempotencyRecords.entries()) {
    if (now - record.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyRecords.delete(key);
    }
  }
}

export function financialAuth(options: FinancialAuthOptions) {
  return (req: FinancialRequest, res: Response, next: NextFunction) => {
    const configuredToken =
      process.env["FINANCIAL_AUTH_TOKEN"] || process.env["FINANCIAL_API_TOKEN"];

    if (!configuredToken) {
      logger.warn(
        {
          path: req.originalUrl.split("?")[0],
          requiredScope: options.requiredScope,
        },
        "[FinancialAuth] FINANCIAL_AUTH_TOKEN not set — blocking financial mutation",
      );
      return res.status(503).json({
        success: false,
        error:
          "Financial mutation endpoints require FINANCIAL_AUTH_TOKEN to be configured.",
      });
    }

    const token =
      extractBearerToken(req) || readHeader(req, "x-financial-auth-token");
    if (token !== configuredToken) {
      logger.warn(
        {
          path: req.originalUrl.split("?")[0],
          requiredScope: options.requiredScope,
        },
        "[FinancialAuth] Unauthorized financial mutation request",
      );
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized financial request" });
    }

    const envScopes = parseScopes(
      process.env["FINANCIAL_AUTH_SCOPES"] ||
        process.env["FINANCIAL_API_SCOPES"],
    );
    const headerScopes = parseScopes(readHeader(req, "x-financial-scopes"));
    const grantedScopes =
      headerScopes.length > 0
        ? headerScopes
        : envScopes.length > 0
          ? envScopes
          : ["financial:*"];

    if (!hasScope(grantedScopes, options.requiredScope)) {
      logger.warn(
        {
          path: req.originalUrl.split("?")[0],
          requiredScope: options.requiredScope,
        },
        "[FinancialAuth] Financial scope denied",
      );
      return res.status(403).json({
        success: false,
        error: "Insufficient financial scope",
        requiredScope: options.requiredScope,
      });
    }

    req.financialAuth = {
      principal: `financial-token:${tokenFingerprint(configuredToken)}`,
      scopes: grantedScopes,
      requiredScope: options.requiredScope,
    };

    return next();
  };
}

export function financialRateLimit(options: RateLimitOptions = {}) {
  const windowMs =
    options.windowMs ??
    Number(
      process.env["FINANCIAL_RATE_LIMIT_WINDOW_MS"] ||
        DEFAULT_RATE_LIMIT_WINDOW_MS,
    );
  const maxRequests =
    options.maxRequests ??
    Number(
      process.env["FINANCIAL_RATE_LIMIT_MAX_REQUESTS"] ||
        DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    );

  return (req: FinancialRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const principal = req.financialAuth?.principal ?? req.ip ?? "anonymous";
    const route = req.originalUrl.split("?")[0];
    const bucketKey = `${principal}:${req.method}:${route}`;
    const bucket = rateLimitBuckets.get(bucketKey);

    if (!bucket || now - bucket.windowStartedAt >= windowMs) {
      rateLimitBuckets.set(bucketKey, { windowStartedAt: now, count: 1 });
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader(
        "X-RateLimit-Remaining",
        String(Math.max(maxRequests - 1, 0)),
      );
      return next();
    }

    bucket.count += 1;
    const remaining = Math.max(maxRequests - bucket.count, 0);
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil((bucket.windowStartedAt + windowMs) / 1000)),
    );

    if (bucket.count > maxRequests) {
      logger.warn(
        { route, principal },
        "[FinancialAuth] Financial mutation rate limit exceeded",
      );
      return res
        .status(429)
        .json({
          success: false,
          error: "Financial mutation rate limit exceeded",
        });
    }

    return next();
  };
}

export function financialIdempotency(
  req: FinancialRequest,
  res: Response,
  next: NextFunction,
) {
  const idempotencyKey = readHeader(req, "idempotency-key");
  if (!idempotencyKey) {
    return res
      .status(428)
      .json({ success: false, error: "Idempotency-Key header is required" });
  }

  const now = Date.now();
  cleanupExpiredIdempotencyRecords(now);

  const principal = req.financialAuth?.principal ?? "anonymous";
  const storageKey = `${principal}:${req.method}:${req.originalUrl.split("?")[0]}:${idempotencyKey}`;
  const fingerprint = routeFingerprint(req);
  const existing = idempotencyRecords.get(storageKey);

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return res
        .status(409)
        .json({ success: false, error: "Idempotency-Key payload mismatch" });
    }

    if (existing.inFlight) {
      return res
        .status(409)
        .json({
          success: false,
          error: "Idempotency-Key request is already in progress",
        });
    }

    res.setHeader("Idempotency-Replayed", "true");
    return res.status(existing.statusCode ?? 200).json(existing.body);
  }

  idempotencyRecords.set(storageKey, {
    fingerprint,
    createdAt: now,
    inFlight: true,
  });

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const record = idempotencyRecords.get(storageKey);
    if (record) {
      if (res.statusCode >= 200 && res.statusCode < 500) {
        idempotencyRecords.set(storageKey, {
          fingerprint,
          createdAt: record.createdAt,
          inFlight: false,
          statusCode: res.statusCode,
          body,
        });
      } else {
        idempotencyRecords.delete(storageKey);
      }
    }
    return originalJson(body);
  };

  res.on("finish", () => {
    const record = idempotencyRecords.get(storageKey);
    if (record?.inFlight) {
      idempotencyRecords.delete(storageKey);
    }
  });

  return next();
}

export function financialMutation(requiredScope: string): RequestHandler[] {
  return [
    financialAuth({ requiredScope }),
    financialRateLimit(),
    financialIdempotency,
  ];
}
