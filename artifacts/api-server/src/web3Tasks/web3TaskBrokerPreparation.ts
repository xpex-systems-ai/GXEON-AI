import type { Web3TaskPipelineLinkRecord } from "./web3TaskPipelineTypes";

export function prepareWeb3TaskBrokerPreview(link: Web3TaskPipelineLinkRecord) {
  if (link.status !== "QUALIFIED_FOR_TASK_QUEUE" || !link.taskPreview) throw new Error("WEB3_PIPELINE_LINK_NOT_QUALIFIED_FOR_BROKER_PREVIEW");
  return {
    mode: "PREVIEW_ONLY" as const,
    routePreviewOnly: true,
    mutationPerformed: false,
    linkId: link.id,
    taskPreviewId: link.taskPreviewId,
    title: link.taskPreview.title,
    recommendedAgents: ["Scout Agent", "Analyst Agent", "Evidence Agent", "Task Agent", "Security Agent", "Operator Copilot"],
    blockedActions: ["wallet_connection", "external_submission", "reward_claim", "payment_action", "github_write", "autonomous_execution"],
    approvalGates: ["Operator approval", "Manual evidence review", "Manual source-platform review outside GXEON"],
    forbiddenActions: link.taskPreview.blockedActions,
    nextManualAction: "Operator reviews this broker preparation, then manually decides the next step. GXEON does not execute or submit externally.",
    manualExecutionRequired: true,
    externalSubmissionDisabled: true,
    walletConnectionRequired: false,
    rewardNotGuaranteed: true,
    operatorApprovalRequired: true,
  };
}
