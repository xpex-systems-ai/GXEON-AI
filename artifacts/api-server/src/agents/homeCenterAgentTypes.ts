export type AgentStatus = "OFFLINE" | "READY_FOR_INSTALL" | "INSTALLED_DISABLED" | "ACTIVE_MANUAL_ONLY";

export type AgentPermission = "READ" | "PLAN" | "DRAFT" | "SUGGEST" | "APPROVE_REQUIRED";

export type AgentForbiddenAction =
  | "external_contact"
  | "github_write"
  | "auto_apply"
  | "payment_action"
  | "execute_task"
  | "contact_client"
  | "commit_code"
  | "send_email"
  | "send_dm"
  | "submit_proposal"
  | "create_invoice"
  | "execute_code"
  | "modify_repo"
  | "deploy_service"
  | "change_database"
  | "fake_evidence"
  | "claim_completion"
  | "publish_report"
  | "capture_payment"
  | "create_checkout"
  | "refund"
  | "move_money"
  | "disable_safety"
  | "expose_tokens"
  | "approve_own_execution"
  | "override_operator"
  | "auto_approve"
  | "execute_without_confirmation";

export type AgentCapability = {
  id: string;
  label: string;
  permission: AgentPermission;
  executionEnabled: false;
  description: string;
};

export type AgentConnectorAccessRequirement = {
  connector: "Radar X" | "Opportunity Inbox" | "Proposal Preview" | "Task Preview" | "P1 Task Queue" | "Evidence Plan" | "Monetization Board" | "Governance";
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
  forbiddenActions: AgentForbiddenAction[];
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
  forbiddenActions: AgentForbiddenAction[];
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
    taskQueueAvailableAsPreparationSignal: true;
    taskAgentActive: false;
    autonomousAgentsCreated: false;
  };
};
