import { apiUrl, getApiBaseDiagnostic } from "./apiBase";

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
  diagnostics?: {
    apiBase: string;
    attemptedRoute: string;
    failureType: "network_error" | "non_json" | "non_2xx" | "invalid_json" | "misconfigured_backend_url" | "unknown";
    message: string;
  };
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

  if (!response.ok || !payload.success) throw new Error(`REQUEST_FAILED_${response.status}: ${payload.message ?? payload.error ?? "Broker request failed"}`);
  return payload.data as T;
}

function classifyBrokerFailure(error: unknown): NonNullable<BrokerStatus["diagnostics"]>["failureType"] {
  if (!(error instanceof Error)) return "unknown";
  if (error.message.startsWith("BACKEND_URL_MISCONFIGURED")) return "misconfigured_backend_url";
  if (error.message.startsWith("BACKEND_NON_JSON_RESPONSE")) return "non_json";
  if (error.message.startsWith("BACKEND_INVALID_JSON_RESPONSE")) return "invalid_json";
  if (error.message.startsWith("REQUEST_FAILED_")) return "non_2xx";
  return "network_error";
}

function brokerFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "BROKER_BACKEND_UNAVAILABLE";
}

function fallbackStatus(error?: unknown, attemptedRoute = "/api/broker/status"): BrokerStatus {
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
    diagnostics: {
      apiBase: getApiBaseDiagnostic(),
      attemptedRoute,
      failureType: classifyBrokerFailure(error),
      message: brokerFailureMessage(error),
    },
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackStatus(error);
  }
}

export async function fetchBrokerDecisions(signal?: AbortSignal): Promise<BrokerDecisionPreview[]> {
  try {
    const data = await readJson<{ decisions: BrokerDecisionPreview[] }>(await fetch(apiUrl("/api/broker/decisions"), { headers: { Accept: "application/json" }, signal }), "/api/broker/decisions");
    return data.decisions;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}

export async function fetchBrokerDecisionById(id: string, signal?: AbortSignal): Promise<BrokerDecisionPreview | null> {
  try {
    const data = await readJson<{ decision: BrokerDecisionPreview }>(await fetch(apiUrl(`/api/broker/decisions/${id}`), { headers: { Accept: "application/json" }, signal }), `/api/broker/decisions/${id}`);
    return data.decision;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function previewBrokerRoute(input: BrokerPreviewRouteInput): Promise<BrokerDecisionPreview> {
  try {
    const data = await readJson<{ decision: BrokerDecisionPreview }>(await fetch(apiUrl("/api/broker/preview-route"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), "/api/broker/preview-route");
    return data.decision;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallbackDecision(input, brokerFailureMessage(error));
  }
}
