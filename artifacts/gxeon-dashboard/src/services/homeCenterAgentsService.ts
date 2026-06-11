export type AgentStatus = "OFFLINE" | "READY_FOR_INSTALL" | "INSTALLED_DISABLED" | "ACTIVE_MANUAL_ONLY";
export type AgentPermission = "READ" | "PLAN" | "DRAFT" | "SUGGEST" | "APPROVE_REQUIRED";

export type AgentCapability = {
  id: string;
  label: string;
  permission: AgentPermission;
  executionEnabled: false;
  description: string;
};

export type AgentConnectorAccessRequirement = {
  connector: string;
  access: "READ_ONLY" | "PREVIEW_ONLY" | "OPERATOR_APPROVAL_REQUIRED";
  required: boolean;
};

export type AgentManualApprovalGate = {
  id: string;
  label: string;
  required: true;
  reason: string;
};

export type HomeCenterAgentRecord = {
  id: string;
  name: string;
  purpose: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  forbiddenActions: string[];
  connectorAccess: AgentConnectorAccessRequirement[];
  manualApprovalGates: AgentManualApprovalGate[];
  autonomousExecution: false;
  externalContact: false;
  paymentAction: false;
  githubWrites: false;
};

export type AgentReadinessStatus = {
  status: "HOME_CENTER_AGENTS_READY";
  mode: "PRE_INSTALL_P0";
  autonomousExecution: false;
  externalContact: false;
  paymentAction: false;
  githubWrites: false;
  agentsTotal: number;
  readyForInstall: number;
  offline: number;
  installed: 0;
  active: 0;
  defaultPolicy: "DENY_EXECUTION_ALLOW_PLANNING";
  boundaries: string[];
};

export type AgentPermissionMatrixRow = {
  agentId: string;
  agentName: string;
  permissions: AgentPermission[];
  allowedCapabilities: string[];
  forbiddenActions: string[];
  executionEnabled: false;
  manualApprovalRequired: true;
};

export type GrokBuilderPreparationStatus = {
  readyForGrokBuilder: boolean;
  missingBeforeInstall: string[];
  entryConditions: string[];
  installMode: "FUTURE_OPERATOR_APPROVED_INSTALL";
  p0PreparationOnly: true;
  noInstallEndpoint: true;
  noExecutionEndpoint: true;
  metadata: {
    registryReady: true;
    permissionModelReady: true;
    readinessDashboardReady: true;
    autonomousAgentsCreated: false;
  };
};

export type HomeCenterAgentRegistryResponse = {
  agents: HomeCenterAgentRecord[];
  manualApprovalRequired: true;
  executionEnabled: false;
  autonomousExecution: false;
  grokBuilderPreparation: GrokBuilderPreparationStatus;
};

export type HomeCenterAgentPermissionsResponse = {
  permissions: AgentPermissionMatrixRow[];
  defaultPolicy: "DENY_EXECUTION_ALLOW_PLANNING";
  allPermissionsDisabledByDefault: true;
  executionEnabled: false;
  externalContactEnabled: false;
  githubWritesEnabled: false;
  paymentActionsEnabled: false;
};

const fallbackAgents: HomeCenterAgentRecord[] = [
  {
    id: "scout_agent",
    name: "Scout Agent",
    purpose: "Find and classify opportunity signals from Radar X.",
    status: "READY_FOR_INSTALL",
    capabilities: ["read_radar_candidates", "suggest_opportunity_category", "suggest_next_step"].map((id) => ({ id, label: labelFromId(id), permission: id.startsWith("read_") ? "READ" : "SUGGEST", executionEnabled: false, description: "Fallback P0 planning capability. Backend unavailable; no execution is enabled." })),
    forbiddenActions: ["external_contact", "github_write", "auto_apply", "payment_action"],
    connectorAccess: [{ connector: "Radar X", access: "READ_ONLY", required: true }, { connector: "Opportunity Inbox", access: "PREVIEW_ONLY", required: true }],
    manualApprovalGates: fallbackGates("scout_agent"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
  {
    id: "analyst_agent",
    name: "Analyst Agent",
    purpose: "Analyze opportunities, risks, fit and estimated value.",
    status: "READY_FOR_INSTALL",
    capabilities: ["read_opportunity_inbox", "score_opportunity", "risk_analysis", "recommend_qualification"].map((id) => ({ id, label: labelFromId(id), permission: id.startsWith("read_") ? "READ" : "SUGGEST", executionEnabled: false, description: "Fallback P0 planning capability. Backend unavailable; no execution is enabled." })),
    forbiddenActions: ["execute_task", "contact_client", "commit_code", "payment_action"],
    connectorAccess: [{ connector: "Opportunity Inbox", access: "READ_ONLY", required: true }, { connector: "Governance", access: "READ_ONLY", required: true }],
    manualApprovalGates: fallbackGates("analyst_agent"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
  {
    id: "proposal_agent",
    name: "Proposal Agent",
    purpose: "Generate draft-only proposals for operator review.",
    status: "READY_FOR_INSTALL",
    capabilities: ["create_proposal_preview", "suggest_scope", "suggest_price_range", "prepare_copy"].map((id) => ({ id, label: labelFromId(id), permission: id.startsWith("create_") || id.startsWith("prepare_") ? "DRAFT" : "SUGGEST", executionEnabled: false, description: "Fallback P0 draft-only capability. Backend unavailable; no execution is enabled." })),
    forbiddenActions: ["send_email", "send_dm", "submit_proposal", "create_invoice"],
    connectorAccess: [{ connector: "Opportunity Inbox", access: "READ_ONLY", required: true }, { connector: "Proposal Preview", access: "PREVIEW_ONLY", required: true }],
    manualApprovalGates: fallbackGates("proposal_agent"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
  {
    id: "task_agent",
    name: "Task Agent",
    purpose: "Convert approved opportunities into execution checklists.",
    status: "READY_FOR_INSTALL",
    capabilities: ["create_task_preview", "define_checklist", "define_required_connectors", "define_rollback"].map((id) => ({ id, label: labelFromId(id), permission: id.startsWith("create_") ? "DRAFT" : "PLAN", executionEnabled: false, description: "Fallback P0 checklist capability. Backend unavailable; no execution is enabled." })),
    forbiddenActions: ["execute_code", "modify_repo", "deploy_service", "change_database"],
    connectorAccess: [{ connector: "Opportunity Inbox", access: "READ_ONLY", required: true }, { connector: "Task Preview", access: "PREVIEW_ONLY", required: true }],
    manualApprovalGates: fallbackGates("task_agent"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
  {
    id: "evidence_agent",
    name: "Evidence Agent",
    purpose: "Define and organize proof requirements.",
    status: "READY_FOR_INSTALL",
    capabilities: ["create_evidence_plan", "list_required_proofs", "suggest_validation_artifacts"].map((id) => ({ id, label: labelFromId(id), permission: id.startsWith("create_") ? "DRAFT" : id.startsWith("list_") ? "PLAN" : "SUGGEST", executionEnabled: false, description: "Fallback P0 evidence planning capability. Backend unavailable; no execution is enabled." })),
    forbiddenActions: ["fake_evidence", "claim_completion", "publish_report"],
    connectorAccess: [{ connector: "Opportunity Inbox", access: "READ_ONLY", required: true }, { connector: "Evidence Plan", access: "PREVIEW_ONLY", required: true }],
    manualApprovalGates: fallbackGates("evidence_agent"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
  {
    id: "revenue_agent",
    name: "Revenue Agent",
    purpose: "Track opportunity-to-revenue readiness.",
    status: "READY_FOR_INSTALL",
    capabilities: ["track_pipeline_status", "suggest_offer_template", "flag_payment_pending"].map((id) => ({ id, label: labelFromId(id), permission: id.startsWith("track_") ? "READ" : "SUGGEST", executionEnabled: false, description: "Fallback P0 revenue-readiness capability. Backend unavailable; no payment action is enabled." })),
    forbiddenActions: ["capture_payment", "create_checkout", "refund", "move_money"],
    connectorAccess: [{ connector: "Opportunity Inbox", access: "READ_ONLY", required: true }, { connector: "Monetization Board", access: "READ_ONLY", required: true }],
    manualApprovalGates: fallbackGates("revenue_agent"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
  {
    id: "security_agent",
    name: "Security Agent",
    purpose: "Protect boundaries, credentials and approval gates.",
    status: "READY_FOR_INSTALL",
    capabilities: ["check_boundaries", "flag_risky_actions", "validate_no_secret_exposure"].map((id) => ({ id, label: labelFromId(id), permission: id.startsWith("flag_") ? "SUGGEST" : "PLAN", executionEnabled: false, description: "Fallback P0 safety capability. Backend unavailable; no safety override is enabled." })),
    forbiddenActions: ["disable_safety", "expose_tokens", "approve_own_execution"],
    connectorAccess: [{ connector: "Governance", access: "READ_ONLY", required: true }, { connector: "Opportunity Inbox", access: "READ_ONLY", required: false }],
    manualApprovalGates: fallbackGates("security_agent"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
  {
    id: "operator_copilot",
    name: "Operator Copilot",
    purpose: "Assist Junior Sena with approvals, decisions and execution planning.",
    status: "READY_FOR_INSTALL",
    capabilities: ["summarize_status", "ask_operator_approval", "recommend_next_action"].map((id) => ({ id, label: labelFromId(id), permission: id.includes("approval") ? "APPROVE_REQUIRED" : "SUGGEST", executionEnabled: false, description: "Fallback P0 operator support capability. Backend unavailable; no action is performed." })),
    forbiddenActions: ["override_operator", "auto_approve", "execute_without_confirmation"],
    connectorAccess: [{ connector: "Opportunity Inbox", access: "READ_ONLY", required: true }, { connector: "Radar X", access: "READ_ONLY", required: true }, { connector: "Monetization Board", access: "READ_ONLY", required: false }],
    manualApprovalGates: fallbackGates("operator_copilot"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
];

const fallbackGrokReadiness: GrokBuilderPreparationStatus = {
  readyForGrokBuilder: true,
  missingBeforeInstall: [],
  entryConditions: ["Radar X online", "Opportunity Inbox online", "Proposal Preview online", "Task Preview online", "Evidence Plan online"],
  installMode: "FUTURE_OPERATOR_APPROVED_INSTALL",
  p0PreparationOnly: true,
  noInstallEndpoint: true,
  noExecutionEndpoint: true,
  metadata: { registryReady: true, permissionModelReady: true, readinessDashboardReady: true, autonomousAgentsCreated: false },
};

export const fallbackHomeCenterAgents = {
  status: {
    status: "HOME_CENTER_AGENTS_READY",
    mode: "PRE_INSTALL_P0",
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
    agentsTotal: fallbackAgents.length,
    readyForInstall: fallbackAgents.length,
    offline: 0,
    installed: 0,
    active: 0,
    defaultPolicy: "DENY_EXECUTION_ALLOW_PLANNING",
    boundaries: ["Fallback registry loaded locally.", "No execution endpoint is available.", "Manual approval is required for future installs."],
  } satisfies AgentReadinessStatus,
  registry: {
    agents: fallbackAgents,
    manualApprovalRequired: true,
    executionEnabled: false,
    autonomousExecution: false,
    grokBuilderPreparation: fallbackGrokReadiness,
  } satisfies HomeCenterAgentRegistryResponse,
  permissions: {
    permissions: fallbackAgents.map((agent) => ({ agentId: agent.id, agentName: agent.name, permissions: Array.from(new Set(agent.capabilities.map((capability) => capability.permission))), allowedCapabilities: agent.capabilities.map((capability) => capability.id), forbiddenActions: agent.forbiddenActions, executionEnabled: false, manualApprovalRequired: true })),
    defaultPolicy: "DENY_EXECUTION_ALLOW_PLANNING",
    allPermissionsDisabledByDefault: true,
    executionEnabled: false,
    externalContactEnabled: false,
    githubWritesEnabled: false,
    paymentActionsEnabled: false,
  } satisfies HomeCenterAgentPermissionsResponse,
  grokReadiness: fallbackGrokReadiness,
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";

function labelFromId(id: string): string {
  return id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function fallbackGates(agentId: string): AgentManualApprovalGate[] {
  return [
    { id: `${agentId}_operator_review`, label: "Operator review required", required: true, reason: "P0 allows planning and draft suggestions only." },
    { id: `${agentId}_execution_denied`, label: "Execution remains disabled", required: true, reason: "No autonomous execution, external contact, GitHub write or payment action is available." },
  ];
}

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

async function readJson<T>(response: Response, route: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();
  if (!bodyText.trim()) throw new Error(`REQUEST_FAILED_${response.status}: Empty response body from ${route}`);
  if (!contentType.toLowerCase().includes("application/json")) throw new Error(`BACKEND_NON_JSON_RESPONSE: ${route} returned ${response.status}`);
  const payload = JSON.parse(bodyText) as { success?: boolean; data?: T; error?: string; message?: string };
  if (!response.ok || !payload.success) throw new Error(`REQUEST_FAILED_${response.status}: ${payload.message ?? payload.error ?? "Backend request failed"}: ${route}`);
  return payload.data as T;
}

async function safeGet<T>(path: string, fallback: T, signal?: AbortSignal): Promise<{ data: T; fallback: boolean; error: string | null }> {
  try {
    return { data: await readJson<T>(await fetch(apiUrl(path), { headers: { Accept: "application/json" }, signal }), path), fallback: false, error: null };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { data: fallback, fallback: true, error: error instanceof Error ? error.message : "HOME_CENTER_AGENTS_BACKEND_UNAVAILABLE" };
  }
}

export function fetchHomeCenterAgentStatus(signal?: AbortSignal) {
  return safeGet<AgentReadinessStatus>("/api/agents/home-center/status", fallbackHomeCenterAgents.status, signal);
}

export function fetchHomeCenterAgentRegistry(signal?: AbortSignal) {
  return safeGet<HomeCenterAgentRegistryResponse>("/api/agents/home-center/registry", fallbackHomeCenterAgents.registry, signal);
}

export function fetchHomeCenterAgentPermissions(signal?: AbortSignal) {
  return safeGet<HomeCenterAgentPermissionsResponse>("/api/agents/home-center/permissions", fallbackHomeCenterAgents.permissions, signal);
}

export function fetchHomeCenterAgentGrokReadiness(signal?: AbortSignal) {
  return safeGet<GrokBuilderPreparationStatus>("/api/agents/home-center/grok-readiness", fallbackHomeCenterAgents.grokReadiness, signal);
}

// === Quantum Advisory helpers (Classical, advisory only) ===
// Added without touching existing Home Center fetchers.

export async function fetchQuantumStatus(signal?: AbortSignal) {
  try {
    const res = await fetch(apiUrl("/api/agents/home-center/quantum/status"), { headers: { Accept: "application/json" }, signal });
    const payload = await res.json();
    return payload.data || { status: "QUANTUM_INSPIRED_ADVISORY_READY", mode: "CLASSICAL_PREVIEW_ONLY", realQuantumHardware: false };
  } catch {
    return { status: "QUANTUM_INSPIRED_ADVISORY_READY", mode: "CLASSICAL_PREVIEW_ONLY", realQuantumHardware: false, fallback: true };
  }
}

export async function simulateQuantumTaskRoute(input: any, signal?: AbortSignal) {
  try {
    const res = await fetch(apiUrl("/api/agents/home-center/quantum/simulate-task-route"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    const payload = await res.json();
    return payload.data;
  } catch {
    return { recommendedRoute: [], approvalRequired: true, executionStillDisabled: true, fallback: true };
  }
}

export async function fetchQuantumRiskEnergy(input: any, signal?: AbortSignal) {
  try {
    const res = await fetch(apiUrl("/api/agents/home-center/quantum/risk-energy"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    const payload = await res.json();
    return payload.data;
  } catch {
    return { riskEnergy: { riskEnergy: 40, safetyGrade: 60, blockedActions: ["external_contact", "payment_action"], safeAlternative: "Stay in manual preview mode." }, fallback: true };
  }
}
