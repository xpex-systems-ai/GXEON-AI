import { buildExecutionPreview } from "./executionPreviewBuilder";
import type { ExecutionCenterStatus, ExecutionPreviewCreateInput, ExecutionPreviewRecord, ExecutionPreviewStatus } from "./executionTypes";

export const allowedExecutionPreviewStatuses: ExecutionPreviewStatus[] = [
  "NOT_STARTED",
  "READY_FOR_OPERATOR",
  "BLOCKED",
  "IN_MANUAL_PROGRESS",
  "READY_FOR_REVIEW",
  "CANCELLED",
];

const previews: ExecutionPreviewRecord[] = [];
let sequence = 0;

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

function nextId(): string {
  sequence += 1;
  return `execution_preview_${String(sequence).padStart(6, "0")}`;
}

function clone(record: ExecutionPreviewRecord): ExecutionPreviewRecord {
  return { ...record, recommendedAgentIds: [...record.recommendedAgentIds], blockedActions: [...record.blockedActions], approvalGates: [...record.approvalGates], checklist: record.checklist.map((item) => ({ ...item })), evidenceRequirements: record.evidenceRequirements.map((item) => ({ ...item })), blockers: [...record.blockers], rollbackPlan: [...record.rollbackPlan] };
}

export function createExecutionPreview(input: ExecutionPreviewCreateInput): ExecutionPreviewRecord {
  const now = new Date().toISOString();
  const record = buildExecutionPreview(input, nextId(), now);
  previews.unshift(record);
  return clone(record);
}

export function listExecutionPreviews(): ExecutionPreviewRecord[] {
  return previews.map(clone);
}

export function getExecutionPreviewById(id: string): ExecutionPreviewRecord | null {
  const record = previews.find((preview) => preview.id === id);
  return record ? clone(record) : null;
}

export function updateExecutionPreviewStatus(id: string, status: ExecutionPreviewStatus): ExecutionPreviewRecord | null {
  if (!allowedExecutionPreviewStatuses.includes(status)) {
    throw new Error("EXECUTION_STATUS_NOT_ALLOWED_FOR_PREVIEW_ONLY_RUNTIME");
  }
  const record = previews.find((preview) => preview.id === id);
  if (!record) return null;
  record.status = status;
  record.updatedAt = new Date().toISOString();
  return clone(record);
}

export function clearExecutionPreviewsForTests(): void {
  previews.splice(0, previews.length);
  sequence = 0;
}

export function getExecutionCenterStatus(): ExecutionCenterStatus {
  return {
    status: "EXECUTION_CENTER_P0_READY",
    recordsInMemory: previews.length,
    allowedStatuses: [...allowedExecutionPreviewStatuses],
    boundaries: [
      "Execution Center P0 creates internal manual previews only.",
      "No execute, run, deploy, GitHub write, external contact, payment, worker or scheduler route is exposed.",
      "All previews require operator approval and evidence before validation or release review.",
      "Records are in-memory only and are not persisted to a database.",
    ],
    ...safetyBoundary,
  };
}
