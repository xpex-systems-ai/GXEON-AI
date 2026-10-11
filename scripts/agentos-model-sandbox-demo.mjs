import { evaluateOfflineModelProposal } from "../artifacts/api-server/src/agentos/modelSandbox.ts";
const report=evaluateOfflineModelProposal();
if(!report.verifiedEventChain || !report.modelProposalValidated ||
 report.status!=="AWAITING_HUMAN_APPROVAL" || report.actualModelCalls!==0 ||
 report.externalActions!==0 || report.actualProviderCostUsd!==0) {
  throw new Error("AGENTOS_MODEL_SANDBOX_DEMO_FAILED");
}
process.stdout.write(JSON.stringify({
 mode:report.safety.mode,
 status:report.status,
 observedFindings:report.findings,
 modelAdapter:report.driver,
 actualModelCalls:report.actualModelCalls,
 simulatedModelCalls:report.mockedModelCalls,
 fixtureToolReads:report.fixtureToolReads,
 requestPreviewDigest:report.requestPreviewDigest,
 independentEvidenceDigest:report.independentEvidenceDigest,
 providerCostUsd:report.actualProviderCostUsd,
 approvedForExecution:report.approvedForExecution,
},null,2)+"\n");
