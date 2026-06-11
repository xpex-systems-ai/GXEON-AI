export type BrokerMode = "PREVIEW_ONLY";
export type BrokerRouteRole = "PLAN" | "DRAFT" | "REVIEW" | "SECURITY_REVIEW" | "OPERATOR_APPROVAL";

export type BrokerApprovalGate = {
  id: string;
  label: string;
  required: true;
  reason: string;
};

export type BrokerAgentCandidate = {
  agentId: string;
  agentName: string;
  fitScore: number;
  routeRole: BrokerRouteRole;
  matchedCapabilities: string[];
  matchedConnectors: string[];
  blockedByPolicy: string[];
  requiredApprovals: BrokerApprovalGate[];
  confidence: number;
  notes: string[];
};

export type BrokerDecisionPreview = {
  id: string;
  mode: BrokerMode;
  taskId: string | null;
  title: string;
  recommendedAgents: BrokerAgentCandidate[];
  riskEnergy: number;
  safetyGrade: number;
  blockedActions: string[];
  approvalGates: BrokerApprovalGate[];
  reasoning: string[];
  operatorNextAction: string;
  approvalRequired: true;
  executionDisabled: true;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  sourceOfTruth: "HOME_CENTER_AGENT_REGISTRY";
  createdAt: string;
};

export type BrokerStatus = {
  status: "BROKER_P0_READY" | "BROKER_P0_FALLBACK";
  mode: BrokerMode;
  approvalRequired: true;
  executionDisabled: true;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  sourceOfTruth: "HOME_CENTER_AGENT_REGISTRY";
  quantumAdvisoryAvailable: boolean;
  registryAgentsAvailable: number;
  boundaries: string[];
};

export type BrokerPreviewRouteInput = {
  taskId?: string | null;
  title: string;
  summary?: string;
  category?: string;
  requiredConnectors?: string[];
  forbiddenActions?: string[];
  approvalGates?: string[];
  riskFlags?: string[];
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

async function readJson<T>(response: Response, route: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();
  if (!bodyText.trim()) throw new Error(`REQUEST_FAILED_${response.status}: Empty response body from ${route}`);
  if (!contentType.toLowerCase().includes("application/json")) throw new Error(`BACKEND_NON_JSON_RESPONSE: ${route} returned ${response.status}`);
  const payload = JSON.parse(bodyText) as { success?: boolean; data?: T; error?: string; message?: string };
  if (!response.ok || !payload.success) throw new Error(`REQUEST_FAILED_${response.status}: ${payload.message ?? payload.error ?? "Broker request failed"}`);
  return payload.data as T;
}

function fallbackStatus(): BrokerStatus {
  return {
    status: "BROKER_P0_FALLBACK",
    mode: "PREVIEW_ONLY",
    approvalRequired: true,
    executionDisabled: true,
    autonomousExecution: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    sourceOfTruth: "HOME_CENTER_AGENT_REGISTRY",
    quantumAdvisoryAvailable: false,
    registryAgentsAvailable: 0,
    boundaries: ["Backend unavailable; UI is showing safe fallback boundaries only.", "No execution, install, external contact, GitHub write or payment action is enabled."],
  };
}

function fallbackDecision(input: BrokerPreviewRouteInput, reason: string): BrokerDecisionPreview {
  return {
    id: `broker_fallback_${Date.now()}`,
    mode: "PREVIEW_ONLY",
    taskId: input.taskId ?? null,
    title: input.title,
    recommendedAgents: [
      { agentId: "operator_copilot", agentName: "Operator Copilot", fitScore: 50, routeRole: "OPERATOR_APPROVAL", matchedCapabilities: [], matchedConnectors: [], blockedByPolicy: ["backend_unavailable"], requiredApprovals: [{ id: "operator_review_required", label: "Operator Review Required", required: true, reason }], confidence: 0.5, notes: ["Fallback preview only. Backend registry could not be reached, so no route is executable."] },
    ],
    riskEnergy: 90,
    safetyGrade: 10,
    blockedActions: ["external_contact", "github_write", "payment_action", "autonomous_execution", "agent_install", "agent_execution"],
    approvalGates: [{ id: "operator_review_required", label: "Operator Review Required", required: true, reason }],
    reasoning: [reason, "Fallback preserves preview-only mode and disables execution."],
    operatorNextAction: "Check backend availability, then request a new Broker preview. Do not execute from fallback data.",
    approvalRequired: true,
    executionDisabled: true,
    autonomousExecution: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    sourceOfTruth: "HOME_CENTER_AGENT_REGISTRY",
    createdAt: new Date().toISOString(),
  };
}

export async function fetchBrokerStatus(signal?: AbortSignal): Promise<BrokerStatus> {
  try {
    return await readJson<BrokerStatus>(await fetch(apiUrl("/api/broker/status"), { headers: { Accept: "application/json" }, signal }), "/api/broker/status");
  } catch {
    return fallbackStatus();
  }
}

export async function fetchBrokerDecisions(signal?: AbortSignal): Promise<BrokerDecisionPreview[]> {
  try {
    const data = await readJson<{ decisions: BrokerDecisionPreview[] }>(await fetch(apiUrl("/api/broker/decisions"), { headers: { Accept: "application/json" }, signal }), "/api/broker/decisions");
    return data.decisions;
  } catch {
    return [];
  }
}

export async function fetchBrokerDecisionById(id: string, signal?: AbortSignal): Promise<BrokerDecisionPreview | null> {
  try {
    const data = await readJson<{ decision: BrokerDecisionPreview }>(await fetch(apiUrl(`/api/broker/decisions/${id}`), { headers: { Accept: "application/json" }, signal }), `/api/broker/decisions/${id}`);
    return data.decision;
  } catch {
    return null;
  }
}

export async function previewBrokerRoute(input: BrokerPreviewRouteInput): Promise<BrokerDecisionPreview> {
  try {
    const data = await readJson<{ decision: BrokerDecisionPreview }>(await fetch(apiUrl("/api/broker/preview-route"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), "/api/broker/preview-route");
    return data.decision;
  } catch (error) {
    return fallbackDecision(input, error instanceof Error ? error.message : "BROKER_BACKEND_UNAVAILABLE");
  }
}
