export type BrokerMode = "PREVIEW_ONLY";

export type BrokerRouteRole = "PLAN" | "DRAFT" | "REVIEW" | "SECURITY_REVIEW" | "OPERATOR_APPROVAL";

export type BrokerInputTask = {
  taskId?: string | null;
  title: string;
  summary?: string;
  category?: string;
  requiredConnectors?: string[];
  forbiddenActions?: string[];
  approvalGates?: string[];
  riskFlags?: string[];
};

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

export type BrokerSafetyBoundary = {
  mode: BrokerMode;
  approvalRequired: true;
  executionDisabled: true;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  sourceOfTruth: "HOME_CENTER_AGENT_REGISTRY";
};

export type BrokerDecisionPreview = BrokerSafetyBoundary & {
  id: string;
  taskId: string | null;
  title: string;
  recommendedAgents: BrokerAgentCandidate[];
  riskEnergy: number;
  safetyGrade: number;
  blockedActions: string[];
  approvalGates: BrokerApprovalGate[];
  reasoning: string[];
  operatorNextAction: string;
  createdAt: string;
};

export type BrokerStatus = BrokerSafetyBoundary & {
  status: "BROKER_P0_READY";
  quantumAdvisoryAvailable: true;
  registryAgentsAvailable: number;
  boundaries: string[];
};

export type BrokerDecisionCreateInput = {
  input: BrokerInputTask;
  recommendedAgents: BrokerAgentCandidate[];
  riskEnergy: number;
  safetyGrade: number;
  blockedActions: string[];
  approvalGates: BrokerApprovalGate[];
  reasoning: string[];
  operatorNextAction: string;
};
