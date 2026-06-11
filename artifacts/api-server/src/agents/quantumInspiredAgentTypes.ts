/**
 * Quantum-Inspired Agent Intelligence Layer — P0 Advisory Types (Classical only)
 *
 * This module provides classical decision intelligence helpers that can be used
 * alongside the existing Home Center Agents P0 registry.
 *
 * CRITICAL BOUNDARIES:
 * - Purely classical algorithms (weighted scoring, penalty models, capability matching).
 * - No real quantum hardware or claims.
 * - All outputs are ADVISORY / PREVIEW_ONLY.
 * - Never trigger execution, install, external contact, GitHub writes or payments.
 */

export type QuantumMode = "CLASSICAL_PREVIEW_ONLY";

export interface QuantumInspiredSignal {
  amplitude: number;
  explanation: string;
}

export interface PriorityAmplitude {
  priority: number; // 0-1
  signals: QuantumInspiredSignal[];
  riskEnergy: number;
  recommendedAction: string;
  reasoning: string[];
}

export interface RiskEnergy {
  riskEnergy: number;
  safetyGrade: number;
  blockedActions: string[];
  safeAlternative: string;
  penalties: Array<{ flagOrAction: string; energyPenalty: number; reason: string }>;
}

export interface AgentRouteCandidate {
  agentId: string;
  agentName: string;
  fitScore: number;
  roleInRoute: string;
  blockedCapabilities: string[];
  requiredApprovals: string[];
  confidence: number;
  notes: string[];
}

export interface QuantumInspiredDecisionPreview {
  id: string;
  inputType: "OPPORTUNITY" | "TASK";
  inputId: string;
  mode: QuantumMode;
  realQuantumHardware: false;
  autonomousExecution: false;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  priorityAmplitude: PriorityAmplitude;
  riskEnergy: RiskEnergy;
  recommendedRoutes: AgentRouteCandidate[];
  scenarioOptions: number;
  createdAt: string;
}

export interface OpportunityLikeInput {
  id: string;
  score: number;
  riskFlags: string[];
  category: string;
  recommendedNextStep?: string;
  offerTemplateId?: string | null;
  estimatedEffortDays?: number;
  connectorRequirements?: string[];
}

export interface TaskLikeInput {
  id?: string;
  title: string;
  requiredConnectors?: string[];
  forbiddenActions?: string[];
  opportunityId?: string;
}