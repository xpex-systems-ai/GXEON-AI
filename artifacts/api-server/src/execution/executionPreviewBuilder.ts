import type { BrokerApprovalGate, BrokerDecisionPreview } from "../broker/brokerTypes";
import type { ExecutionChecklistItem, ExecutionEvidenceRequirement, ExecutionPreviewCreateInput, ExecutionPreviewRecord } from "./executionTypes";

const safetyBoundary = {
  mode: "PREVIEW_ONLY" as const,
  executionDisabled: true as const,
  approvalRequired: true as const,
  evidenceRequired: true as const,
  externalContact: false as const,
  githubWrites: false as const,
  paymentAction: false as const,
  autonomousExecution: false as const,
};

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)));
}

function gateLabel(gate: string | BrokerApprovalGate): string {
  if (typeof gate === "string") return gate;
  return gate.label || gate.id;
}

function agentIdsFromDecision(decision?: BrokerDecisionPreview): string[] {
  return normalizeList(decision?.recommendedAgents.map((agent) => agent.agentId) ?? []);
}

function gatesFromDecision(decision?: BrokerDecisionPreview): string[] {
  return normalizeList(decision?.approvalGates.map(gateLabel) ?? []);
}

function stableId(prefix: string, index: number): string {
  return `${prefix}_${String(index + 1).padStart(2, "0")}`;
}

function buildChecklist(recommendedAgentIds: string[], approvalGates: string[], blockedActions: string[]): ExecutionChecklistItem[] {
  const base = [
    "Review Broker recommended route",
    "Confirm operator approval gate",
    "Confirm blocked actions remain blocked",
    "Prepare manual work plan",
    "Collect evidence before claiming delivery",
    "Route to Validation Center after manual completion",
  ];
  const agentItems = recommendedAgentIds.map((agentId) => `Review manual role for recommended agent: ${agentId}`);
  const gateItems = approvalGates.map((gate) => `Confirm approval gate remains manual: ${gate}`);
  const blockedItems = blockedActions.map((action) => `Verify blocked action is not attempted: ${action}`);

  return [...base, ...agentItems, ...gateItems, ...blockedItems].map((label, index) => ({
    id: stableId("check", index),
    label,
    required: true,
    completed: false,
    source: index < base.length ? "EXECUTION_CENTER" : gateItems.includes(label) ? "OPERATOR_GATE" : "BROKER",
  }));
}

function buildEvidenceRequirements(title: string, riskEnergy: number, blockedActions: string[]): ExecutionEvidenceRequirement[] {
  const highRiskEvidence = riskEnergy >= 75 ? ["Risk review notes explaining why manual work is safe to continue"] : [];
  const blockedEvidence = blockedActions.map((action) => `Evidence that ${action} stayed disabled during manual work`);
  const base = [
    "Screenshot or report of manual result",
    "Link to PR/commit only if manually created outside runtime",
    "Before/after notes",
    "Operator confirmation",
    "Rollback notes",
  ];

  return [...base, ...highRiskEvidence, ...blockedEvidence].map((label, index) => ({
    id: stableId("evidence", index),
    label,
    required: true,
    collected: false,
    reason: `Required before claiming delivery for preview: ${title}`,
  }));
}

function buildRollbackPlan(title: string, blockedActions: string[]): string[] {
  return [
    `Keep ${title} in preview/manual mode until operator validation is complete.`,
    "Stop manual work and mark the preview BLOCKED if any safety boundary cannot be proven.",
    "Revert only manually-created changes outside the runtime, using the operator-approved rollback notes.",
    "Preserve evidence and route the record back to Broker/Validation review before release.",
    ...blockedActions.map((action) => `Do not use runtime automation for blocked action: ${action}.`),
  ];
}

export function buildExecutionPreview(input: ExecutionPreviewCreateInput, id: string, now: string): ExecutionPreviewRecord {
  const decision = input.brokerDecision;
  const title = (input.title ?? decision?.title ?? "Untitled execution preview").trim();
  const brokerDecisionId = input.brokerDecisionId ?? decision?.id;
  const taskId = input.taskId ?? decision?.taskId ?? null;
  const recommendedAgentIds = normalizeList([...(input.recommendedAgentIds ?? []), ...agentIdsFromDecision(decision)]);
  const blockedActions = normalizeList([...(input.blockedActions ?? []), ...(decision?.blockedActions ?? [])]);
  const approvalGates = normalizeList([...(input.approvalGates ?? []), ...gatesFromDecision(decision)]);
  const riskEnergy = Number.isFinite(input.riskEnergy) ? Number(input.riskEnergy) : decision?.riskEnergy ?? 0;
  const operatorNextAction = input.operatorNextAction ?? decision?.operatorNextAction ?? "Review the manual checklist, collect required evidence and route to Validation Center. Do not execute from runtime.";

  return {
    id,
    brokerDecisionId,
    taskId,
    title,
    status: "READY_FOR_OPERATOR",
    recommendedAgentIds,
    riskEnergy,
    blockedActions,
    approvalGates,
    checklist: buildChecklist(recommendedAgentIds, approvalGates, blockedActions),
    evidenceRequirements: buildEvidenceRequirements(title, riskEnergy, blockedActions),
    blockers: blockedActions.length ? blockedActions.map((action) => `Blocked by P0 safety policy: ${action}`) : [],
    rollbackPlan: buildRollbackPlan(title, blockedActions),
    operatorNextAction,
    createdAt: now,
    updatedAt: now,
    ...safetyBoundary,
  };
}
