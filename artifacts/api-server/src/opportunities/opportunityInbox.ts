import type { GitHubOpportunityCategory } from "../radar/githubOpportunityTypes";
import type { RadarManualSource } from "../radar/radarManualIntake";
import { type CreateOpportunityFromGitHubPreviewInput, type CreateOpportunityFromManualPreviewInput, type OpportunityInboxStatus, type OpportunityOfferTemplateId, type OpportunityPipelineCounts, type OpportunityRecord, type OpportunityRiskFlag, type OpportunityStatus, normalizeGitHubRiskFlag } from "./opportunityTypes";

const opportunities = new Map<string, OpportunityRecord>();
const dedupeIndex = new Map<string, string>();

const safeTransitions: Record<OpportunityStatus, OpportunityStatus[]> = {
  NEW: ["REVIEW", "LOST"],
  REVIEW: ["QUALIFIED", "LOST"],
  QUALIFIED: ["PROPOSAL_DRAFTED", "TASK_READY", "EVIDENCE_READY", "LOST"],
  PROPOSAL_DRAFTED: ["TASK_READY", "EVIDENCE_READY", "LOST"],
  TASK_READY: ["EVIDENCE_READY", "EXECUTION_READY", "LOST"],
  EVIDENCE_READY: ["EXECUTION_READY", "DONE", "LOST"],
  EXECUTION_READY: ["DONE", "LOST"],
  DONE: [],
  LOST: [],
};

function now(): string {
  return new Date().toISOString();
}

function clean(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 2000) || fallback : fallback;
}

function createId(prefix = "opp"): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function manualCategory(source: RadarManualSource): string {
  const sourceMap: Record<RadarManualSource, string> = {
    Manual: "operator_manual",
    Referral: "referral",
    Workana: "marketplace_manual",
    "99Freelas": "marketplace_manual",
    LinkedIn: "professional_network_manual",
    Email: "inbound_manual",
    Form: "inbound_manual",
  };
  return sourceMap[source];
}

export function mapCategoryToOfferTemplate(category: string): OpportunityOfferTemplateId | null {
  const normalized = category.toLowerCase();
  if (normalized.includes("deploy") || normalized.includes("vercel") || normalized.includes("railway") || normalized.includes("bug") || normalized.includes("ci")) return "deploy_fix";
  if (normalized.includes("dashboard")) return "simple_dashboard";
  if (normalized.includes("automation") || normalized.includes("agent")) return "automation_flow";
  if (normalized.includes("analytics")) return "analytics_setup";
  if (normalized.includes("checkout") || normalized.includes("payment")) return "checkout_setup";
  if (normalized.includes("landing") || normalized.includes("frontend") || normalized.includes("documentation")) return "landing_page";
  if (normalized.includes("integration") || normalized.includes("supabase")) return "automation_flow";
  return null;
}

function dedupeKey(record: Pick<OpportunityRecord, "sourceUrl" | "repository" | "title">): string {
  if (record.sourceUrl) return `url:${record.sourceUrl.toLowerCase()}`;
  if (record.repository && record.title) return `repo-title:${record.repository.toLowerCase()}::${record.title.toLowerCase()}`;
  return `title:${record.title.toLowerCase()}`;
}

function putOrReturnDuplicate(record: OpportunityRecord): OpportunityRecord {
  const key = dedupeKey(record);
  const existingId = dedupeIndex.get(key);
  if (existingId) {
    const existing = opportunities.get(existingId);
    if (existing) return existing;
  }
  opportunities.set(record.id, record);
  dedupeIndex.set(key, record.id);
  return record;
}

export function createOpportunityFromManualPreview(input: CreateOpportunityFromManualPreviewInput): OpportunityRecord {
  if (input.operatorConfirmed !== true) throw new Error("OPERATOR_CONFIRMATION_REQUIRED");
  if (!input.preview?.accepted || input.preview.persistence !== "PREVIEW_ONLY" || input.preview.automation !== "NONE") throw new Error("RADAR_MANUAL_PREVIEW_REQUIRED");

  const category = manualCategory(input.preview.normalized.source);
  const riskFlags: OpportunityRiskFlag[] = [];
  if (!input.preview.normalized.budget) riskFlags.push("no_budget_signal");
  riskFlags.push("manual_qualification_required", "payment_not_connected", "execution_not_authorized");

  const timestamp = now();
  return putOrReturnDuplicate({
    id: createId(),
    source: "radar_manual",
    status: "REVIEW",
    title: clean(input.preview.normalized.title, "Manual opportunity"),
    problemSummary: clean(input.preview.normalized.problem, "Manual opportunity requires qualification."),
    category,
    score: input.preview.score,
    sourceUrl: null,
    repository: null,
    recommendedNextStep: input.preview.recommendedNextStep,
    riskFlags,
    scoringExplanation: input.preview.scoringExplanation,
    offerTemplateId: mapCategoryToOfferTemplate(category),
    sourceSnapshot: input.preview,
    manualApprovalRequired: true,
    externalAction: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function createOpportunityFromGitHubPreview(input: CreateOpportunityFromGitHubPreviewInput): OpportunityRecord {
  if (input.operatorConfirmed !== true) throw new Error("OPERATOR_CONFIRMATION_REQUIRED");
  const candidate = input.candidate;
  if (!candidate || candidate.runtime?.persistence !== "PREVIEW_ONLY" || candidate.runtime?.automation !== "NONE" || candidate.runtime?.githubWrites !== false) throw new Error("RADAR_GITHUB_PREVIEW_REQUIRED");

  const score = candidate.opportunityScore;
  const riskFlags = (score?.riskFlags ?? []).map(normalizeGitHubRiskFlag);
  if (!riskFlags.includes("execution_not_authorized")) riskFlags.push("execution_not_authorized");
  if (!riskFlags.includes("payment_not_connected")) riskFlags.push("payment_not_connected");
  const timestamp = now();
  return putOrReturnDuplicate({
    id: createId(),
    source: "radar_github",
    status: "REVIEW",
    title: clean(candidate.title, "GitHub opportunity"),
    problemSummary: clean(candidate.bodyExcerpt, candidate.repository.description ?? "GitHub preview candidate requires manual qualification."),
    category: clean(candidate.category as GitHubOpportunityCategory, "integration_help"),
    score: score?.score ?? 0,
    sourceUrl: clean(candidate.url) || null,
    repository: clean(candidate.repository.fullName) || null,
    recommendedNextStep: score?.recommendedNextStep ?? "manual_review",
    riskFlags,
    scoringExplanation: score?.scoringExplanation ?? ["Imported from Radar X GitHub preview. Manual review required before any external action."],
    offerTemplateId: mapCategoryToOfferTemplate(candidate.category),
    sourceSnapshot: candidate,
    manualApprovalRequired: true,
    externalAction: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function listOpportunities(): OpportunityRecord[] {
  return Array.from(opportunities.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getOpportunityById(id: string): OpportunityRecord | null {
  return opportunities.get(id) ?? null;
}

export function updateOpportunityStatus(id: string, nextStatus: OpportunityStatus): OpportunityRecord {
  const opportunity = opportunities.get(id);
  if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  if (!safeTransitions[opportunity.status].includes(nextStatus)) throw new Error("OPPORTUNITY_STATUS_TRANSITION_NOT_ALLOWED");
  const updated: OpportunityRecord = { ...opportunity, status: nextStatus, updatedAt: now() };
  opportunities.set(id, updated);
  dedupeIndex.set(dedupeKey(updated), id);
  return updated;
}

export function getOpportunityPipelineCounts(): OpportunityPipelineCounts {
  const counts: OpportunityPipelineCounts = { total: opportunities.size, new: 0, review: 0, qualified: 0, proposalDrafted: 0, taskReady: 0, evidenceReady: 0, executionReady: 0, done: 0, lost: 0 };
  for (const opportunity of opportunities.values()) {
    if (opportunity.status === "NEW") counts.new += 1;
    if (opportunity.status === "REVIEW") counts.review += 1;
    if (opportunity.status === "QUALIFIED") counts.qualified += 1;
    if (opportunity.status === "PROPOSAL_DRAFTED") counts.proposalDrafted += 1;
    if (opportunity.status === "TASK_READY") counts.taskReady += 1;
    if (opportunity.status === "EVIDENCE_READY") counts.evidenceReady += 1;
    if (opportunity.status === "EXECUTION_READY") counts.executionReady += 1;
    if (opportunity.status === "DONE") counts.done += 1;
    if (opportunity.status === "LOST") counts.lost += 1;
  }
  return counts;
}

export function getOpportunityInboxStatus(): OpportunityInboxStatus {
  return {
    status: "OPPORTUNITY_INBOX_READY",
    persistence: "IN_MEMORY_P0",
    externalContact: false,
    autonomousExecution: false,
    paymentCapture: false,
    manualFirst: true,
    counts: getOpportunityPipelineCounts(),
    boundaries: ["No external contact", "No GitHub writes", "No autonomous execution", "No checkout session creation", "No payment capture"],
  };
}
