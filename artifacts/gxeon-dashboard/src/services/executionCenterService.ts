import { apiUrl, getApiBaseDiagnostic } from "./apiBase";
import type { BrokerDecisionPreview } from "./brokerService";

export type ExecutionMode = "PREVIEW_ONLY";
export type ExecutionPreviewStatus = "NOT_STARTED" | "READY_FOR_OPERATOR" | "BLOCKED" | "IN_MANUAL_PROGRESS" | "READY_FOR_REVIEW" | "CANCELLED";

export type ExecutionChecklistItem = {
  id: string;
  label: string;
  required: true;
  completed: false;
  source: "BROKER" | "EXECUTION_CENTER" | "OPERATOR_GATE";
};

export type ExecutionEvidenceRequirement = {
  id: string;
  label: string;
  required: true;
  collected: false;
  reason: string;
};

export type ExecutionPreviewRecord = {
  id: string;
  brokerDecisionId?: string;
  taskId?: string | null;
  title: string;
  status: ExecutionPreviewStatus;
  mode: ExecutionMode;
  recommendedAgentIds: string[];
  riskEnergy: number;
  blockedActions: string[];
  approvalGates: string[];
  checklist: ExecutionChecklistItem[];
  evidenceRequirements: ExecutionEvidenceRequirement[];
  blockers: string[];
  rollbackPlan: string[];
  operatorNextAction: string;
  executionDisabled: true;
  approvalRequired: true;
  evidenceRequired: true;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  autonomousExecution: false;
  createdAt: string;
  updatedAt: string;
};

export type ExecutionCenterStatus = {
  status: "EXECUTION_CENTER_P0_READY" | "EXECUTION_CENTER_P0_FALLBACK";
  mode: ExecutionMode;
  approvalRequired: true;
  executionDisabled: true;
  evidenceRequired: true;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  recordsInMemory: number;
  allowedStatuses: ExecutionPreviewStatus[];
  boundaries: string[];
  diagnostics?: {
    apiBase: string;
    attemptedRoute: string;
    failureType: "network_error" | "non_json" | "non_2xx" | "invalid_json" | "misconfigured_backend_url" | "unknown";
    message: string;
  };
};

export type ExecutionPreviewCreateInput = {
  brokerDecisionId?: string;
  brokerDecision?: BrokerDecisionPreview;
  title?: string;
  taskId?: string | null;
  recommendedAgentIds?: string[];
  riskEnergy?: number;
  blockedActions?: string[];
  approvalGates?: string[];
  operatorNextAction?: string;
};

async function readJson<T>(response: Response, route: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();
  if (!bodyText.trim()) throw new Error(`REQUEST_FAILED_${response.status}: Empty response body from ${route}`);
  if (!contentType.toLowerCase().includes("application/json")) {
    const bodyExcerpt = bodyText.trim().slice(0, 160);
    throw new Error(`BACKEND_NON_JSON_RESPONSE: ${route} returned ${response.status}${bodyExcerpt ? ` - ${bodyExcerpt}` : ""}`);
  }

  let payload: { success?: boolean; data?: T; error?: string; message?: string };
  try {
    payload = JSON.parse(bodyText) as { success?: boolean; data?: T; error?: string; message?: string };
  } catch {
    throw new Error(`BACKEND_INVALID_JSON_RESPONSE: ${route} returned ${response.status}`);
  }

  if (!response.ok || !payload.success) throw new Error(`REQUEST_FAILED_${response.status}: ${payload.message ?? payload.error ?? "Execution Center request failed"}`);
  return payload.data as T;
}

function classifyExecutionFailure(error: unknown): NonNullable<ExecutionCenterStatus["diagnostics"]>["failureType"] {
  if (!(error instanceof Error)) return "unknown";
  if (error.message.startsWith("BACKEND_URL_MISCONFIGURED")) return "misconfigured_backend_url";
  if (error.message.startsWith("BACKEND_NON_JSON_RESPONSE")) return "non_json";
  if (error.message.startsWith("BACKEND_INVALID_JSON_RESPONSE")) return "invalid_json";
  if (error.message.startsWith("REQUEST_FAILED_")) return "non_2xx";
  return "network_error";
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "EXECUTION_CENTER_BACKEND_UNAVAILABLE";
}

export function fallbackExecutionStatus(error?: unknown, attemptedRoute = "/api/execution/status"): ExecutionCenterStatus {
  return {
    status: "EXECUTION_CENTER_P0_FALLBACK",
    mode: "PREVIEW_ONLY",
    approvalRequired: true,
    executionDisabled: true,
    evidenceRequired: true,
    autonomousExecution: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    recordsInMemory: 0,
    allowedStatuses: ["NOT_STARTED", "READY_FOR_OPERATOR", "BLOCKED", "IN_MANUAL_PROGRESS", "READY_FOR_REVIEW", "CANCELLED"],
    boundaries: [
      "Backend unavailable; dashboard is showing safe preview-only fallback state.",
      "No execute, deploy, GitHub write, external contact or payment control is enabled.",
    ],
    diagnostics: {
      apiBase: getApiBaseDiagnostic(),
      attemptedRoute,
      failureType: classifyExecutionFailure(error),
      message: failureMessage(error),
    },
  };
}

function fallbackExecutionPreview(input: ExecutionPreviewCreateInput, reason: string): ExecutionPreviewRecord {
  const now = new Date().toISOString();
  return {
    id: `execution_fallback_${Date.now()}`,
    brokerDecisionId: input.brokerDecisionId ?? input.brokerDecision?.id,
    taskId: input.taskId ?? input.brokerDecision?.taskId ?? null,
    title: input.title ?? input.brokerDecision?.title ?? "Fallback execution preview",
    status: "READY_FOR_OPERATOR",
    mode: "PREVIEW_ONLY",
    recommendedAgentIds: input.recommendedAgentIds ?? input.brokerDecision?.recommendedAgents.map((agent) => agent.agentId) ?? ["operator_copilot"],
    riskEnergy: input.riskEnergy ?? input.brokerDecision?.riskEnergy ?? 90,
    blockedActions: input.blockedActions ?? input.brokerDecision?.blockedActions ?? ["external_contact", "github_write", "payment_action", "autonomous_execution"],
    approvalGates: input.approvalGates ?? input.brokerDecision?.approvalGates.map((gate) => gate.label) ?? ["operator_review_required"],
    checklist: ["Review Broker recommended route", "Confirm operator approval gate", "Collect evidence before claiming delivery", "Route to Validation Center after manual completion"].map((label, index) => ({ id: `fallback_check_${index + 1}`, label, required: true, completed: false, source: "EXECUTION_CENTER" as const })),
    evidenceRequirements: ["Screenshot or report of manual result", "Operator confirmation", "Rollback notes"].map((label, index) => ({ id: `fallback_evidence_${index + 1}`, label, required: true, collected: false, reason })),
    blockers: [reason],
    rollbackPlan: ["Keep work manual and preview-only.", "Do not execute from runtime fallback data.", "Retry after backend availability is restored."],
    operatorNextAction: "Check backend availability, then create a new Execution Center preview. Do not execute from fallback data.",
    executionDisabled: true,
    approvalRequired: true,
    evidenceRequired: true,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    autonomousExecution: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function fetchExecutionCenterStatus(signal?: AbortSignal): Promise<ExecutionCenterStatus> {
  try {
    return await readJson<ExecutionCenterStatus>(await fetch(apiUrl("/api/execution/status"), { headers: { Accept: "application/json" }, signal }), "/api/execution/status");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackExecutionStatus(error);
  }
}

export async function fetchExecutionPreviews(signal?: AbortSignal): Promise<ExecutionPreviewRecord[]> {
  try {
    const data = await readJson<{ executionPreviews: ExecutionPreviewRecord[] }>(await fetch(apiUrl("/api/execution/previews"), { headers: { Accept: "application/json" }, signal }), "/api/execution/previews");
    return data.executionPreviews;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}

export async function fetchExecutionPreviewById(id: string, signal?: AbortSignal): Promise<ExecutionPreviewRecord | null> {
  try {
    const data = await readJson<{ executionPreview: ExecutionPreviewRecord }>(await fetch(apiUrl(`/api/execution/previews/${id}`), { headers: { Accept: "application/json" }, signal }), `/api/execution/previews/${id}`);
    return data.executionPreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function createExecutionPreview(input: ExecutionPreviewCreateInput): Promise<ExecutionPreviewRecord> {
  try {
    const data = await readJson<{ executionPreview: ExecutionPreviewRecord }>(await fetch(apiUrl("/api/execution/previews"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), "/api/execution/previews");
    return data.executionPreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackExecutionPreview(input, failureMessage(error));
  }
}

export async function updateExecutionPreviewStatus(id: string, status: ExecutionPreviewStatus): Promise<ExecutionPreviewRecord | null> {
  try {
    const data = await readJson<{ executionPreview: ExecutionPreviewRecord }>(await fetch(apiUrl(`/api/execution/previews/${id}/status`), { method: "PATCH", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ status }) }), `/api/execution/previews/${id}/status`);
    return data.executionPreview;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}
