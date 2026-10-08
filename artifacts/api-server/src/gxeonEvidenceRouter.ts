/**
 * GXEON Evidence Verify v1 — read-only manifest + free bounded SHA-256 preview.
 * A HTTP 402 on /verify means PAYMENT_DISABLED, not an x402 settlement handshake.
 * No wallet signing or provider operations are reachable from this router.
 */
import { Router, type IRouter } from "express";
import { createEvidenceReceipt, EvidenceInputError, EVIDENCE_CANONICALIZATION, EVIDENCE_MAX_BYTES } from "./gxeonEvidenceCore";

export const gxeonEvidenceRouter: IRouter = Router();
const PRICE_MICRO_USDC = "10000"; // 0.01 USDC in 6 decimal atomic units
const CHAIN = "eip155:8453";
const ASSET = "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913";
const RATE_WINDOW_MS = 60_000;
const MAX_PREVIEWS_PER_WINDOW = 30;
const MAX_CLIENTS = 1000;
const previewsByClient = new Map<string, { since: number; count: number }>();

gxeonEvidenceRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
gxeonEvidenceRouter.get("/evidence/manifest", (_req, res) => {
  res.json({
    name: "GXEON Evidence Verify", version: "1.0.0", status: "PREVIEW_ONLY",
    capability: "SHA-256 receipt of JSON with deterministic recursive UTF-16 key ordering",
    endpoints: { manifest: "/api/gxeon/evidence/manifest",
      preview: "/api/gxeon/evidence/preview", paid: "/api/gxeon/evidence/verify" },
    method: "POST", maxCanonicalBytes: EVIDENCE_MAX_BYTES,
    canonicalization: EVIDENCE_CANONICALIZATION, rfc8785Compatible: false,
    price: { amount: PRICE_MICRO_USDC, asset: ASSET, network: CHAIN, priceUsdc: "0.01" },
    paidExecutionEnabled: false, paymentVerification: "NOT_CONFIGURED",
    x402MiddlewareEnabled: false, settlesUsdc: false,
    preview: { free: true, bestEffortPerProcessRateLimit: MAX_PREVIEWS_PER_WINDOW },
    attestsTruth: false,
  });
});

gxeonEvidenceRouter.post("/evidence/preview", (req, res) => {
  if (!req.is("application/json") && !req.is("application/*+json")) {
    return res.status(415).json({ error: "JSON_REQUIRED" });
  }
  const key = req.ip || "unknown";
  const now = Date.now();
  let last = previewsByClient.get(key);
  if (!last || now - last.since >= RATE_WINDOW_MS) {
    // Capped in-memory best-effort protection. Must add a shared gateway limit before go-live.
    if (previewsByClient.size >= MAX_CLIENTS) {
      for (const [ip, entry] of previewsByClient) {
        if (now - entry.since >= RATE_WINDOW_MS) previewsByClient.delete(ip);
      }
      if (previewsByClient.size >= MAX_CLIENTS) previewsByClient.clear();
    }
    last = { since: now, count: 0 };
    previewsByClient.set(key, last);
  }
  if (last.count >= MAX_PREVIEWS_PER_WINDOW) {
    res.setHeader("Retry-After", String(Math.ceil((RATE_WINDOW_MS - (now - last.since)) / 1000)));
    return res.status(429).json({ error: "PREVIEW_RATE_LIMITED" });
  }
  last.count++;
  try {
    return res.json(createEvidenceReceipt(req.body));
  } catch (error) {
    if (error instanceof EvidenceInputError) {
      const status = error.code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      return res.status(status).json({ error: error.code });
    }
    return res.status(500).json({ error: "EVIDENCE_PREVIEW_FAILED" });
  }
});

gxeonEvidenceRouter.post("/evidence/verify", (_req, res) => {
  // Correct protocol middleware, verified wallet ownership, strict facilitator
  // auth, receipt dedupe, and production deployment review still absent.
  // Do not accept x402 signatures or publish fake settlement events.
  return res.status(402).json({
    error: "PAYMENT_INTEGRATION_NOT_CONFIGURED",
    message: "Paid execution disabled until independent x402 verification and settlement are configured.",
    price: { amount: PRICE_MICRO_USDC, asset: ASSET, network: CHAIN },
    paidExecutionEnabled: false,
    x402PaymentChallengeValid: false,
  });
});
