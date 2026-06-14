import type { Web3TaskPreview, Web3TaskRiskFlag } from "./web3TaskTypes";
import { web3PipelineSafetyFlags, type Web3ExecutionLane, type Web3MonetizationUrgency, type Web3PipelineLinkStatus, type Web3TaskOpportunityPreview, type Web3TaskQueuePreview } from "./web3TaskPipelineTypes";

const criticalFlags: Web3TaskRiskFlag[] = ["SEED_PHRASE_RISK", "UPFRONT_FEE_REQUIRED", "UNKNOWN_SIGNATURE_REQUEST", "MULTI_ACCOUNT_RISK", "SPAM_BEHAVIOR"];

function payoutScore(preview: Web3TaskPreview) { return preview.payoutClarity === "CLEAR" ? 100 : preview.payoutClarity === "PARTIAL" ? 60 : preview.payoutClarity === "LOTTERY_ONLY" ? 15 : 25; }
function urgencyScore(preview: Web3TaskPreview) { return /today|24h|urgent/i.test(preview.deadlineLabel) ? 95 : /48h|short/i.test(preview.deadlineLabel) ? 80 : /week|7d/i.test(preview.deadlineLabel) ? 55 : 35; }
function aiAssistScore(preview: Web3TaskPreview) { return ["content", "dev", "audit", "research", "bounty"].includes(preview.category) ? 85 : preview.category === "community" ? 60 : 45; }
function urgencyLabel(score: number): Web3MonetizationUrgency { return score >= 90 ? "IMMEDIATE" : score >= 75 ? "FAST" : score >= 50 ? "NORMAL" : "LOW"; }
function lane(preview: Web3TaskPreview): Web3ExecutionLane { if (preview.riskScore > 45) return "SKIP"; if (preview.category === "content") return "CONTENT"; if (preview.category === "dev") return "DEV"; if (preview.category === "audit") return "AUDIT"; if (["quest", "community"].includes(preview.category)) return "COMMUNITY"; return "RESEARCH"; }
function priority(score: number): "HIGH" | "MEDIUM" | "LOW" { return score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW"; }

export function qualifyWeb3TaskPreview(preview: Web3TaskPreview) {
  const foundCritical = preview.riskFlags.filter((flag) => criticalFlags.includes(flag));
  const urgency = urgencyScore(preview);
  const payout = payoutScore(preview);
  const aiAssist = aiAssistScore(preview);
  const qualifies = preview.opportunityScore >= 70 && preview.riskScore <= 45 && foundCritical.length === 0;
  const blockingReasons = [
    ...(preview.opportunityScore < 70 ? [`Opportunity score ${preview.opportunityScore} is below 70.`] : []),
    ...(preview.riskScore > 45 ? [`Risk score ${preview.riskScore} is above 45.`] : []),
    ...foundCritical.map((flag) => `Critical risk flag detected: ${flag}.`),
  ];
  const qualificationReasons = qualifies ? ["Opportunity score >= 70.", "Risk score <= 45.", "No critical risk flags detected.", "Manual execution and operator approval remain required."] : blockingReasons;
  const status: Web3PipelineLinkStatus = qualifies ? "QUALIFIED_FOR_TASK_QUEUE" : foundCritical.length || preview.riskScore > 45 ? "BLOCKED_BY_RISK" : "NEEDS_OPERATOR_REVIEW";
  const now = new Date().toISOString();
  const opportunityPreviewId = qualifies ? `w3opp_${Date.now().toString(36)}_${preview.id.slice(-4)}` : null;
  const taskPreviewId = qualifies ? `w3task_${Date.now().toString(36)}_${preview.id.slice(-4)}` : null;
  const suggestedExecutionLane = lane(preview);
  const evidenceChecklist = [...preview.evidenceChecklist, "Operator screenshot of payout terms", "Manual confirmation that no wallet/signature/payment is needed"];
  const submissionPreparationChecklist = ["Read source rules manually", "Draft deliverable inside GXEON", "Prepare evidence package", "Operator reviews source platform outside GXEON", "Operator decides whether to submit manually outside GXEON"];
  const nextManualAction = qualifies ? "Review the opportunity/task previews, prepare a broker route preview, then decide manually outside GXEON." : "Do not execute. Review blocking reasons and either cancel or wait for operator override in a future release.";
  const opportunityPreview: Web3TaskOpportunityPreview | null = qualifies && opportunityPreviewId ? { ...web3PipelineSafetyFlags, id: opportunityPreviewId, web3TaskPreviewId: preview.id, title: `Web3 opportunity preview: ${preview.title}`, sourceUrl: preview.url, summary: `Preview-only conversion from ${preview.source.label}. No external submission is performed.`, estimatedRewardUsd: preview.estimatedRewardUsd, estimatedRewardBrl: preview.estimatedRewardBrl, opportunityScore: preview.opportunityScore, riskScore: preview.riskScore, urgencyScore: urgency, payoutClarityScore: payout, aiAssistScore: aiAssist, urgencyLabel: urgencyLabel(urgency), suggestedExecutionLane, qualificationReasons, blockedActions: preview.blockedActions, createdAt: now } : null;
  const taskPreview: Web3TaskQueuePreview | null = qualifies && opportunityPreviewId && taskPreviewId ? { ...web3PipelineSafetyFlags, id: taskPreviewId, web3TaskPreviewId: preview.id, opportunityPreviewId, title: `Execute manually: ${preview.title}`, summary: `Internal task queue preview for ${preview.rewardLabel}.`, status: "TASK_PREVIEW_READY", priority: priority(preview.opportunityScore), suggestedExecutionLane, evidenceChecklist, submissionPreparationChecklist, nextManualAction, blockedActions: preview.blockedActions, approvalGates: ["Operator approval required", "Manual source verification required", "No wallet or external submission from GXEON"], createdAt: now } : null;
  return { status, opportunityPreviewId, taskPreviewId, opportunityPreview, taskPreview, estimatedRewardUsd: preview.estimatedRewardUsd, estimatedRewardBrl: preview.estimatedRewardBrl, opportunityScore: preview.opportunityScore, riskScore: preview.riskScore, urgencyScore: urgency, payoutClarityScore: payout, aiAssistScore: aiAssist, urgencyLabel: urgencyLabel(urgency), suggestedExecutionLane, qualificationReasons, blockingReasons, criticalRiskFlags: foundCritical };
}
