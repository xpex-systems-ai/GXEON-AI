/**
 * OpenAPI contract for an independently reviewable, free Evidence Verify preview.
 * Explicitly does not claim paid x402 support or buyer attestations.
 */
export const gxeonEvidenceOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "GXEON Evidence Verify — Preview",
    version: "1.0.0",
    description: "Read-only SHA-256 JSON receipt. Deterministic UTF-16 key ordering; NOT RFC 8785, document truth or payment attestation. The paid route is disabled.",
  },
  "x-gxeon-status": {
    execution: "PREVIEW_ONLY", paymentMiddleware: "NOT_CONFIGURED",
    providerVerifiedRevenue: false,
    networkPlanned: "eip155:8453",
    amountMicroUsdcPlanned: "10000",
    walletOwnershipVerified: false,
  },
  paths: {
    "/api/gxeon/evidence/manifest": {
      get: {
        operationId: "gxeonEvidenceManifest",
        summary: "Get the public Evidence Verify manifest; no payment",
        responses: { "200": { description: "Current preview capability and planned price" } },
      },
    },
    "/api/gxeon/evidence/preview": {
      post: {
        operationId: "gxeonEvidencePreview",
        summary: "Free SHA-256 receipt for JSON arrays or objects",
        description: "32 KiB canonical JSON, at most 2,048 nodes and nesting depth 32. Not evidence of data truth.",
        requestBody: { required: true, content: { "application/json": {
          schema: { anyOf: [{ type: "object" }, { type: "array" }] },
          example: { document: "example", version: 1 },
        } } },
        responses: {
          "200": { description: "SHA-256 receipt (verifiedPayment and attestsTruth are false)",
            content: { "application/json": { schema: { type: "object",
              required: ["algorithm", "digest", "canonicalization", "verifiedPayment", "attestsTruth"],
              properties: {
                algorithm: { type: "string", const: "sha256" },
                digest: { type: "string", pattern: "^[0-9a-f]{64}$" },
                canonicalization: { type: "string", const: "recursive-utf16-key-order-v1" },
                verifiedPayment: { type: "boolean", const: false },
                attestsTruth: { type: "boolean", const: false },
                bytes: { type: "integer", minimum: 1 },
              },
            } } } },
          "400": { description: "Invalid JSON structure or nesting limit" },
          "413": { description: "Canonical payload too large" },
          "415": { description: "JSON required" },
          "429": { description: "Rate-limited locally; shared gateway limits needed for scale" },
        },
      },
    },
    "/api/gxeon/evidence/verify": {
      post: {
        operationId: "gxeonEvidencePaidReserved",
        summary: "Reserved for paid x402 (not operational)",
        description: "Always responds HTTP 402 without a protocol payment challenge. No payment payloads, keys or signatures are accepted.",
        responses: { "402": { description: "PAYMENT_INTEGRATION_NOT_CONFIGURED" } },
      },
    },
  },
} as const;
