import { buildBrokerDecisionInput } from "./brokerRoutingEngine";
import type { BrokerDecisionCreateInput, BrokerDecisionPreview, BrokerInputTask } from "./brokerTypes";

const decisions = new Map<string, BrokerDecisionPreview>();
let sequence = 0;

function createId(): string {
  sequence += 1;
  return `broker_preview_${Date.now()}_${sequence}`;
}

export function createBrokerDecisionPreview(input: BrokerInputTask): BrokerDecisionPreview {
  const createInput: BrokerDecisionCreateInput = buildBrokerDecisionInput(input);
  const decision: BrokerDecisionPreview = {
    id: createId(),
    mode: "PREVIEW_ONLY",
    taskId: createInput.input.taskId ?? null,
    title: createInput.input.title,
    recommendedAgents: createInput.recommendedAgents,
    riskEnergy: createInput.riskEnergy,
    safetyGrade: createInput.safetyGrade,
    blockedActions: createInput.blockedActions,
    approvalGates: createInput.approvalGates,
    reasoning: createInput.reasoning,
    operatorNextAction: createInput.operatorNextAction,
    approvalRequired: true,
    executionDisabled: true,
    autonomousExecution: false,
    externalContact: false,
    githubWrites: false,
    paymentAction: false,
    sourceOfTruth: "HOME_CENTER_AGENT_REGISTRY",
    createdAt: new Date().toISOString(),
  };
  decisions.set(decision.id, decision);
  return decision;
}

export function listBrokerDecisions(): BrokerDecisionPreview[] {
  return Array.from(decisions.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getBrokerDecisionById(id: string): BrokerDecisionPreview | null {
  return decisions.get(id) ?? null;
}

export function clearBrokerDecisionsForTests(): void {
  decisions.clear();
  sequence = 0;
}
