export type TaskQueueStatus = "TASK_READY" | "APPROVAL_REQUIRED" | "APPROVED_FOR_MANUAL_EXECUTION" | "BLOCKED" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type TaskQueuePriority = "LOW" | "MEDIUM" | "HIGH";

export type TaskQueueRecord = {
  id: string;
  opportunityId: string;
  proposalPreviewId?: string;
  taskPreviewId?: string;
  evidencePlanId?: string;
  status: TaskQueueStatus;
  priority: TaskQueuePriority;
  title: string;
  summary: string;
  category: string;
  score: number;
  riskFlags: string[];
  nextStep: string;
  sourceUrl: string | null;
  repository: string | null;
  executionChecklist: string[];
  requiredConnectors: string[];
  approvalGates: string[];
  forbiddenActions: string[];
  evidenceRequirements: string[];
  rollbackRequirements: string[];
  manualApprovalRequired: true;
  autonomousExecution: false;
  externalAction: false;
  paymentAction: false;
  operatorConfirmed: true;
  createdAt: string;
  updatedAt: string;
};

export type TaskQueueCounts = Record<TaskQueueStatus, number> & {
  total: number;
  open: number;
  blocked: number;
  approvedForManualExecution: number;
  done: number;
  cancelled: number;
};

export type TaskQueueReadinessStatus = {
  status: "P1_TASK_QUEUE_READY";
  persistence: "IN_MEMORY_P1";
  manualFirst: true;
  manualApprovalRequired: true;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  executionEndpointExposed: false;
  counts: TaskQueueCounts;
  safeTransitions: Record<TaskQueueStatus, TaskQueueStatus[]>;
  boundaries: string[];
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";
const railwayBackendUrlMessage = "Set VITE_GXEON_API_BASE_URL to Railway API public URL and redeploy Vercel";

function isVercelPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".vercel.app");
}

function apiUrl(path: string): string {
  if (!configuredApiBaseUrl && isVercelPreviewHost()) {
    throw new Error(`BACKEND_URL_MISCONFIGURED: ${railwayBackendUrlMessage}`);
  }
  return `${configuredApiBaseUrl}${path}`;
}

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

  if (!response.ok || !payload.success) {
    const message = payload.message ?? payload.error ?? "Backend request failed";
    throw new Error(`REQUEST_FAILED_${response.status}: ${message}: ${route}`);
  }

  return payload.data as T;
}

async function jsonPost<T>(path: string, body: unknown): Promise<T> {
  return readJson<T>(await fetch(apiUrl(path), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) }), path);
}

export async function fetchTaskQueueStatus(signal?: AbortSignal) {
  return readJson<TaskQueueReadinessStatus>(await fetch(apiUrl("/api/tasks/status"), { headers: { Accept: "application/json" }, signal }), "/api/tasks/status");
}

export async function fetchTaskQueue(signal?: AbortSignal) {
  return readJson<{ tasks: TaskQueueRecord[]; counts: TaskQueueCounts }>(await fetch(apiUrl("/api/tasks"), { headers: { Accept: "application/json" }, signal }), "/api/tasks");
}

export async function fetchTask(id: string, signal?: AbortSignal) {
  return readJson<{ task: TaskQueueRecord }>(await fetch(apiUrl(`/api/tasks/${id}`), { headers: { Accept: "application/json" }, signal }), `/api/tasks/${id}`);
}

export function createTaskFromOpportunity(opportunityId: string, operatorConfirmed: boolean, taskPreviewId?: string) {
  return jsonPost<{ task: TaskQueueRecord }>(`/api/tasks/from-opportunity/${opportunityId}`, { operatorConfirmed, duplicate: false, taskPreviewId });
}

export function approveManualExecution(id: string, operatorConfirmed: boolean) {
  return jsonPost<{ task: TaskQueueRecord; note: string }>(`/api/tasks/${id}/approve-manual-execution`, { operatorConfirmed });
}

export function blockTask(id: string) {
  return jsonPost<{ task: TaskQueueRecord; note: string }>(`/api/tasks/${id}/block`, {});
}

export function cancelTask(id: string) {
  return jsonPost<{ task: TaskQueueRecord; note: string }>(`/api/tasks/${id}/cancel`, {});
}
