/**
 * Deterministic JSON hashing for GXEON Evidence Verify (custom v1 ordering).
 * This is NOT an RFC 8785 implementation, does NOT attest source truth or ownership.
 * Pure functions, no wallet, network, filesystem or payment effects.
 */
import { createHash } from "node:crypto";

export const EVIDENCE_MAX_BYTES = 32_768;
export const EVIDENCE_MAX_DEPTH = 32;
export const EVIDENCE_MAX_NODES = 2048;
export const EVIDENCE_CANONICALIZATION = "recursive-utf16-key-order-v1";

export class EvidenceInputError extends Error {
  constructor(public readonly code: "INVALID_JSON_OBJECT" | "PAYLOAD_TOO_LARGE" | "JSON_DEPTH_EXCEEDED" | "JSON_NODES_EXCEEDED") {
    super(code);
  }
}

export function createEvidenceReceipt(payload: unknown) {
  if (!payload || typeof payload !== "object" || (!Array.isArray(payload) && Object.getPrototypeOf(payload) !== Object.prototype)) {
    throw new EvidenceInputError("INVALID_JSON_OBJECT");
  }
  let nodes = 0;
  const canonicalize = (value: unknown, depth: number): string => {
    if (depth > EVIDENCE_MAX_DEPTH) throw new EvidenceInputError("JSON_DEPTH_EXCEEDED");
    if (++nodes > EVIDENCE_MAX_NODES) throw new EvidenceInputError("JSON_NODES_EXCEEDED");
    if (value === null || typeof value !== "object") {
      const primitive = JSON.stringify(value);
      if (primitive === undefined) throw new EvidenceInputError("INVALID_JSON_OBJECT");
      return primitive;
    }
    if (Array.isArray(value)) {
      return "[" + value.map(x => canonicalize(x, depth + 1)).join(",") + "]";
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new EvidenceInputError("INVALID_JSON_OBJECT");
    }
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    if (keys.length + nodes > EVIDENCE_MAX_NODES) throw new EvidenceInputError("JSON_NODES_EXCEEDED");
    return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize(object[k], depth + 1)).join(",") + "}";
  };
  const canonical = canonicalize(payload, 0);
  const bytes = Buffer.byteLength(canonical, "utf8");
  if (bytes > EVIDENCE_MAX_BYTES) throw new EvidenceInputError("PAYLOAD_TOO_LARGE");
  return {
    algorithm: "sha256" as const,
    digest: createHash("sha256").update(canonical, "utf8").digest("hex"),
    canonicalization: EVIDENCE_CANONICALIZATION,
    bytes,
    verifiedPayment: false as const,
    attestsTruth: false as const,
    disclaimer: "Hash matches canonicalized bytes only; does not attest truth, author or independent provenance.",
  };
}
