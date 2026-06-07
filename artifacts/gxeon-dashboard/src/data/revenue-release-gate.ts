export type ReleaseStatus = "PENDING_REVIEW" | "READY_FOR_RELEASE" | "BLOCKED" | "RELEASED_SAMPLE" | "ARCHIVED";
export type FinancialReadinessState = "NOT_READY" | "NEEDS_REVIEW" | "READY_MANUAL" | "SAMPLE_RELEASED" | "ARCHIVED";
export type EvidenceCompleteness = "INCOMPLETE" | "PARTIAL" | "COMPLETE" | "VERIFIED_SAMPLE";
export type AuthorizationStatus = "NOT_REQUESTED" | "PENDING_OPERATOR" | "AUTHORIZED_SAMPLE" | "BLOCKED" | "ARCHIVED";

export type ReleaseApprovalStep = {
  role: "Operator" | "Validator" | "Financial Reviewer" | "Founder";
  owner: "Junior Sena" | "GXEON Operator" | "Manual Review" | "Codex";
  status: "WAITING" | "APPROVED_SAMPLE" | "NEEDS_ACTION" | "BLOCKED" | "ARCHIVED";
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
  authorization_status: AuthorizationStatus;
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
  data_mode: "sample_manual_first";
};

export type RevenueReleaseSummary = {
  total_records: number;
  pending_review: number;
  ready_for_release: number;
  blocked: number;
  released_sample: number;
  archived: number;
  estimated_revenue_total_brl: number;
  releasable_revenue_total_brl: number;
  average_readiness_score: number;
  complete_evidence_count: number;
  authorized_sample_count: number;
};

export const releaseStatuses: ReleaseStatus[] = ["PENDING_REVIEW", "READY_FOR_RELEASE", "BLOCKED", "RELEASED_SAMPLE", "ARCHIVED"];

export const sampleRevenueReleases: RevenueReleaseRecord[] = [
  {
    id: "REL-P4-001",
    opportunity_id: "OPP-P0-007",
    task_id: "TASK-P1-005",
    execution_id: "EXEC-P2-005",
    validation_id: "VAL-P3-003",
    title: "Safe AI workflow boundary release packet",
    client_label: "Sample startup team",
    release_status: "READY_FOR_RELEASE",
    financial_readiness_state: "READY_MANUAL",
    evidence_completeness: "VERIFIED_SAMPLE",
    authorization_status: "AUTHORIZED_SAMPLE",
    estimated_revenue_brl: 7800,
    releasable_revenue_brl: 7800,
    readiness_score: 94,
    checklist: {
      delivery_approved: true,
      evidence_complete: true,
      scope_confirmed: true,
      release_authorized: true,
      financial_ready: true,
    },
    approval_chain: [
      { role: "Validator", owner: "GXEON Operator", status: "APPROVED_SAMPLE", note: "P3 validation marked approved in the static sample set." },
      { role: "Financial Reviewer", owner: "Manual Review", status: "APPROVED_SAMPLE", note: "Manual release wording reviewed; no invoice or payment action created." },
      { role: "Founder", owner: "Junior Sena", status: "APPROVED_SAMPLE", note: "Founder sample approval captured as a visual label only." },
    ],
    release_summary: "Eligible for a manual release conversation after scope and evidence labels are checked by the operator.",
    next_manual_action: "Prepare a human-reviewed release note and keep payment collection outside GXEON OS until P5 is approved.",
    p0_p1_p2_p3_p4_trace: "OPP-P0-007 → TASK-P1-005 → EXEC-P2-005 → VAL-P3-003 → REL-P4-001",
    created_at: "2026-06-07T12:00:00.000Z",
    updated_at: "2026-06-07T12:25:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "REL-P4-002",
    opportunity_id: "OPP-P0-003",
    task_id: "TASK-P1-001",
    execution_id: "EXEC-P2-001",
    validation_id: "VAL-P3-001",
    title: "Agency reporting dashboard milestone release review",
    client_label: "Sample agency operations team",
    release_status: "PENDING_REVIEW",
    financial_readiness_state: "NEEDS_REVIEW",
    evidence_completeness: "PARTIAL",
    authorization_status: "PENDING_OPERATOR",
    estimated_revenue_brl: 9500,
    releasable_revenue_brl: 0,
    readiness_score: 58,
    checklist: {
      delivery_approved: false,
      evidence_complete: false,
      scope_confirmed: true,
      release_authorized: false,
      financial_ready: false,
    },
    approval_chain: [
      { role: "Validator", owner: "Junior Sena", status: "WAITING", note: "P3 remains in manual review with an evidence revision requirement." },
      { role: "Financial Reviewer", owner: "Manual Review", status: "WAITING", note: "Financial readiness cannot advance until validation approval is complete." },
      { role: "Founder", owner: "Junior Sena", status: "WAITING", note: "No release approval requested yet." },
    ],
    release_summary: "Revenue is estimated only and intentionally held until P3 evidence is manually completed.",
    next_manual_action: "Finish P3 validation, verify evidence labels, then revisit manual financial readiness.",
    p0_p1_p2_p3_p4_trace: "OPP-P0-003 → TASK-P1-001 → EXEC-P2-001 → VAL-P3-001 → REL-P4-002",
    created_at: "2026-06-07T12:05:00.000Z",
    updated_at: "2026-06-07T12:20:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "REL-P4-003",
    opportunity_id: "OPP-P0-001",
    task_id: "TASK-P1-002",
    execution_id: "EXEC-P2-002",
    validation_id: "VAL-P3-002",
    title: "Landing page checklist release block",
    client_label: "Sample local clinic",
    release_status: "BLOCKED",
    financial_readiness_state: "NOT_READY",
    evidence_completeness: "PARTIAL",
    authorization_status: "BLOCKED",
    estimated_revenue_brl: 4200,
    releasable_revenue_brl: 0,
    readiness_score: 36,
    checklist: {
      delivery_approved: false,
      evidence_complete: false,
      scope_confirmed: false,
      release_authorized: false,
      financial_ready: false,
    },
    approval_chain: [
      { role: "Validator", owner: "GXEON Operator", status: "NEEDS_ACTION", note: "Copy revision requested before acceptance can be marked." },
      { role: "Operator", owner: "Manual Review", status: "BLOCKED", note: "Scope wording needs safer non-guaranteed language." },
      { role: "Financial Reviewer", owner: "Manual Review", status: "BLOCKED", note: "Release is blocked; no billing, payment, or ledger action is available." },
    ],
    release_summary: "Blocked by scope wording and evidence revisions; no revenue is treated as approved.",
    blocker: "Copy revision and scope confirmation are incomplete.",
    next_manual_action: "Rewrite conversion language, re-check evidence, and return to P3 before re-opening P4.",
    p0_p1_p2_p3_p4_trace: "OPP-P0-001 → TASK-P1-002 → EXEC-P2-002 → VAL-P3-002 → REL-P4-003",
    created_at: "2026-06-07T12:10:00.000Z",
    updated_at: "2026-06-07T12:22:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "REL-P4-004",
    opportunity_id: "OPP-P0-006",
    task_id: "TASK-P1-003",
    execution_id: "EXEC-P2-003",
    validation_id: "VAL-P3-004",
    title: "Appointment reminder workflow future release",
    client_label: "Sample local service business",
    release_status: "PENDING_REVIEW",
    financial_readiness_state: "NEEDS_REVIEW",
    evidence_completeness: "INCOMPLETE",
    authorization_status: "NOT_REQUESTED",
    estimated_revenue_brl: 5200,
    releasable_revenue_brl: 0,
    readiness_score: 24,
    checklist: {
      delivery_approved: false,
      evidence_complete: false,
      scope_confirmed: true,
      release_authorized: false,
      financial_ready: false,
    },
    approval_chain: [
      { role: "Operator", owner: "Manual Review", status: "WAITING", note: "Workflow map is not yet validated for release." },
      { role: "Validator", owner: "Manual Review", status: "WAITING", note: "Evidence remains missing in the sample execution path." },
      { role: "Financial Reviewer", owner: "Junior Sena", status: "WAITING", note: "No readiness approval can be issued at this stage." },
    ],
    release_summary: "Early-stage manual opportunity remains visible for forecasting without any revenue claim.",
    next_manual_action: "Complete P2 proof and P3 validation before considering release readiness.",
    p0_p1_p2_p3_p4_trace: "OPP-P0-006 → TASK-P1-003 → EXEC-P2-003 → VAL-P3-004 → REL-P4-004",
    created_at: "2026-06-07T12:15:00.000Z",
    updated_at: "2026-06-07T12:15:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "REL-P4-005",
    opportunity_id: "OPP-P0-008",
    task_id: "TASK-P1-006",
    execution_id: "EXEC-P2-006",
    validation_id: "VAL-P3-005",
    title: "Static reporting sample release archive",
    client_label: "Sample archived account",
    release_status: "RELEASED_SAMPLE",
    financial_readiness_state: "SAMPLE_RELEASED",
    evidence_completeness: "COMPLETE",
    authorization_status: "AUTHORIZED_SAMPLE",
    estimated_revenue_brl: 3100,
    releasable_revenue_brl: 3100,
    readiness_score: 88,
    checklist: {
      delivery_approved: true,
      evidence_complete: true,
      scope_confirmed: true,
      release_authorized: true,
      financial_ready: true,
    },
    approval_chain: [
      { role: "Validator", owner: "Codex", status: "APPROVED_SAMPLE", note: "Static sample release demonstrates the post-gate visual state." },
      { role: "Financial Reviewer", owner: "Manual Review", status: "APPROVED_SAMPLE", note: "No settlement, invoice, or receipt was created." },
    ],
    release_summary: "Released sample state shows how a completed manual gate can look without claiming received revenue.",
    next_manual_action: "Archive the sample after review and wait for P5 ledger design before tracking received values.",
    p0_p1_p2_p3_p4_trace: "OPP-P0-008 → TASK-P1-006 → EXEC-P2-006 → VAL-P3-005 → REL-P4-005",
    created_at: "2026-06-07T12:18:00.000Z",
    updated_at: "2026-06-07T12:30:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "REL-P4-006",
    opportunity_id: "OPP-P0-004",
    task_id: "TASK-P1-007",
    execution_id: "EXEC-P2-007",
    validation_id: "VAL-P3-006",
    title: "Legacy sample release archive",
    client_label: "Sample dormant lead",
    release_status: "ARCHIVED",
    financial_readiness_state: "ARCHIVED",
    evidence_completeness: "INCOMPLETE",
    authorization_status: "ARCHIVED",
    estimated_revenue_brl: 2600,
    releasable_revenue_brl: 0,
    readiness_score: 0,
    checklist: {
      delivery_approved: false,
      evidence_complete: false,
      scope_confirmed: false,
      release_authorized: false,
      financial_ready: false,
    },
    approval_chain: [
      { role: "Operator", owner: "GXEON Operator", status: "ARCHIVED", note: "Dormant sample held for UI completeness only." },
    ],
    release_summary: "Archived records remain visible for traceability but are excluded from manual release preparation.",
    next_manual_action: "No action; keep the record archived unless a human operator re-qualifies the opportunity.",
    p0_p1_p2_p3_p4_trace: "OPP-P0-004 → TASK-P1-007 → EXEC-P2-007 → VAL-P3-006 → REL-P4-006",
    created_at: "2026-06-07T12:20:00.000Z",
    updated_at: "2026-06-07T12:20:00.000Z",
    data_mode: "sample_manual_first",
  },
];

export function getRevenueReleaseSummary(): RevenueReleaseSummary {
  const activeRecords = sampleRevenueReleases.filter((release) => release.release_status !== "ARCHIVED");
  const readinessTotal = activeRecords.reduce((total, release) => total + release.readiness_score, 0);

  return {
    total_records: sampleRevenueReleases.length,
    pending_review: sampleRevenueReleases.filter((release) => release.release_status === "PENDING_REVIEW").length,
    ready_for_release: sampleRevenueReleases.filter((release) => release.release_status === "READY_FOR_RELEASE").length,
    blocked: sampleRevenueReleases.filter((release) => release.release_status === "BLOCKED").length,
    released_sample: sampleRevenueReleases.filter((release) => release.release_status === "RELEASED_SAMPLE").length,
    archived: sampleRevenueReleases.filter((release) => release.release_status === "ARCHIVED").length,
    estimated_revenue_total_brl: sampleRevenueReleases.reduce((total, release) => total + release.estimated_revenue_brl, 0),
    releasable_revenue_total_brl: sampleRevenueReleases.reduce((total, release) => total + release.releasable_revenue_brl, 0),
    average_readiness_score: activeRecords.length === 0 ? 0 : Math.round(readinessTotal / activeRecords.length),
    complete_evidence_count: sampleRevenueReleases.filter((release) => ["COMPLETE", "VERIFIED_SAMPLE"].includes(release.evidence_completeness)).length,
    authorized_sample_count: sampleRevenueReleases.filter((release) => release.authorization_status === "AUTHORIZED_SAMPLE").length,
  };
}

export function getReleasesByStatus(status: ReleaseStatus): RevenueReleaseRecord[] {
  return sampleRevenueReleases.filter((release) => release.release_status === status);
}

export function getReleaseStatusCounts(): Array<{ status: ReleaseStatus; count: number }> {
  return releaseStatuses.map((status) => ({ status, count: getReleasesByStatus(status).length }));
}
