/**
 * Tipos de domínio do GXEON Clawlancer Monitor.
 * Estes tipos são o contrato entre o dashboard e a futura API backend.
 * NUNCA incluir seed phrases, private keys ou segredos aqui — somente dados públicos.
 */

export type DataMode = "demo" | "live";

export type PipelineStage =
  | "claim"
  | "assigned"
  | "delivery"
  | "release"
  | "payment_verified";

export const PIPELINE_ORDER: PipelineStage[] = [
  "claim",
  "assigned",
  "delivery",
  "release",
  "payment_verified",
];

export type StageState = "pending" | "active" | "done" | "blocked";

export interface PipelineStep {
  stage: PipelineStage;
  state: StageState;
  at?: string; // ISO timestamp
  note?: string;
}

export type OpportunityRisk = "low" | "medium" | "high";

export interface Opportunity {
  listingId: string;
  title: string;
  category: string;
  rewardUsdc: number;
  postedAt: string;
  deadlineAt?: string;
  fitScore: number; // 0..100
  risk: OpportunityRisk;
  requesterReputation: number; // 0..5
  status: "open" | "watching" | "claimed" | "expired";
  demo?: boolean;
}

export type TaskPriority = "critical" | "high" | "normal" | "low";

export interface Task {
  id: string;
  listingId: string;
  title: string;
  stage: PipelineStage;
  priority: TaskPriority;
  rewardUsdc: number;
  updatedAt: string;
  owner: string; // agent id
  needsManualGate: boolean;
  demo?: boolean;
}

export type EvidenceKind =
  | "claim"
  | "assignment"
  | "delivery"
  | "release"
  | "onchain"
  | "system"
  | "manual_gate";

export interface EvidenceEntry {
  id: string;
  at: string;
  kind: EvidenceKind;
  title: string;
  detail: string;
  ref?: { label: string; value: string; href?: string };
  verified: boolean;
  demo?: boolean;
}

export interface Identity {
  agentId: string;
  publicWallet: string; // endereço público — nunca chave privada
  network: string;
  listingId: string | null;
  transactionId: string | null;
  transactionHash: string | null;
  usdcBalance: number | null;
  balanceCheckedAt: string | null;
  demo?: boolean;
}

export interface EarningsPoint {
  date: string; // YYYY-MM-DD
  pendingUsdc: number;
  verifiedUsdc: number;
}

export interface Performance {
  totalVerifiedUsdc: number;
  totalPendingUsdc: number;
  tasksCompleted: number;
  tasksInFlight: number;
  avgCycleHours: number;
  successRate: number; // 0..1
  series: EarningsPoint[];
  demo?: boolean;
}

export interface MonetizationLine {
  id: string;
  name: string;
  description: string;
  startedAt: string;
  pipeline: PipelineStep[];
  releaseConfirmed: boolean;
  releaseTxHash: string | null;
  paymentVerified: boolean;
  demo?: boolean;
}

export interface MonitorSnapshot {
  mode: DataMode;
  generatedAt: string;
  source: string;
  identity: Identity;
  line: MonetizationLine;
  opportunities: Opportunity[];
  tasks: Task[];
  evidence: EvidenceEntry[];
  performance: Performance;
}