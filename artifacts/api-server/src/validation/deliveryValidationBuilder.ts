import type { DeliveryEvidencePreview, DeliveryValidationCreateInput, DeliveryValidationPreviewRecord } from "./deliveryValidationTypes";

const safetyBoundary = {
  mode: "PREVIEW_ONLY" as const,
  approvalRequired: true as const,
  evidenceRequired: true as const,
  releaseDisabled: true as const,
  executionDisabled: true as const,
  externalContact: false as const,
  githubWrites: false as const,
  paymentAction: false as const,
  autonomousExecution: false as const,
};

const defaultAcceptanceCriteria = [
  "Operator reviewed execution preview",
  "All required evidence labels are accounted for",
  "Blocked actions remained blocked",
  "Rollback notes are present",
  "Manual validation notes are ready",
  "Release Gate remains disabled until operator review",
];

export const defaultNextManualGate = "Attach or describe evidence manually, then move to Manual Review. Do not release automatically.";

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const record = item as { label?: unknown; reason?: unknown; id?: unknown };
      return typeof record.label === "string" ? record.label : typeof record.reason === "string" ? record.reason : typeof record.id === "string" ? record.id : "";
    }
    return "";
  }).map((item) => item.trim()).filter(Boolean)));
}

function stableId(prefix: string, index: number): string {
  return `${prefix}_${String(index + 1).padStart(2, "0")}`;
}

function buildAcceptanceCriteria(input: DeliveryValidationCreateInput, evidenceChecklist: string[], blockedActions: string[]): string[] {
  const checklistCriteria = normalizeList(input.checklist).map((item) => `Execution checklist reviewed: ${item}`);
  const evidenceCriteria = evidenceChecklist.map((item) => `Evidence accounted for: ${item}`);
  const blockedCriteria = blockedActions.map((action) => `Blocked action remained disabled: ${action}`);
  return Array.from(new Set([...defaultAcceptanceCriteria, ...checklistCriteria, ...evidenceCriteria, ...blockedCriteria]));
}

function buildEvidence(evidenceChecklist: string[], attachedLabels: string[]): DeliveryEvidencePreview[] {
  const attached = new Set(attachedLabels.map((label) => label.trim().toLowerCase()).filter(Boolean));
  return evidenceChecklist.map((label, index) => {
    const isAttached = attached.has(label.toLowerCase());
    return {
      id: stableId("validation_evidence", index),
      label,
      state: isAttached ? "MANUAL_ATTACHED" as const : "MISSING" as const,
      required: true as const,
      source: "EXECUTION_PREVIEW" as const,
      note: isAttached ? "Operator supplied this evidence label manually; still requires manual review." : "Evidence label required before validation can move toward release review.",
      attachedAt: isAttached ? new Date(0).toISOString() : undefined,
    };
  });
}

export function buildDeliveryValidationPreview(input: DeliveryValidationCreateInput, id: string, now: string): DeliveryValidationPreviewRecord {
  const title = (input.title ?? "Untitled delivery validation preview").trim();
  const blockedActions = normalizeList(input.blockedActions);
  const evidenceChecklist = normalizeList(input.evidenceRequirements);
  const fallbackEvidence = evidenceChecklist.length ? evidenceChecklist : [
    "Screenshot or report of manual result",
    "Before/after notes",
    "Operator confirmation",
    "Rollback notes",
  ];
  const attachedLabels = normalizeList(input.attachedEvidenceLabels);
  const evidence = buildEvidence(fallbackEvidence, attachedLabels);
  const hasAttachedEvidence = evidence.some((item) => item.state === "MANUAL_ATTACHED");
  const missingEvidence = evidence.some((item) => item.state === "MISSING");
  const rollbackPlan = normalizeList(input.rollbackPlan);
  const acceptanceCriteria = buildAcceptanceCriteria(input, fallbackEvidence, blockedActions);

  return {
    id,
    executionPreviewId: input.executionPreviewId,
    brokerDecisionId: input.brokerDecisionId,
    taskId: input.taskId,
    title,
    validationStatus: hasAttachedEvidence && !missingEvidence ? "MANUAL_REVIEW" : hasAttachedEvidence ? "EVIDENCE_ATTACHED" : "AWAITING_EVIDENCE",
    approvalState: "PENDING_REVIEW",
    evidenceState: hasAttachedEvidence && !missingEvidence ? "READY_FOR_REVIEW" : hasAttachedEvidence ? "MANUAL_ATTACHED" : "MISSING",
    rejectionState: "NONE",
    revisionState: "NONE",
    riskEnergy: Number.isFinite(input.riskEnergy) ? Number(input.riskEnergy) : 0,
    blockedActions,
    acceptanceCriteria,
    evidenceChecklist: fallbackEvidence,
    evidence,
    manualNotes: input.manualNotes ?? "Manual evidence review has not been completed. No real delivery is approved.",
    nextManualGate: input.operatorNextAction ?? defaultNextManualGate,
    outcomeSummary: `Preview-only validation record for ${title}. Evidence and approval remain manual; release is disabled.`,
    createdAt: now,
    updatedAt: now,
    ...safetyBoundary,
  };
}
