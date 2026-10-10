import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { ledgerMetricValues } from "../../artifacts/gxeon-dashboard/src/lib/ledgerMetricValues.ts";

const source = (path) => readFileSync(new URL("../../artifacts/gxeon-dashboard/src/" + path, import.meta.url), "utf8");

test("empty ledger fallback never fabricates revenue, including provider verification", () => {
  const metrics = ledgerMetricValues({
    estimated_revenue_brl: 0, pending_revenue_brl: 0, lost_revenue_brl: 0,
  });
  assert.deepEqual(metrics, {
    estimated_revenue_brl: 0, operatorConfirmedRevenueBrl: 0,
    pending_revenue_brl: 0, providerVerifiedRevenueBrl: 0, lost_revenue_brl: 0,
  });
});

test("operator-confirmed is not mistaken for provider-verified settlement", () => {
  const metrics = ledgerMetricValues({
    estimated_revenue_brl: 300, pending_revenue_brl: 200, lost_revenue_brl: 10,
    operatorConfirmedRevenueBrl: 90, providerVerifiedRevenueBrl: 999,
  });
  assert.equal(metrics.operatorConfirmedRevenueBrl, 90);
  assert.equal(metrics.estimated_revenue_brl, 300);
  assert.equal(metrics.providerVerifiedRevenueBrl, 0);
});

test("nullable GitHub Demand loading state does not require an impossible object", () => {
  const radar = source("pages/GitHubDemandRadarPage.tsx");
  assert.equal((radar.match(/loadingAction\?\.id===p\.id\?\(loadingAction\?\.kind \?\? null\):null/g) ?? []).length, 2);
  assert.match(radar, /NO_PAYMENT/);
  assert.match(radar, /NO_GITHUB_WRITE/);
});

test("monetization runtime status is optional and keeps provider-disabled safety type", () => {
  const monetization = source("services/monetizationService.ts");
  assert.match(monetization, /githubDemandExecution\?:/);
  assert.match(monetization, /readyCount: number/);
  assert.match(monetization, /revenueReceived: false/);
  assert.match(monetization, /providerVerified: false/);
  assert.match(monetization, /paymentProviderDisabled: true/);
});

test("radar preview type has each property once, not duplicate contract keys", () => {
  const radar = source("services/radarService.ts");
  const preview = radar.split("export type GitHubOpportunityPreview = {")[1].split("\n};")[0];
  assert.equal((preview.match(/\bcategory: GitHubOpportunityCategory \| null;/g) ?? []).length, 1);
  assert.equal((preview.match(/\bmaxCandidates: 10;/g) ?? []).length, 1);
  assert.match(preview, /githubWrites: false/);
  assert.match(preview, /persistence: "PREVIEW_ONLY"/);
});
