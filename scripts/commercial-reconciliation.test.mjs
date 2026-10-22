import test from "node:test";
import assert from "node:assert/strict";
import { classifyPayment, reconcilePayments } from "./commercial-reconciliation.mjs";

const valid = () => ({
  invoice: { id: "inv-1", status: "ISSUED", amountMinor: 120000, currency: "BRL" },
  event: { provider: "bank", providerEventId: "tx-1", externalEvidenceUrl: "https://example.org/evidence/1",
    invoiceId: "inv-1", status: "SETTLED", providerVerified: true, amountMinor: 120000, currency: "BRL" },
});

test("externally verified settlement passes", () => {
  assert.equal(classifyPayment(valid()).reason, "SETTLED_VERIFIED");
});
test("preview/sample is never revenue", () => {
  const v = valid(); v.event.isSample = true;
  assert.equal(classifyPayment(v).reason, "SAMPLE_DATA");
});
test("pending, forecast and emails cannot prove settlement", () => {
  const v = valid(); v.event.status = "PENDING_PAYMENT";
  assert.equal(classifyPayment(v).reason, "NOT_EXTERNALLY_SETTLED");
});
test("currency mismatch is rejected", () => {
  const v = valid(); v.event.currency = "USDC";
  assert.equal(classifyPayment(v).reason, "CURRENCY_MISMATCH");
});
test("amount mismatch is rejected", () => {
  const v = valid(); v.event.amountMinor = 10;
  assert.equal(classifyPayment(v).reason, "AMOUNT_MISMATCH");
});
test("missing external evidence is rejected", () => {
  const v = valid(); delete v.event.externalEvidenceUrl;
  assert.equal(classifyPayment(v).reason, "UNTRACEABLE_EVENT");
});
test("duplicate provider event is counted once", () => {
  const out = reconcilePayments([valid(), valid()]);
  assert.equal(out.accepted.length, 1);
  assert.equal(out.rejected[0].reason, "DUPLICATE_PROVIDER_EVENT");
});
test("unsafe numeric amount rejected", () => {
  const v = valid(); v.event.amountMinor = 0.01;
  assert.equal(classifyPayment(v).reason, "AMOUNT_MISMATCH");
});
