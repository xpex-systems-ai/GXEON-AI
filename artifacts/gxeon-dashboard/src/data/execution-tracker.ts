export type ExecutionType = "Discovery" | "Proposal" | "Frontend" | "Dashboard" | "Automation" | "Documentation" | "Review" | "Delivery" | "Follow-up" | "Other";
export type ExecutionStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "DELIVERED" | "VERIFIED" | "ARCHIVED";
export type ExecutionOwner = "Junior Sena" | "GXEON Operator" | "Codex" | "Copilot" | "Manual Review";
export type ExecutionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ProofType = "GitHub PR" | "Vercel Preview" | "Screenshot" | "Proposal Draft" | "Client Note" | "Manual Evidence" | "Report" | "None";
export type ProofStatus = "MISSING" | "DRAFT" | "ATTACHED_SAMPLE" | "READY_FOR_REVIEW" | "VERIFIED_SAMPLE";

export type ExecutionRecord = {
  id: string;
  opportunity_id?: string;
  task_id: string;
  title: string;
  client_label: string;
  execution_type: ExecutionType;
  status: ExecutionStatus;
  progress_percent: number;
  owner: ExecutionOwner;
  priority: ExecutionPriority;
  estimated_value_brl: number;
  blocker?: string;
  next_action: string;
  proof_type: ProofType;
  proof_label: string;
  proof_status: ProofStatus;
  deliverable?: string;
  created_at: string;
  updated_at: string;
  data_mode: "sample_manual_first";
};

export type ExecutionSummary = {
  active_executions: number;
  blocked_executions: number;
  ready_for_review: number;
  delivered_sample: number;
  estimated_value_in_execution_brl: number;
  average_progress: number;
  missing_proof_count: number;
};

export const executionStatuses: ExecutionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DELIVERED", "VERIFIED", "ARCHIVED"];
export const executionBoardStatuses: ExecutionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DELIVERED", "VERIFIED"];
export const activeExecutionStatuses: ExecutionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW"];
export const proofStatuses: ProofStatus[] = ["MISSING", "DRAFT", "ATTACHED_SAMPLE", "READY_FOR_REVIEW", "VERIFIED_SAMPLE"];

export const sampleManualFirstExecutions: ExecutionRecord[] = [
  {
    id: "EXEC-P2-001",
    opportunity_id: "OPP-P0-003",
    task_id: "TASK-P1-001",
    title: "Agency reporting dashboard milestone proposal",
    client_label: "Sample agency operations team",
    execution_type: "Proposal",
    status: "IN_PROGRESS",
    progress_percent: 52,
    owner: "Junior Sena",
    priority: "CRITICAL",
    estimated_value_brl: 9500,
    next_action: "Convert the milestone outline into a sample proposal draft and mark evidence gaps manually.",
    proof_type: "Proposal Draft",
    proof_label: "Sample proposal outline · placeholder only",
    proof_status: "DRAFT",
    deliverable: "Milestone proposal draft with explicit no-live-integration scope.",
    created_at: "2026-06-06T09:00:00.000Z",
    updated_at: "2026-06-07T08:20:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-002",
    opportunity_id: "OPP-P0-001",
    task_id: "TASK-P1-002",
    title: "Landing page checklist and acceptance criteria",
    client_label: "Sample local clinic",
    execution_type: "Frontend",
    status: "IN_PROGRESS",
    progress_percent: 38,
    owner: "GXEON Operator",
    priority: "HIGH",
    estimated_value_brl: 4200,
    next_action: "List manual sections, conversion goal, and approval questions before any implementation work.",
    proof_type: "Manual Evidence",
    proof_label: "Checklist notes · sample/manual-first",
    proof_status: "ATTACHED_SAMPLE",
    deliverable: "One-page landing page execution checklist.",
    created_at: "2026-06-06T10:10:00.000Z",
    updated_at: "2026-06-07T08:40:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-003",
    opportunity_id: "OPP-P0-006",
    task_id: "TASK-P1-003",
    title: "Appointment reminder workflow map",
    client_label: "Sample local service business",
    execution_type: "Automation",
    status: "NOT_STARTED",
    progress_percent: 8,
    owner: "Manual Review",
    priority: "HIGH",
    estimated_value_brl: 5200,
    next_action: "Interview the operator manually and draw the current reminder path without calendar or messaging APIs.",
    proof_type: "None",
    proof_label: "No evidence attached yet · sample state",
    proof_status: "MISSING",
    deliverable: "Manual workflow map and future integration risk note.",
    created_at: "2026-06-06T10:30:00.000Z",
    updated_at: "2026-06-06T10:30:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-004",
    opportunity_id: "OPP-P0-002",
    task_id: "TASK-P1-004",
    title: "Founder CRM discovery packet",
    client_label: "Sample founder pipeline",
    execution_type: "Discovery",
    status: "BLOCKED",
    progress_percent: 55,
    owner: "GXEON Operator",
    priority: "HIGH",
    estimated_value_brl: 6800,
    blocker: "Waiting for manually supplied sample pain points; LinkedIn and CRM data are not fetched.",
    next_action: "Keep blocked until the operator provides consented, non-identifying discovery notes.",
    proof_type: "Client Note",
    proof_label: "Pending manual note · no external fetch",
    proof_status: "MISSING",
    deliverable: "Discovery question packet and CRM cleanup scope hypothesis.",
    created_at: "2026-06-06T11:00:00.000Z",
    updated_at: "2026-06-07T09:05:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-005",
    opportunity_id: "OPP-P0-007",
    task_id: "TASK-P1-005",
    title: "Safe AI workflow boundary review",
    client_label: "Sample startup team",
    execution_type: "Review",
    status: "REVIEW",
    progress_percent: 78,
    owner: "Codex",
    priority: "HIGH",
    estimated_value_brl: 7800,
    next_action: "Review sample copy for honest boundaries before the operator uses it as a proposal reference.",
    proof_type: "Report",
    proof_label: "Boundary review report · sample",
    proof_status: "READY_FOR_REVIEW",
    deliverable: "Manual safety language report for AI workflow scoping.",
    created_at: "2026-06-06T11:30:00.000Z",
    updated_at: "2026-06-07T09:25:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-006",
    opportunity_id: "OPP-P0-004",
    task_id: "TASK-P1-006",
    title: "Inventory spreadsheet cleanup criteria",
    client_label: "Sample retailer operations",
    execution_type: "Documentation",
    status: "IN_PROGRESS",
    progress_percent: 34,
    owner: "Manual Review",
    priority: "MEDIUM",
    estimated_value_brl: 2800,
    next_action: "Write anonymized input requirements and acceptance criteria for manual spreadsheet review.",
    proof_type: "Manual Evidence",
    proof_label: "Anonymized criteria note · sample",
    proof_status: "DRAFT",
    deliverable: "Cleanup criteria checklist with anonymized column guidance.",
    created_at: "2026-06-06T12:00:00.000Z",
    updated_at: "2026-06-07T09:45:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-007",
    opportunity_id: "OPP-P0-005",
    task_id: "TASK-P1-007",
    title: "Creator funnel intake draft",
    client_label: "Sample creator offer",
    execution_type: "Follow-up",
    status: "NOT_STARTED",
    progress_percent: 15,
    owner: "Copilot",
    priority: "MEDIUM",
    estimated_value_brl: 3600,
    next_action: "Draft intake questions for audience, offer, and success metric using sample-only wording.",
    proof_type: "None",
    proof_label: "Evidence not attached · sample placeholder",
    proof_status: "MISSING",
    deliverable: "Manual creator funnel intake checklist.",
    created_at: "2026-06-06T12:20:00.000Z",
    updated_at: "2026-06-06T12:20:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-008",
    opportunity_id: "OPP-P0-008",
    task_id: "TASK-P1-008",
    title: "Sales page audit outline",
    client_label: "Sample small business",
    execution_type: "Documentation",
    status: "REVIEW",
    progress_percent: 66,
    owner: "Junior Sena",
    priority: "MEDIUM",
    estimated_value_brl: 2400,
    next_action: "Review whether each audit step states the required evidence and avoids scraping dependency.",
    proof_type: "Report",
    proof_label: "Audit outline report · sample",
    proof_status: "READY_FOR_REVIEW",
    deliverable: "Sales page audit structure and evidence request list.",
    created_at: "2026-06-06T12:45:00.000Z",
    updated_at: "2026-06-07T10:00:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-009",
    opportunity_id: "OPP-P0-010",
    task_id: "TASK-P1-009",
    title: "Closed sample consulting validation archive",
    client_label: "Sample closed-state record",
    execution_type: "Delivery",
    status: "DELIVERED",
    progress_percent: 100,
    owner: "Manual Review",
    priority: "LOW",
    estimated_value_brl: 900,
    next_action: "Keep delivered as sample-only UI state; do not imply real payment, user, or customer work.",
    proof_type: "Manual Evidence",
    proof_label: "Delivered sample evidence note",
    proof_status: "VERIFIED_SAMPLE",
    deliverable: "Archived manual validation note.",
    created_at: "2026-06-05T17:10:00.000Z",
    updated_at: "2026-06-07T10:10:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-010",
    opportunity_id: "OPP-P0-009",
    task_id: "TASK-P1-010",
    title: "Founder KPI dashboard hold review",
    client_label: "Sample founder KPI board",
    execution_type: "Dashboard",
    status: "ARCHIVED",
    progress_percent: 5,
    owner: "GXEON Operator",
    priority: "LOW",
    estimated_value_brl: 6100,
    blocker: "Budget evidence is unconfirmed; record remains archived and excluded from active value.",
    next_action: "Reopen manually only if the operator records safe budget evidence.",
    proof_type: "Client Note",
    proof_label: "Archived budget note placeholder",
    proof_status: "DRAFT",
    deliverable: "Inactive dashboard scope hypothesis.",
    created_at: "2026-06-05T08:00:00.000Z",
    updated_at: "2026-06-07T10:15:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-011",
    task_id: "TASK-P1-011",
    title: "Reusable dashboard proposal template review",
    client_label: "Sample reusable GXEON template",
    execution_type: "Proposal",
    status: "VERIFIED",
    progress_percent: 100,
    owner: "Codex",
    priority: "MEDIUM",
    estimated_value_brl: 0,
    next_action: "Keep template verified as a sample artifact until persistence and approval workflow are designed.",
    proof_type: "Proposal Draft",
    proof_label: "Verified sample proposal template",
    proof_status: "VERIFIED_SAMPLE",
    deliverable: "Reusable dashboard proposal template for manual use.",
    created_at: "2026-06-06T13:15:00.000Z",
    updated_at: "2026-06-07T10:25:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "EXEC-P2-012",
    task_id: "TASK-P1-012",
    title: "CRM cleanup delivery checklist",
    client_label: "Sample CRM delivery runbook",
    execution_type: "Delivery",
    status: "BLOCKED",
    progress_percent: 22,
    owner: "Copilot",
    priority: "MEDIUM",
    estimated_value_brl: 0,
    blocker: "Needs manual definition of consented export handling before any CRM or database integration can be considered.",
    next_action: "Document consented export assumptions and a manual review gate.",
    proof_type: "None",
    proof_label: "No delivery evidence yet",
    proof_status: "MISSING",
    deliverable: "CRM delivery checklist and consent gate.",
    created_at: "2026-06-06T13:35:00.000Z",
    updated_at: "2026-06-07T10:35:00.000Z",
    data_mode: "sample_manual_first",
  },
];

export function getExecutionStatusCounts(executions: ExecutionRecord[] = sampleManualFirstExecutions) {
  return executionStatuses.map((status) => ({
    status,
    count: executions.filter((execution) => execution.status === status).length,
    estimatedValueBrl: executions
      .filter((execution) => execution.status === status)
      .reduce((total, execution) => total + execution.estimated_value_brl, 0),
  }));
}

export function getProofStatusCounts(executions: ExecutionRecord[] = sampleManualFirstExecutions) {
  return proofStatuses.map((status) => ({
    status,
    count: executions.filter((execution) => execution.proof_status === status).length,
  }));
}

export function getExecutionsByStatus(status: ExecutionStatus, executions: ExecutionRecord[] = sampleManualFirstExecutions) {
  return executions.filter((execution) => execution.status === status);
}

export function getBlockedExecutions(executions: ExecutionRecord[] = sampleManualFirstExecutions) {
  return executions.filter((execution) => execution.status === "BLOCKED" || Boolean(execution.blocker));
}

export function getActiveExecutionValue(executions: ExecutionRecord[] = sampleManualFirstExecutions) {
  return executions
    .filter((execution) => activeExecutionStatuses.includes(execution.status))
    .reduce((total, execution) => total + execution.estimated_value_brl, 0);
}

export function getAverageExecutionProgress(executions: ExecutionRecord[] = sampleManualFirstExecutions) {
  if (executions.length === 0) return 0;
  return Math.round(executions.reduce((total, execution) => total + execution.progress_percent, 0) / executions.length);
}

export function getExecutionSummary(executions: ExecutionRecord[] = sampleManualFirstExecutions): ExecutionSummary {
  return {
    active_executions: executions.filter((execution) => activeExecutionStatuses.includes(execution.status)).length,
    blocked_executions: getBlockedExecutions(executions).length,
    ready_for_review: executions.filter((execution) => execution.status === "REVIEW" || execution.proof_status === "READY_FOR_REVIEW").length,
    delivered_sample: executions.filter((execution) => execution.status === "DELIVERED" || execution.status === "VERIFIED").length,
    estimated_value_in_execution_brl: getActiveExecutionValue(executions),
    average_progress: getAverageExecutionProgress(executions),
    missing_proof_count: executions.filter((execution) => execution.proof_status === "MISSING").length,
  };
}
