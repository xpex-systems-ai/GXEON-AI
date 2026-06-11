import type { AgentCapability, AgentForbiddenAction, AgentPermission, AgentPermissionMatrixRow, AgentReadinessStatus, GrokBuilderPreparationStatus, HomeCenterAgentRecord } from "./homeCenterAgentTypes";

const capabilityDescriptions: Record<string, string> = {
  read_radar_candidates: "Read Radar X candidate previews without contacting external users.",
  suggest_opportunity_category: "Suggest an internal opportunity category for operator review.",
  suggest_next_step: "Suggest the next planning step without executing it.",
  read_opportunity_inbox: "Read Opportunity Inbox records and pipeline counters.",
  score_opportunity: "Draft an internal score for opportunity fit and value.",
  risk_analysis: "Identify delivery, budget and safety risks for review.",
  recommend_qualification: "Recommend whether the operator should qualify an opportunity.",
  create_proposal_preview: "Prepare draft-only proposal previews.",
  suggest_scope: "Suggest draft scope boundaries.",
  suggest_price_range: "Suggest non-binding price ranges.",
  prepare_copy: "Prepare copy for manual operator editing.",
  create_task_preview: "Prepare task previews without executing work.",
  define_checklist: "Define execution checklist items for future approval.",
  define_required_connectors: "Identify connector visibility needed for a task.",
  define_rollback: "Define rollback requirements before future execution.",
  create_evidence_plan: "Prepare evidence plan requirements.",
  list_required_proofs: "List proofs required before completion can be claimed.",
  suggest_validation_artifacts: "Suggest validation artifacts for operator collection.",
  track_pipeline_status: "Track opportunity-to-revenue readiness status.",
  suggest_offer_template: "Suggest an offer template for operator review.",
  flag_payment_pending: "Flag payment setup as pending without moving money.",
  check_boundaries: "Check P0 safety boundaries and approval gates.",
  flag_risky_actions: "Flag actions that would cross P0 boundaries.",
  validate_no_secret_exposure: "Validate that plans do not expose credentials.",
  summarize_status: "Summarize Home Center and opportunity status.",
  ask_operator_approval: "Ask the operator for approval before any future action.",
  recommend_next_action: "Recommend the next manual action for the operator.",
};

function permissionForCapability(capabilityId: string): AgentPermission {
  if (capabilityId.startsWith("read_") || capabilityId.startsWith("track_")) return "READ";
  if (capabilityId.startsWith("create_") || capabilityId.startsWith("prepare_")) return "DRAFT";
  if (capabilityId.startsWith("define_") || capabilityId.startsWith("list_") || capabilityId.startsWith("check_") || capabilityId.startsWith("validate_")) return "PLAN";
  if (capabilityId.includes("approval")) return "APPROVE_REQUIRED";
  return "SUGGEST";
}

function capabilities(ids: string[]): AgentCapability[] {
  return ids.map((id) => ({
    id,
    label: id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
    permission: permissionForCapability(id),
    executionEnabled: false,
    description: capabilityDescriptions[id] ?? "Planning capability only; execution is disabled in P0.",
  }));
}

function manualGates(agentId: string) {
  return [
    { id: `${agentId}_operator_review`, label: "Operator review required", required: true, reason: "P0 allows planning and draft suggestions only." },
    { id: `${agentId}_execution_denied`, label: "Execution remains disabled", required: true, reason: "No autonomous execution, external contact, GitHub write or payment action is available." },
  ];
}

export const homeCenterAgents: HomeCenterAgentRecord[] = [
  {
    id: "scout_agent",
    name: "Scout Agent",
    purpose: "Find and classify opportunity signals from Radar X.",
    status: "READY_FOR_INSTALL",
    capabilities: capabilities(["read_radar_candidates", "suggest_opportunity_category", "suggest_next_step"]),
    forbiddenActions: ["external_contact", "github_write", "auto_apply", "payment_action"],
    connectorAccess: [
      { connector: "Radar X", access: "READ_ONLY", required: true },
      { connector: "Opportunity Inbox", access: "PREVIEW_ONLY", required: true },
    ],
    manualApprovalGates: manualGates("scout_agent"),
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
    capabilities: capabilities(["read_opportunity_inbox", "score_opportunity", "risk_analysis", "recommend_qualification"]),
    forbiddenActions: ["execute_task", "contact_client", "commit_code", "payment_action"],
    connectorAccess: [
      { connector: "Opportunity Inbox", access: "READ_ONLY", required: true },
      { connector: "Governance", access: "READ_ONLY", required: true },
    ],
    manualApprovalGates: manualGates("analyst_agent"),
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
    capabilities: capabilities(["create_proposal_preview", "suggest_scope", "suggest_price_range", "prepare_copy"]),
    forbiddenActions: ["send_email", "send_dm", "submit_proposal", "create_invoice"],
    connectorAccess: [
      { connector: "Opportunity Inbox", access: "READ_ONLY", required: true },
      { connector: "Proposal Preview", access: "PREVIEW_ONLY", required: true },
    ],
    manualApprovalGates: manualGates("proposal_agent"),
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
    capabilities: capabilities(["create_task_preview", "define_checklist", "define_required_connectors", "define_rollback"]),
    forbiddenActions: ["execute_code", "modify_repo", "deploy_service", "change_database"],
    connectorAccess: [
      { connector: "Opportunity Inbox", access: "READ_ONLY", required: true },
      { connector: "Task Preview", access: "PREVIEW_ONLY", required: true },
    ],
    manualApprovalGates: manualGates("task_agent"),
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
    capabilities: capabilities(["create_evidence_plan", "list_required_proofs", "suggest_validation_artifacts"]),
    forbiddenActions: ["fake_evidence", "claim_completion", "publish_report"],
    connectorAccess: [
      { connector: "Opportunity Inbox", access: "READ_ONLY", required: true },
      { connector: "Evidence Plan", access: "PREVIEW_ONLY", required: true },
    ],
    manualApprovalGates: manualGates("evidence_agent"),
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
    capabilities: capabilities(["track_pipeline_status", "suggest_offer_template", "flag_payment_pending"]),
    forbiddenActions: ["capture_payment", "create_checkout", "refund", "move_money"],
    connectorAccess: [
      { connector: "Opportunity Inbox", access: "READ_ONLY", required: true },
      { connector: "Monetization Board", access: "READ_ONLY", required: true },
    ],
    manualApprovalGates: manualGates("revenue_agent"),
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
    capabilities: capabilities(["check_boundaries", "flag_risky_actions", "validate_no_secret_exposure"]),
    forbiddenActions: ["disable_safety", "expose_tokens", "approve_own_execution"],
    connectorAccess: [
      { connector: "Governance", access: "READ_ONLY", required: true },
      { connector: "Opportunity Inbox", access: "READ_ONLY", required: false },
    ],
    manualApprovalGates: manualGates("security_agent"),
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
    capabilities: capabilities(["summarize_status", "ask_operator_approval", "recommend_next_action"]),
    forbiddenActions: ["override_operator", "auto_approve", "execute_without_confirmation"],
    connectorAccess: [
      { connector: "Opportunity Inbox", access: "READ_ONLY", required: true },
      { connector: "Radar X", access: "READ_ONLY", required: true },
      { connector: "Monetization Board", access: "READ_ONLY", required: false },
    ],
    manualApprovalGates: manualGates("operator_copilot"),
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
  },
];

export function getHomeCenterAgentReadinessStatus(): AgentReadinessStatus {
  return {
    status: "HOME_CENTER_AGENTS_READY",
    mode: "PRE_INSTALL_P0",
    autonomousExecution: false,
    externalContact: false,
    paymentAction: false,
    githubWrites: false,
    agentsTotal: homeCenterAgents.length,
    readyForInstall: homeCenterAgents.filter((agent) => agent.status === "READY_FOR_INSTALL").length,
    offline: homeCenterAgents.filter((agent) => agent.status === "OFFLINE").length,
    installed: 0,
    active: 0,
    defaultPolicy: "DENY_EXECUTION_ALLOW_PLANNING",
    boundaries: [
      "Agents are registry records only in P0.",
      "No install, execution, external-contact, GitHub-write or payment endpoints are exposed.",
      "All capabilities require operator review before any future action.",
    ],
  };
}

export function getHomeCenterAgentRegistry() {
  return {
    agents: homeCenterAgents,
    manualApprovalRequired: true,
    executionEnabled: false,
    autonomousExecution: false,
    grokBuilderPreparation: getGrokBuilderPreparationStatus(),
  };
}

export function getHomeCenterAgentPermissions() {
  const permissions: AgentPermissionMatrixRow[] = homeCenterAgents.map((agent) => ({
    agentId: agent.id,
    agentName: agent.name,
    permissions: Array.from(new Set(agent.capabilities.map((capability) => capability.permission))),
    allowedCapabilities: agent.capabilities.map((capability) => capability.id),
    forbiddenActions: agent.forbiddenActions,
    executionEnabled: false,
    manualApprovalRequired: true,
  }));

  return {
    permissions,
    defaultPolicy: "DENY_EXECUTION_ALLOW_PLANNING" as const,
    allPermissionsDisabledByDefault: true,
    executionEnabled: false,
    externalContactEnabled: false,
    githubWritesEnabled: false,
    paymentActionsEnabled: false,
  };
}

export function getGrokBuilderPreparationStatus(): GrokBuilderPreparationStatus {
  return {
    readyForGrokBuilder: true,
    missingBeforeInstall: [],
    entryConditions: ["Radar X online", "Opportunity Inbox online", "Proposal Preview online", "Task Preview online", "Evidence Plan online"],
    installMode: "FUTURE_OPERATOR_APPROVED_INSTALL",
    p0PreparationOnly: true,
    noInstallEndpoint: true,
    noExecutionEndpoint: true,
    metadata: {
      registryReady: true,
      permissionModelReady: true,
      readinessDashboardReady: true,
      autonomousAgentsCreated: false,
    },
  };
}
