export type ReleaseStatus = "PENDING_REVIEW" | "READY_FOR_RELEASE" | "BLOCKED" | "RELEASED_REAL" | "ARCHIVED";
export type FinancialReadinessState = "NOT_READY" | "NEEDS_REVIEW" | "READY_MANUAL" | "REAL_RELEASED" | "ARCHIVED";
export type EvidenceCompleteness = "INCOMPLETE" | "PARTIAL" | "COMPLETE" | "VERIFIED_REAL";
export type OperatorApprovalStatus = "NOT_REQUESTED" | "PENDING_OPERATOR" | "AUTHORIZED_REAL" | "BLOCKED" | "ARCHIVED";

export type ReleaseApprovalStep = {
  role: "Operator" | "Validator" | "Financial Reviewer" | "Founder";
  owner: "Junior Sena" | "GXEON Operator" | "Manual Review" | "Codex";
  status: "WAITING" | "APPROVED_REAL" | "NEEDS_ACTION" | "BLOCKED" | "ARCHIVED";
  note: string;
};

export type FinancialReadinessChecklist = {
  delivery_approved: boolean;
  evidence_complete: boolean;
  scope_confirmed: boolean;
  release_authorized: boolean;
  financial_ready: boolean;
};

export type RevenueReleaseRecord = {
  id: string;
  opportunity_id: string;
  task_id: string;
  execution_id: string;
  validation_id: string;
  title: string;
  client_label: string;
  release_status: ReleaseStatus;
  financial_readiness_state: FinancialReadinessState;
  evidence_completeness: EvidenceCompleteness;
  authorization_status: OperatorApprovalStatus;
  estimated_revenue_brl: number;
  releasable_revenue_brl: number;
  readiness_score: number;
  checklist: FinancialReadinessChecklist;
  approval_chain: ReleaseApprovalStep[];
  release_summary: string;
  blocker?: string;
  next_manual_action: string;
  p0_p1_p2_p3_p4_trace: string;
  created_at: string;
  updated_at: string;
  data_mode: "real";
};

export type RevenueReleaseSummary = {
  total_records: number;
  pending_review: number;
  ready_for_release: number;
  blocked: number;
  released_real: number;
  archived: number;
  estimated_revenue_total_brl: number;
  releasable_revenue_total_brl: number;
  average_readiness_score: number;
  complete_evidence_count: number;
  authorized_real_count: number;
};

export const releaseStatuses: ReleaseStatus[] = ["PENDING_REVIEW", "READY_FOR_RELEASE", "BLOCKED", "RELEASED_REAL", "ARCHIVED"];

export const realRevenueReleases: RevenueReleaseRecord[] = [];

export const activeOperationalReleases: RevenueReleaseRecord[] = [];

export function getRevenueReleaseSummary(releases: RevenueReleaseRecord[] = activeOperationalReleases): RevenueReleaseSummary {
  const activeRecords = releases.filter((release) => release.release_status !== "ARCHIVED");
  const readinessTotal = activeRecords.reduce((total, release) => total + release.readiness_score, 0);

  return {
    total_records: releases.length,
    pending_review: releases.filter((release) => release.release_status === "PENDING_REVIEW").length,
    ready_for_release: releases.filter((release) => release.release_status === "READY_FOR_RELEASE").length,
    blocked: releases.filter((release) => release.release_status === "BLOCKED").length,
    released_real: 0,
    archived: releases.filter((release) => release.release_status === "ARCHIVED").length,
    estimated_revenue_total_brl: releases.reduce((total, release) => total + release.estimated_revenue_brl, 0),
    releasable_revenue_total_brl: releases.reduce((total, release) => total + release.releasable_revenue_brl, 0),
    average_readiness_score: activeRecords.length === 0 ? 0 : Math.round(readinessTotal / activeRecords.length),
    complete_evidence_count: releases.filter((release) => ["COMPLETE", "VERIFIED_REAL"].includes(release.evidence_completeness)).length,
    authorized_real_count: 0,
  };
}

export function getReleasesByStatus(status: ReleaseStatus, releases: RevenueReleaseRecord[] = activeOperationalReleases): RevenueReleaseRecord[] {
  return releases.filter((release) => release.release_status === status);
}

export function getReleaseStatusCounts(releases: RevenueReleaseRecord[] = activeOperationalReleases): Array<{ status: ReleaseStatus; count: number }> {
  return releaseStatuses.map((status) => ({ status, count: getReleasesByStatus(status, releases).length }));
}
