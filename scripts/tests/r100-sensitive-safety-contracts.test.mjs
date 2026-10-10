import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { approvedClawlancerId } from "../../artifacts/api-server/src/clawlancer/clawlancerIdentifier.ts";
import { manualPaymentSafetyFlags } from "../../artifacts/api-server/src/manualPayment/manualPaymentRequestTypes.ts";
import { r100DurableSafety } from "../../artifacts/api-server/src/durableState/r100DurableStateTypes.ts";
import { r100WarRoomSafetyFlags } from "../../artifacts/api-server/src/revenueWarRoom/r100WarRoomTypes.ts";
import { ledgerSafetyBoundary } from "../../artifacts/api-server/src/ledger/ledgerBuilder.ts";

const source = (path) => readFileSync(new URL("../../artifacts/api-server/src/" + path, import.meta.url), "utf8");

test("Clawlancer: reject arrays, missing, unprintable and oversize identifiers", () => {
  for (const input of [undefined, null, [], ["one", "two"], 44, "", "   ", "bad\nvalue", "a".repeat(257)]) {
    assert.equal(approvedClawlancerId(input), null);
  }
  assert.equal(approvedClawlancerId("  listing-123  "), "listing-123");
});

test("Manual payment remains copy-only, not provider settlement", () => {
  const s = manualPaymentSafetyFlags;
  assert.equal(s.mode, "PREVIEW_ONLY");
  for (const key of ["copyOnly", "paymentProviderDisabled", "checkoutDisabled", "invoiceDisabled", "webhookDisabled", "paymentNotGuaranteed", "externalContactDisabled", "autoSendDisabled", "ledgerWriteRealDisabled"]) {
    assert.equal(s[key], true, key);
  }
  assert.equal(s.realRevenueClaimed, false);
});

test("R100 durable state never automatically verifies payment or revenue", () => {
  const s = r100DurableSafety;
  for (const key of ["manualFirst", "previewOnly", "noPaymentProviderApi", "noAutoSend", "noGithubWrite", "noExternalContact"]) {
    assert.equal(s[key], true, key);
  }
  assert.equal(s.providerVerifiedRevenueBrl, 0);
  assert.equal(s.realRevenueClaimedAutomatically, false);
});

test("R100 war room reports forecasts only, without payment provider execution", () => {
  const s = r100WarRoomSafetyFlags;
  for (const key of ["manualOnly", "copyOnly", "noAutoSend", "noPaymentApi", "externalContactDisabled", "githubWriteDisabled", "checkoutDisabled"]) {
    assert.equal(s[key], true, key);
  }
  assert.equal(s.realRevenueClaimed, false);
  assert.equal(s.realRevenueBrl, 0);
});

test("Ledger contracts prohibit receipt, real payments and autonomous execution", () => {
  const s = ledgerSafetyBoundary;
  assert.equal(s.mode, "PREVIEW_ONLY");
  assert.equal(s.manualFirst, true);
  assert.equal(s.approvalRequired, true);
  for (const key of ["providerApiDisabled", "paymentCaptureDisabled", "checkoutDisabled", "webhookDisabled", "paymentDisabled", "invoiceDisabled", "receiptDisabled", "databaseWriteDisabled"]) {
    assert.equal(s[key], true, key);
  }
  assert.equal(s.paymentAction, false);
  assert.equal(s.autonomousExecution, false);
  assert.equal(s.realRevenueClaimed, false);
  const ledgerStore = source("ledger/ledgerStore.ts");
  assert.match(ledgerStore, /providerVerifiedRevenueBrl:\s*0/);
  assert.match(ledgerStore, /received_revenue_brl:\s*0/);
  assert.match(ledgerStore, /\.\.\.ledgerSafetyBoundary/);
});

test("Clawlancer external actions keep governance and confirmation before provider call", () => {
  const s = source("routes/clawlancer.ts");
  assert.match(s, /router\.post\("\/clawlancer\/listings\/:id\/claim", governanceAuth/);
  assert.match(s, /router\.post\("\/clawlancer\/transactions\/:id\/deliver", governanceAuth/);
  assert.match(s, /if \(!operatorApproved\(req\)\)/);
  const claim = s.indexOf("claimClawlancerBounty(listingId)");
  const claimValidation = s.indexOf("const listingId = approvedClawlancerId(req.params.id)");
  assert.ok(claimValidation >= 0 && claim > claimValidation);
  const deliver = s.indexOf("deliverClawlancerTransaction(transactionId, deliverable)");
  const deliverValidation = s.indexOf("const transactionId = approvedClawlancerId(req.params.id)");
  assert.ok(deliverValidation >= 0 && deliver > deliverValidation);
});

test("R100 mirror write operations remain gated by explicit action strings", () => {
  const s = source("routes/r100DatabaseMirror.ts");
  assert.match(s, /isConfirmed\(req\.body, "CREATE_SAFE_R100_DB_MIRROR_PROBE"\)/);
  assert.match(s, /isConfirmed\(req\.body, "EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR"\)/);
  assert.match(s, /RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST_ACTION/);
  const durable = source("routes/r100DurableState.ts");
  assert.match(durable, /isConfirmed\(req\.body, "CREATE_SAFE_R100_DURABILITY_PROBE"\)/);
  assert.match(durable, /isConfirmed\(req\.body, "RELOAD_R100_STATE_MANUALLY"\)/);
});

test("R100 readiness safety metadata preserves immutable zero-provider claims", () => {
  const s = source("durableState/r100DatabaseMirrorReadinessService.ts");
  assert.match(s, /\.\.\.r100DurableSafety/);
  assert.match(s, /noCheckout:\s*true/);
  assert.match(s, /noWebhookPaymentCapture:\s*true/);
  assert.match(s, /notPaymentSettlement:\s*true/);
  assert.match(s, /providerVerifiedRevenueBrl:\s*0/);
  assert.match(s, /realRevenueClaimedAutomatically:\s*false/);
});
