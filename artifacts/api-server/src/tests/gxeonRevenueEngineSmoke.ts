import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import express from "express";
import { createEvidenceReceipt, EvidenceInputError } from "../gxeonEvidenceCore";
import { gxeonEvidenceRouter } from "../gxeonEvidenceRouter";
import { classifyBazaarPreview, normalizeBazaarSeller } from "../radar/gxeonBazaarClassifier";

let server: Server;
let base = "";
before(async () => {
  const app = express();
  app.use(express.json({ limit: "96kb" }));
  app.use("/api/gxeon", gxeonEvidenceRouter);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("HTTP_TEST_LISTEN_FAILED");
  base = `http://127.0.0.1:${addr.port}`;
});
after(async () => {
  if (server?.listening) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
});
const uri = (path: string) => base + "/api/gxeon" + path;

test("canonical SHA-256 hash is invariant to object key insertion order", () => {
  const first = createEvidenceReceipt({ b: 2, a: { x: "hi", n: 1 }, tags: [3, 2, 1] });
  const second = createEvidenceReceipt({ tags: [3, 2, 1], a: { n: 1, x: "hi" }, b: 2 });
  assert.equal(first.digest, second.digest);
  const expected = '{"a":{"n":1,"x":"hi"},"b":2,"tags":[3,2,1]}';
  assert.equal(first.digest, createHash("sha256").update(expected).digest("hex"));
  assert.equal(first.attestsTruth, false);
  assert.equal(first.verifiedPayment, false);
});

test("canonicalizer validates arrays and separates different array orders", () => {
  assert.notEqual(createEvidenceReceipt([1, 2]).digest, createEvidenceReceipt([2, 1]).digest);
  assert.throws(() => createEvidenceReceipt("text"), EvidenceInputError);
  assert.throws(() => createEvidenceReceipt(null), EvidenceInputError);
  assert.throws(() => createEvidenceReceipt({ a: "x".repeat(40000) }), (e: unknown) =>
    e instanceof EvidenceInputError && e.code === "PAYLOAD_TOO_LARGE");
  let deeplyNested: unknown = {};
  for (let i = 0; i < 36; i++) deeplyNested = [deeplyNested];
  assert.throws(() => createEvidenceReceipt(deeplyNested), (e: unknown) =>
    e instanceof EvidenceInputError && e.code === "JSON_DEPTH_EXCEEDED");
});

test("manifest does not advertise paid execution or RFC 8785", async () => {
  const r = await fetch(uri("/evidence/manifest"));
  assert.equal(r.status, 200);
  const body = await r.json() as Record<string, any>;
  assert.equal(body.paidExecutionEnabled, false);
  assert.equal(body.x402MiddlewareEnabled, false);
  assert.equal(body.rfc8785Compatible, false);
  assert.equal(body.price.amount, "10000");
  assert.equal(body.price.network, "eip155:8453");
});

test("HTTP preview produces digest; paid endpoint stays fail closed", async () => {
  const p = await fetch(uri("/evidence/preview"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ b: 1, a: 2 }),
  });
  assert.equal(p.status, 200);
  const preview = await p.json() as Record<string, any>;
  assert.match(preview.digest, /^[0-9a-f]{64}$/);
  assert.equal(preview.verifiedPayment, false);
  const pay = await fetch(uri("/evidence/verify"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ b: 1, a: 2 }),
  });
  assert.equal(pay.status, 402);
  const response = await pay.json() as Record<string, any>;
  assert.equal(response.error, "PAYMENT_INTEGRATION_NOT_CONFIGURED");
  assert.equal(response.x402PaymentChallengeValid, false);
  assert.equal(pay.headers.get("PAYMENT-REQUIRED"), null);
});

test("wrong MIME and oversized canonical JSON are rejected", async () => {
  const bad = await fetch(uri("/evidence/preview"), {
    method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}",
  });
  assert.equal(bad.status, 415);
  const big = await fetch(uri("/evidence/preview"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ long: "x".repeat(33000) }),
  });
  assert.equal(big.status, 413);
});

test("Bazaar item is seller API, not a bounty; prices preserve atomic precision", () => {
  const record = {
    resource: "https://app.tenna.ai/api/x402/tenna/solana_launch_verification",
    serviceName: "TENNA Launch Intelligence",
    tags: ["verification", "Solana"],
    accepts: [{ network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913", amount: "10000" }],
    quality: { l30DaysTotalCalls: 4, l30DaysUniquePayers: 3 },
  };
  const x = normalizeBazaarSeller(record, ["verification"]);
  assert.equal(x.category, "SELLER_API");
  assert.equal(x.priceUsdc, "0.01");
  assert.equal(x.historicPayers30d, 3);
  assert.equal(x.capabilityMatch, true);
  assert.equal(x.eligibleToClaim, false);
  assert.equal(x.fundedJobVerified, false);
  assert.equal(x.gxRevenueVerified, false);
  const preview = classifyBazaarPreview({ items: [record] }, ["verification"]);
  assert.equal(preview.paymentConfirmed, false);
  assert.equal(preview.buyerDemandsVerified, 0);
});

test("Catalog preview rejects malformed resources and caps bulk requests", () => {
  assert.throws(() => classifyBazaarPreview({ items: [{ resource: "file:///etc/passwd" }] }), /BAZAAR_INVALID_ITEM_0/);
  assert.throws(() => classifyBazaarPreview({ items: new Array(26).fill({ resource: "https://example.com" }) }), /BAZAAR_PREVIEW_TOO_LARGE/);
  assert.throws(() => normalizeBazaarSeller({ resource: "https://user:password@example.com" }), /BAZAAR_RESOURCE_URL_INVALID/);
  assert.equal(normalizeBazaarSeller({ resource: "https://example.com", accepts: [{ amount: "10000000000000000000",
    asset: "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913", network: "eip155:8453" }] }).priceUsdc,
    "10000000000000");
});
