import { runReadOnlyAgentFixture } from "../artifacts/api-server/src/agentos/readOnlyWorker.ts";
const result = runReadOnlyAgentFixture();
if (!result.independentlyVerified || !result.verifiedEventChain ||
    result.status !== "AWAITING_HUMAN_APPROVAL" || result.externalActions !== 0 ||
    result.modelCalls !== 0 || result.toolCalls !== 2) {
  throw new Error("AGENTOS_READONLY_WORKER_DEMO_FAILED");
}
process.stdout.write(JSON.stringify({
  kind: result.type,
  status: result.status,
  toolCalls: result.toolCalls,
  systemsInspected: result.systemsInspected,
  findings: result.findings,
  proposedActions: result.plan,
  evidenceDigest: result.evidenceDigest,
  verifiedEventChain: result.verifiedEventChain,
  independentlyVerified: result.independentlyVerified,
  modelCalls: result.modelCalls,
  externalActions: result.externalActions,
  providerVerifiedRevenueBrl: result.providerVerifiedRevenueBrl,
  realWorldSystemsAccessed: result.realWorldSystemsAccessed,
}, null, 2)+"\n");
