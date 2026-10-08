/**
 * GXEON Evidence Verify v1 — deterministic commercial API capability.
 * Mount under /api/gxeon using app.use('/api/gxeon', gxeonEvidenceRouter).
 * Read-only and safe: no wallet keys, blockchain calls, or payment assumptions.
 */
import { Router } from "express";
import { createHash } from "node:crypto";
export const gxeonEvidenceRouter = Router();
const PRICE_MICRO_USDC = "10000"; // 0.01 USDC, not a settled payment
const CHAIN = "eip155:8453";
const ASSET = "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913";
const MAX_BYTES = 32_768;
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return "{" + Object.keys(obj).sort().map(k => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}
gxeonEvidenceRouter.get("/evidence/manifest", (_req, res) => {
  res.json({name:"GXEON Evidence Verify",version:"1.0.0",status:"preview",
    capability:"sha256 canonical JSON evidence receipt",
    endpoint:"/api/gxeon/evidence/verify", method:"POST",
    price:{amount:PRICE_MICRO_USDC,asset:ASSET,network:CHAIN},
    paidExecutionEnabled:false, paymentVerification:"NOT_CONFIGURED"});
});
gxeonEvidenceRouter.post("/evidence/preview", (req, res) => {
  if (!req.is("application/json")) return res.status(415).json({error:"JSON_REQUIRED"});
  if (req.body === undefined || req.body === null || typeof req.body !== "object")
    return res.status(400).json({error:"INVALID_JSON_OBJECT"});
  const canonical = canonicalize(req.body);
  if (Buffer.byteLength(canonical,"utf8") > MAX_BYTES) return res.status(413).json({error:"PAYLOAD_TOO_LARGE"});
  return res.json({algorithm:"sha256",digest:createHash("sha256").update(canonical).digest("hex"),
    canonicalization:"recursive lexicographic keys v1",verifiedPayment:false,
    disclaimer:"Hashing proves content integrity, not truth or authenticity of submitted claims."});
});
gxeonEvidenceRouter.post("/evidence/verify", (_req, res) => {
  // Fail closed until independently verified x402 settlement middleware is wired.
  return res.status(402).json({error:"PAYMENT_INTEGRATION_NOT_CONFIGURED",
    message:"Paid execution disabled until verified x402 settlement is installed.",
    price:{amount:PRICE_MICRO_USDC,asset:ASSET,network:CHAIN},
    paidExecutionEnabled:false});
});
