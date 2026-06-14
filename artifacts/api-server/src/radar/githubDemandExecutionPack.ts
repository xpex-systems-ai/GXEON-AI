import type { ConversionRoute, GitHubDemandConversionPack } from "./githubDemandConversionTypes";
import { executionSafetyFlags, type ExecutionPackRoute, type GitHubDemandExecutionPack } from "./githubDemandExecutionTypes";

const id = (conversionPackId: string) => `ghd_execution_${conversionPackId}_${Date.now().toString(36)}`;
const routeMap: Record<Exclude<ConversionRoute, "SERVICE_OFFER" | "WATCHLIST">, ExecutionPackRoute> = { BOUNTY_ATTEMPT: "BOUNTY_ATTEMPT", REPO_AUDIT: "REPO_AUDIT", DEPLOY_RESCUE: "DEPLOY_RESCUE", DOCS_TEMPLATE: "DOCS_TEMPLATE", MCP_AGENT_INTEGRATION: "MCP_AGENT_INTEGRATION", DATA_API_CONNECTOR: "DATA_API_CONNECTOR" };
const routeFor = (pack: GitHubDemandConversionPack): ExecutionPackRoute => pack.recommendedRoute === "WATCHLIST" || pack.recommendedRoute === "SERVICE_OFFER" ? "SERVICE_DELIVERY" : routeMap[pack.recommendedRoute];

export function generateGitHubDemandExecutionPack(conversionPack: GitHubDemandConversionPack): GitHubDemandExecutionPack {
  const now = new Date().toISOString();
  const route = routeFor(conversionPack);
  const title = `Execution-ready draft: ${conversionPack.offerTitle}`;
  return {
    ...executionSafetyFlags,
    id: id(conversionPack.id), conversionPackId: conversionPack.id, candidateId: conversionPack.candidateId, status: "READY_FOR_OPERATOR", route, source: "GITHUB_DEMAND_EXECUTION_PACK", conversionPack, createdAt: now, updatedAt: now,
    operatorSummary: `PREVIEW_ONLY internal execution package for ${conversionPack.candidate.repository.fullName}. Review scope, evidence, delivery and validation manually before any outside action.`,
    offerTitle: title, suggestedValue: conversionPack.suggestedPrice.brlRange, suggestedTimebox: route === "DEPLOY_RESCUE" ? "2-4 focused hours after manual approval" : "60-120 minutes after manual approval", suggestedPriceReminder: `${conversionPack.suggestedPrice.brlRange}. ${conversionPack.suggestedPrice.rationale}`,
    technicalChecklist: ["Read issue, README, contributing guide and acceptance criteria manually in browser.", ...conversionPack.technicalExecutionPlan, "Prepare local/internal draft only; do not clone or execute candidate repository through GXEON runtime."],
    evidenceChecklist: [...conversionPack.evidenceChecklist, "Screenshots/log excerpts collected manually by operator", "Final evidence confirms no secrets and no runtime repo execution"],
    deliveryArtifacts: ["Internal technical plan", "Manual patch/audit/docs checklist", "Before/after evidence notes", "Copy-only delivery summary draft", ...conversionPack.deliveryChecklist],
    validationChecklist: ["Confirm route remains manual-first", "Validate acceptance criteria against evidence", "Confirm no GitHub write/contact/payment action was run by GXEON", "Confirm ledger remains preview-only"],
    manualReviewChecklist: ["Operator approves scope", "Operator verifies allowed GitHub/client channel", "Operator confirms payment/bounty terms outside runtime", "Operator decides whether to proceed manually"],
    riskWarnings: [...conversionPack.riskWarnings, "Reward/payment not guaranteed; do not claim revenue until externally confirmed."],
    scopeIncluded: conversionPack.scopeBoundary.included,
    scopeExcluded: [...conversionPack.scopeBoundary.excluded, "Cloning or running candidate repositories in GXEON runtime"],
    rollbackBoundaries: ["Archive pack if risk increases", "Stop before external action if terms/channel are unclear", "Do not deliver if acceptance criteria cannot be validated safely"],
    clientPaymentBoundary: ["Payment references are manual preview notes only", "No Mercado Pago or provider API call is created", "Revenue remains unreceived until operator records external confirmation"],
    ledgerPreview: { status: "PREVIEW_ONLY", expectedValueBrl: conversionPack.ledgerPreview.expectedValueBrl, expectedValueUsd: conversionPack.ledgerPreview.expectedValueUsd, amountNotGuaranteed: true, markRevenueReceivedDisabled: true, paymentProviderDisabled: true },
    brainSprintReference: { targetBrl: conversionPack.brainRevenueSprintRecommendation.targetBrl, route: "GITHUB_DEMAND_EXECUTION_PACK_READY", reason: conversionPack.brainRevenueSprintRecommendation.reason, manualReviewRequired: true },
    taskPreviewPayload: { title, checklist: conversionPack.technicalExecutionPlan, copyOnly: true, mode: "PREVIEW_ONLY" },
    brokerRouteHint: { route, priority: "MANUAL_OPERATOR_REVIEW", previewOnly: true },
    nextManualAction: "Operator manually reviews execution pack, then may create preview handoffs. No external action is performed.",
    actionHistory: [{ actionType: "EXECUTION_PACK_CREATED", status: "READY_FOR_OPERATOR", timestamp: now }],
  };
}
