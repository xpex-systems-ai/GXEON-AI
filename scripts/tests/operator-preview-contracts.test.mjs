import { test } from "node:test";
import assert from "node:assert/strict";
import { clientOfferTitleFromWorkspace } from "../../artifacts/api-server/src/clientOffer/clientOfferWorkspaceTitle.ts";
import { operatorWorkflowSafety } from "../../artifacts/api-server/src/operatorWorkflow/operatorWorkflowSafety.ts";
import { clientOfferSafetyFlags } from "../../artifacts/api-server/src/clientOffer/clientOfferSendTypes.ts";

test("uses the actual source repository title, never a missing workspace.title", () => {
  const title = clientOfferTitleFromWorkspace({ sourceRepository: { title: "  Auditoria interna  " } });
  assert.equal(title, "Auditoria interna");
});

test("uses truthful generic label when no source title is known", () => {
  assert.equal(clientOfferTitleFromWorkspace({ sourceRepository: {} }), "Proposta de entrega manual");
  assert.equal(clientOfferTitleFromWorkspace({ sourceRepository: { title: "   " } }), "Proposta de entrega manual");
});

test("operator handoff remains manual-first and no external action", () => {
  assert.equal(operatorWorkflowSafety.manualFirst, true);
  assert.equal(operatorWorkflowSafety.operatorApprovalRequired, true);
  assert.equal(operatorWorkflowSafety.externalContactDisabled, true);
  assert.equal(operatorWorkflowSafety.autoSendDisabled, true);
  assert.equal(operatorWorkflowSafety.paymentProviderDisabled, true);
  assert.equal(operatorWorkflowSafety.githubWriteDisabled, true);
  assert.equal(operatorWorkflowSafety.realRevenueClaimed, false);
});

test("client offer remains copy-only with no payment or revenue claims", () => {
  assert.equal(clientOfferSafetyFlags.mode, "PREVIEW_ONLY");
  assert.equal(clientOfferSafetyFlags.copyOnly, true);
  assert.equal(clientOfferSafetyFlags.autoSendDisabled, true);
  assert.equal(clientOfferSafetyFlags.checkoutDisabled, true);
  assert.equal(clientOfferSafetyFlags.paymentProviderDisabled, true);
  assert.equal(clientOfferSafetyFlags.realRevenueClaimed, false);
});
