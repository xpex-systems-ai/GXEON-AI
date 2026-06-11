import type { OpportunityRecord } from "../opportunities/opportunityTypes";
import { generateTaskPreview } from "../opportunities/taskPreviewEngine";
import type { CreateTaskFromOpportunityRequest, TaskQueueCounts, TaskQueuePriority, TaskQueueReadinessStatus, TaskQueueRecord, TaskQueueStatus } from "./taskQueueTypes";

const tasks = new Map<string, TaskQueueRecord>();
const opportunityTaskIndex = new Map<string, string>();

export const taskQueueSafeTransitions: Record<TaskQueueStatus, TaskQueueStatus[]> = {
  TASK_READY: ["APPROVAL_REQUIRED", "APPROVED_FOR_MANUAL_EXECUTION", "BLOCKED", "CANCELLED"],
  APPROVAL_REQUIRED: ["APPROVED_FOR_MANUAL_EXECUTION", "BLOCKED", "CANCELLED"],
  APPROVED_FOR_MANUAL_EXECUTION: ["IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"],
  BLOCKED: ["TASK_READY", "APPROVAL_REQUIRED", "CANCELLED"],
  IN_REVIEW: ["DONE", "BLOCKED", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

function now(): string {
  return new Date().toISOString();
}

function createId(prefix = "p1_task"): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function priorityFor(opportunity: OpportunityRecord): TaskQueuePriority {
  if (opportunity.score >= 80 || opportunity.riskFlags.includes("high_complexity")) return "HIGH";
  if (opportunity.score >= 50) return "MEDIUM";
  return "LOW";
}

function sanitizeOptionalId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : undefined;
}

export function createTaskFromOpportunity(opportunity: OpportunityRecord, request: CreateTaskFromOpportunityRequest = {}): TaskQueueRecord {
  if (request.operatorConfirmed !== true) throw new Error("OPERATOR_CONFIRMATION_REQUIRED");
  if (!["TASK_READY", "EVIDENCE_READY", "EXECUTION_READY"].includes(opportunity.status)) throw new Error("OPPORTUNITY_TASK_PREVIEW_REQUIRED");

  const duplicate = request.duplicate === true;
  const existingTaskId = opportunityTaskIndex.get(opportunity.id);
  if (!duplicate && existingTaskId) {
    const existing = tasks.get(existingTaskId);
    if (existing) throw new Error("TASK_ALREADY_EXISTS_FOR_OPPORTUNITY");
  }

  const preview = generateTaskPreview(opportunity);
  const timestamp = now();
  const task: TaskQueueRecord = {
    id: createId(),
    opportunityId: opportunity.id,
    proposalPreviewId: sanitizeOptionalId(request.proposalPreviewId),
    taskPreviewId: sanitizeOptionalId(request.taskPreviewId) ?? preview.id,
    evidencePlanId: sanitizeOptionalId(request.evidencePlanId),
    status: "APPROVAL_REQUIRED",
    priority: priorityFor(opportunity),
    title: opportunity.title,
    summary: opportunity.problemSummary,
    category: opportunity.category,
    score: opportunity.score,
    riskFlags: opportunity.riskFlags,
    nextStep: opportunity.recommendedNextStep,
    sourceUrl: opportunity.sourceUrl,
    repository: opportunity.repository,
    executionChecklist: preview.executionChecklist,
    requiredConnectors: preview.requiredConnectors,
    approvalGates: preview.approvalGates,
    forbiddenActions: preview.forbiddenActions,
    evidenceRequirements: preview.evidenceRequirements,
    rollbackRequirements: preview.rollbackRequirements,
    manualApprovalRequired: true,
    autonomousExecution: false,
    externalAction: false,
    paymentAction: false,
    operatorConfirmed: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  tasks.set(task.id, task);
  if (!duplicate) opportunityTaskIndex.set(opportunity.id, task.id);
  return task;
}

export function listTasks(): TaskQueueRecord[] {
  return Array.from(tasks.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getTaskById(id: string): TaskQueueRecord | null {
  return tasks.get(id) ?? null;
}

export function updateTaskStatus(id: string, nextStatus: TaskQueueStatus): TaskQueueRecord {
  const task = tasks.get(id);
  if (!task) throw new Error("TASK_NOT_FOUND");
  if (!taskQueueSafeTransitions[task.status].includes(nextStatus)) throw new Error("TASK_STATUS_TRANSITION_NOT_ALLOWED");
  const updated: TaskQueueRecord = { ...task, status: nextStatus, updatedAt: now() };
  tasks.set(id, updated);
  return updated;
}

export function getTaskQueueCounts(): TaskQueueCounts {
  const counts: TaskQueueCounts = {
    total: tasks.size,
    open: 0,
    blocked: 0,
    approvedForManualExecution: 0,
    done: 0,
    cancelled: 0,
    TASK_READY: 0,
    APPROVAL_REQUIRED: 0,
    APPROVED_FOR_MANUAL_EXECUTION: 0,
    BLOCKED: 0,
    IN_REVIEW: 0,
    DONE: 0,
    CANCELLED: 0,
  };
  for (const task of tasks.values()) {
    counts[task.status] += 1;
    if (!["DONE", "CANCELLED"].includes(task.status)) counts.open += 1;
    if (task.status === "BLOCKED") counts.blocked += 1;
    if (task.status === "APPROVED_FOR_MANUAL_EXECUTION") counts.approvedForManualExecution += 1;
    if (task.status === "DONE") counts.done += 1;
    if (task.status === "CANCELLED") counts.cancelled += 1;
  }
  return counts;
}

export function getTaskQueueReadinessStatus(): TaskQueueReadinessStatus {
  return {
    status: "P1_TASK_QUEUE_READY",
    persistence: "IN_MEMORY_P1",
    manualFirst: true,
    manualApprovalRequired: true,
    autonomousExecution: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    executionEndpointExposed: false,
    counts: getTaskQueueCounts(),
    safeTransitions: taskQueueSafeTransitions,
    boundaries: [
      "Internal P1 tasks only; no autonomous execution.",
      "Operator confirmation is required to create or approve manual execution.",
      "No external contact, GitHub writes, payment-link creation or payment captures.",
      "Approval changes task status only; it does not run code, deploy or deliver work.",
    ],
  };
}
