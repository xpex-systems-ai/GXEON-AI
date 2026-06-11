import { getHomeCenterAgentPermissions, getHomeCenterAgentRegistry } from "../agents/homeCenterAgentRegistry";
import { computeRiskEnergy } from "../agents/riskEnergyModel";
import type { HomeCenterAgentRecord } from "../agents/homeCenterAgentTypes";
import type { BrokerAgentCandidate, BrokerApprovalGate, BrokerDecisionCreateInput, BrokerInputTask, BrokerRouteRole, BrokerStatus } from "./brokerTypes";

const dangerousForbiddenActions = new Set(["external_contact", "github_write", "payment_action", "execute_code", "change_database"]);
const brokerBoundaryActions = ["external_contact", "github_write", "payment_action", "autonomous_execution", "agent_install", "agent_execution"];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function textTokens(input: BrokerInputTask): string[] {
  return Array.from(new Set(`${input.title} ${input.summary ?? ""} ${input.category ?? ""}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2)));
}

function toApprovalGate(value: string, source = "Broker P0 safety policy"): BrokerApprovalGate {
  const id = normalize(value || "operator_review_required");
  return { id, label: id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "), required: true, reason: source };
}

function roleForAgent(agent: HomeCenterAgentRecord): BrokerRouteRole {
  if (agent.id === "security_agent") return "SECURITY_REVIEW";
  if (agent.id === "operator_copilot") return "OPERATOR_APPROVAL";
  if (agent.capabilities.some((capability) => capability.permission === "DRAFT")) return "DRAFT";
  if (agent.capabilities.some((capability) => capability.id.includes("risk") || capability.id.includes("validate") || capability.id.includes("evidence"))) return "REVIEW";
  return "PLAN";
}

function connectorMatches(taskConnectors: string[], agent: HomeCenterAgentRecord): string[] {
  const required = taskConnectors.map(normalize);
  return agent.connectorAccess.filter((connector) => required.some((item) => normalize(connector.connector).includes(item) || item.includes(normalize(connector.connector)))).map((connector) => connector.connector);
}

function capabilityMatches(tokens: string[], agent: HomeCenterAgentRecord): string[] {
  return agent.capabilities
    .filter((capability) => {
      const haystack = `${capability.id} ${capability.label} ${capability.description}`.toLowerCase();
      return tokens.some((token) => haystack.includes(token));
    })
    .map((capability) => capability.id);
}

function policyCollisions(taskForbiddenActions: string[], agent: HomeCenterAgentRecord): string[] {
  const taskActions = new Set(taskForbiddenActions.map(normalize));
  return agent.forbiddenActions.filter((action) => taskActions.has(normalize(action)) || dangerousForbiddenActions.has(normalize(action)));
}

function scoreAgent(input: BrokerInputTask, agent: HomeCenterAgentRecord): BrokerAgentCandidate {
  const requiredConnectors = input.requiredConnectors ?? [];
  const forbiddenActions = input.forbiddenActions ?? [];
  const approvalGates = input.approvalGates ?? [];
  const tokens = textTokens(input);
  const matchedConnectors = connectorMatches(requiredConnectors, agent);
  const matchedCapabilities = capabilityMatches(tokens, agent);
  const blockedByPolicy = policyCollisions(forbiddenActions, agent);
  const requiredApprovals = [
    ...agent.manualApprovalGates.map((gate) => ({ id: gate.id, label: gate.label, required: true as const, reason: gate.reason })),
    ...approvalGates.map((gate) => toApprovalGate(gate, "Task requested approval gate.")),
  ];

  const connectorFit = requiredConnectors.length === 0 ? 10 : Math.round((matchedConnectors.length / requiredConnectors.length) * 30);
  const capabilityFit = Math.min(30, matchedCapabilities.length * 8);
  const categoryFit = input.category && `${agent.id} ${agent.name} ${agent.purpose}`.toLowerCase().includes(input.category.toLowerCase()) ? 10 : 0;
  const securityFit = agent.id === "security_agent" && forbiddenActions.some((action) => dangerousForbiddenActions.has(normalize(action))) ? 18 : 0;
  const operatorFit = agent.id === "operator_copilot" ? 16 : 0;
  const manualGatePenalty = Math.min(10, requiredApprovals.length);
  const policySafety = Math.max(0, 20 - blockedByPolicy.length * 3);
  const fitScore = Math.max(1, Math.min(100, 20 + connectorFit + capabilityFit + categoryFit + securityFit + operatorFit + policySafety - manualGatePenalty));

  return {
    agentId: agent.id,
    agentName: agent.name,
    fitScore,
    routeRole: roleForAgent(agent),
    matchedCapabilities,
    matchedConnectors,
    blockedByPolicy,
    requiredApprovals,
    confidence: Number((fitScore / 100).toFixed(2)),
    notes: [
      `${agent.name} evaluated from Home Center registry; execution remains disabled.`,
      matchedCapabilities.length ? `Matched capabilities: ${matchedCapabilities.join(", ")}.` : "No direct capability keyword match; retained only if safety/support routing requires it.",
      matchedConnectors.length ? `Matched connectors: ${matchedConnectors.join(", ")}.` : "No required connector match detected.",
      blockedByPolicy.length ? `Policy blocks remain active: ${blockedByPolicy.join(", ")}.` : "No additional policy collision beyond default P0 boundaries.",
    ],
  };
}

function uniqueCandidates(candidates: BrokerAgentCandidate[]): BrokerAgentCandidate[] {
  const seen = new Set<string>();
  const result: BrokerAgentCandidate[] = [];
  candidates.forEach((candidate) => {
    if (!seen.has(candidate.agentId)) {
      seen.add(candidate.agentId);
      result.push(candidate);
    }
  });
  return result;
}

export function getBrokerStatus(): BrokerStatus {
  const registry = getHomeCenterAgentRegistry();
  return {
    status: "BROKER_P0_READY",
    mode: "PREVIEW_ONLY",
    approvalRequired: true,
    executionDisabled: true,
    autonomousExecution: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    sourceOfTruth: "HOME_CENTER_AGENT_REGISTRY",
    quantumAdvisoryAvailable: true,
    registryAgentsAvailable: registry.agents.length,
    boundaries: [
      "Broker P0 creates routing previews only.",
      "Every route requires operator approval and keeps execution disabled.",
      "No install, execute, approve, external-contact, GitHub-write or payment endpoint is exposed.",
    ],
  };
}

export function buildBrokerDecisionInput(input: BrokerInputTask): BrokerDecisionCreateInput {
  const registry = getHomeCenterAgentRegistry();
  const permissions = getHomeCenterAgentPermissions();
  const risk = computeRiskEnergy({ riskFlags: input.riskFlags, forbiddenActions: input.forbiddenActions });
  const candidates = registry.agents.map((agent) => scoreAgent(input, agent)).sort((left, right) => right.fitScore - left.fitScore || left.agentName.localeCompare(right.agentName));
  const mustIncludeSecurity = risk.riskEnergy >= 50 || (input.forbiddenActions ?? []).some((action) => dangerousForbiddenActions.has(normalize(action)));
  const security = candidates.find((candidate) => candidate.agentId === "security_agent");
  const operator = candidates.find((candidate) => candidate.agentId === "operator_copilot");
  const top = candidates.filter((candidate) => candidate.agentId !== "operator_copilot" && (!mustIncludeSecurity || candidate.agentId !== "security_agent")).slice(0, 3);
  const recommendedAgents = uniqueCandidates([
    ...top,
    ...(mustIncludeSecurity && security ? [security] : []),
    ...(operator ? [operator] : []),
  ]).slice(0, 5);
  const rawGates = ["operator_review_required", ...(input.approvalGates ?? []), ...recommendedAgents.flatMap((candidate) => candidate.requiredApprovals.map((gate) => gate.id))];
  const approvalGates = Array.from(new Set(rawGates)).map((gate) => toApprovalGate(gate));
  const blockedActions = Array.from(new Set([...risk.blockedActions, ...brokerBoundaryActions, ...(input.forbiddenActions ?? [])]));

  return {
    input,
    recommendedAgents,
    riskEnergy: risk.riskEnergy,
    safetyGrade: risk.safetyGrade,
    blockedActions,
    approvalGates,
    reasoning: [
      "Broker P0 used the real Home Center Agent Registry as the source of truth.",
      `Permission matrix confirms executionEnabled=${String(permissions.executionEnabled)}, externalContactEnabled=${String(permissions.externalContactEnabled)}, githubWritesEnabled=${String(permissions.githubWritesEnabled)}, paymentActionsEnabled=${String(permissions.paymentActionsEnabled)}.`,
      `Quantum-inspired risk energy model returned riskEnergy=${risk.riskEnergy} and safetyGrade=${risk.safetyGrade}.`,
      "Candidates were ranked deterministically by connector fit, capability keywords, policy blocks, approval gates, security fit and task category fit.",
      "Decision is preview-only; no task state, database row, external service, GitHub object or payment object was mutated.",
    ],
    operatorNextAction: "Review the recommended agents and approval gates manually. Future Execution Center handoff remains disabled in P0.",
  };
}
