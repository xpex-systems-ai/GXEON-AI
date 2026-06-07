export type TaskSource = "Workana" | "99Freelas" | "Upwork" | "Freelancer" | "LinkedIn" | "Community" | "Referral" | "Manual";
export type TaskCategory = "Proposal" | "Discovery" | "Landing Page" | "Dashboard" | "Automation" | "AI Workflow" | "CRM" | "Data Organization" | "Consulting" | "Delivery" | "Follow-up" | "Other";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskOwner = "Junior Sena" | "GXEON Operator" | "Codex" | "Copilot" | "Manual Review";
export type TaskStatus = "BACKLOG" | "TRIAGE" | "IN_PROGRESS" | "WAITING_CLIENT" | "REVIEW" | "DONE" | "ARCHIVED";

export type TaskQueueItem = {
  id: string;
  opportunity_id?: string;
  title: string;
  client_label: string;
  source: TaskSource;
  category: TaskCategory;
  estimated_value_brl: number;
  priority: TaskPriority;
  owner: TaskOwner;
  status: TaskStatus;
  progress_percent: number;
  due_label: string;
  next_action: string;
  evidence?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  data_mode: "sample_manual_first";
};

export type TaskQueueSummary = {
  open_tasks: number;
  critical_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  potential_value_brl: number;
  average_progress: number;
};

export const taskPipelineStatuses: TaskStatus[] = [
  "BACKLOG",
  "TRIAGE",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "REVIEW",
  "DONE",
  "ARCHIVED",
];

export const taskBoardStatuses: TaskStatus[] = ["BACKLOG", "TRIAGE", "IN_PROGRESS", "WAITING_CLIENT", "REVIEW", "DONE"];
export const activeTaskStatuses: TaskStatus[] = ["BACKLOG", "TRIAGE", "IN_PROGRESS", "WAITING_CLIENT", "REVIEW"];

export const sampleManualFirstTasks: TaskQueueItem[] = [
  {
    id: "TASK-P1-001",
    opportunity_id: "OPP-P0-003",
    title: "Draft milestone proposal for agency reporting dashboard",
    client_label: "Sample agency operations team",
    source: "Workana",
    category: "Proposal",
    estimated_value_brl: 9500,
    priority: "CRITICAL",
    owner: "Junior Sena",
    status: "IN_PROGRESS",
    progress_percent: 45,
    due_label: "Today · manual scope draft",
    next_action: "Write a milestone-based proposal and list evidence still required from the sample brief.",
    evidence: "References P0 opportunity OPP-P0-003; synthetic marketplace-style brief only.",
    notes: "No platform connection, scraping, or message automation is active.",
    created_at: "2026-06-05T12:00:00.000Z",
    updated_at: "2026-06-06T09:20:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-002",
    opportunity_id: "OPP-P0-001",
    title: "Create one-page landing page execution checklist",
    client_label: "Sample local clinic",
    source: "Referral",
    category: "Landing Page",
    estimated_value_brl: 4200,
    priority: "HIGH",
    owner: "GXEON Operator",
    status: "TRIAGE",
    progress_percent: 25,
    due_label: "Next 24h · checklist",
    next_action: "Confirm sample brand assets, sections, conversion goal, and approval path.",
    evidence: "References P0 opportunity OPP-P0-001; referral note contains no personal data.",
    created_at: "2026-06-05T13:30:00.000Z",
    updated_at: "2026-06-06T08:30:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-003",
    opportunity_id: "OPP-P0-006",
    title: "Map appointment reminder workflow before automation",
    client_label: "Sample local service business",
    source: "Manual",
    category: "Automation",
    estimated_value_brl: 5200,
    priority: "HIGH",
    owner: "Manual Review",
    status: "BACKLOG",
    progress_percent: 10,
    due_label: "This week · manual interview map",
    next_action: "Document current manual reminder steps without connecting calendar, CRM, or messaging APIs.",
    evidence: "References P0 opportunity OPP-P0-006; automation remains inactive.",
    created_at: "2026-06-05T14:00:00.000Z",
    updated_at: "2026-06-05T14:00:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-004",
    opportunity_id: "OPP-P0-002",
    title: "Prepare founder CRM discovery questions",
    client_label: "Sample founder pipeline",
    source: "LinkedIn",
    category: "Discovery",
    estimated_value_brl: 6800,
    priority: "HIGH",
    owner: "GXEON Operator",
    status: "WAITING_CLIENT",
    progress_percent: 55,
    due_label: "Waiting · sample answers",
    next_action: "Wait for manually provided pain points; do not fetch LinkedIn or CRM data.",
    evidence: "References P0 opportunity OPP-P0-002; sample operator note only.",
    created_at: "2026-06-04T16:15:00.000Z",
    updated_at: "2026-06-06T10:10:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-005",
    opportunity_id: "OPP-P0-007",
    title: "Define safe AI workflow discovery boundaries",
    client_label: "Sample startup team",
    source: "Upwork",
    category: "AI Workflow",
    estimated_value_brl: 7800,
    priority: "HIGH",
    owner: "Codex",
    status: "REVIEW",
    progress_percent: 70,
    due_label: "Review · boundary note",
    next_action: "Review safe language that avoids promising live automation or integrations.",
    evidence: "References P0 opportunity OPP-P0-007; synthetic external-platform lead.",
    created_at: "2026-06-05T09:45:00.000Z",
    updated_at: "2026-06-06T11:05:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-006",
    opportunity_id: "OPP-P0-004",
    title: "Classify inventory spreadsheet cleanup complexity",
    client_label: "Sample retailer operations",
    source: "99Freelas",
    category: "Data Organization",
    estimated_value_brl: 2800,
    priority: "MEDIUM",
    owner: "Manual Review",
    status: "TRIAGE",
    progress_percent: 30,
    due_label: "Next 48h · anonymized columns",
    next_action: "Request anonymized column headings and define cleanup acceptance criteria.",
    evidence: "References P0 opportunity OPP-P0-004; static sample record only.",
    created_at: "2026-06-05T10:20:00.000Z",
    updated_at: "2026-06-06T07:40:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-007",
    opportunity_id: "OPP-P0-005",
    title: "Build creator funnel intake checklist",
    client_label: "Sample creator offer",
    source: "Community",
    category: "Follow-up",
    estimated_value_brl: 3600,
    priority: "MEDIUM",
    owner: "Copilot",
    status: "BACKLOG",
    progress_percent: 15,
    due_label: "This week · intake draft",
    next_action: "Draft manual checklist for audience, offer, references, and success metric.",
    evidence: "References P0 opportunity OPP-P0-005; community sample scenario.",
    created_at: "2026-06-05T10:35:00.000Z",
    updated_at: "2026-06-05T10:35:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-008",
    opportunity_id: "OPP-P0-008",
    title: "Outline sales page audit deliverable",
    client_label: "Sample small business",
    source: "Freelancer",
    category: "Consulting",
    estimated_value_brl: 2400,
    priority: "MEDIUM",
    owner: "Junior Sena",
    status: "IN_PROGRESS",
    progress_percent: 50,
    due_label: "Today · audit outline",
    next_action: "Write a manual audit structure with evidence request and no scraping dependency.",
    evidence: "References P0 opportunity OPP-P0-008; internally written sample brief.",
    created_at: "2026-06-05T11:05:00.000Z",
    updated_at: "2026-06-06T12:00:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-009",
    opportunity_id: "OPP-P0-010",
    title: "Archive closed sample consulting validation state",
    client_label: "Sample closed-state record",
    source: "Manual",
    category: "Other",
    estimated_value_brl: 900,
    priority: "LOW",
    owner: "Manual Review",
    status: "DONE",
    progress_percent: 100,
    due_label: "Done · UI state only",
    next_action: "Keep as sample-only closed state; do not claim real revenue or payment.",
    evidence: "References P0 opportunity OPP-P0-010; no real payment or customer work.",
    created_at: "2026-06-01T17:10:00.000Z",
    updated_at: "2026-06-05T17:10:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-010",
    opportunity_id: "OPP-P0-009",
    title: "Hold founder KPI dashboard until budget evidence appears",
    client_label: "Sample founder KPI board",
    source: "Referral",
    category: "Dashboard",
    estimated_value_brl: 6100,
    priority: "LOW",
    owner: "GXEON Operator",
    status: "ARCHIVED",
    progress_percent: 5,
    due_label: "Archived · budget unconfirmed",
    next_action: "Reopen manually only if budget and sample metrics are confirmed.",
    evidence: "References P0 opportunity OPP-P0-009; inactive status excluded from open value.",
    created_at: "2026-06-02T10:25:00.000Z",
    updated_at: "2026-06-05T08:00:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-011",
    title: "Create manual proposal template for dashboard work",
    client_label: "Sample reusable GXEON template",
    source: "Manual",
    category: "Proposal",
    estimated_value_brl: 0,
    priority: "MEDIUM",
    owner: "Codex",
    status: "REVIEW",
    progress_percent: 80,
    due_label: "Review · internal template",
    next_action: "Verify the proposal template labels every example as sample/manual-first.",
    evidence: "Internal enablement task with zero external calls and zero claimed revenue.",
    created_at: "2026-06-05T15:25:00.000Z",
    updated_at: "2026-06-06T13:15:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-012",
    title: "Prepare CRM cleanup delivery checklist",
    client_label: "Sample CRM delivery runbook",
    source: "Manual",
    category: "CRM",
    estimated_value_brl: 0,
    priority: "MEDIUM",
    owner: "Copilot",
    status: "BACKLOG",
    progress_percent: 20,
    due_label: "This week · internal runbook",
    next_action: "Draft checklist for consented exports, field mapping, review, and delivery acceptance.",
    evidence: "Internal manual-first checklist; no database, CRM, or external service access.",
    created_at: "2026-06-05T15:35:00.000Z",
    updated_at: "2026-06-05T15:35:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-013",
    title: "Validate task queue board copy for no-live-API boundary",
    client_label: "GXEON operator console",
    source: "Manual",
    category: "Delivery",
    estimated_value_brl: 0,
    priority: "CRITICAL",
    owner: "Manual Review",
    status: "IN_PROGRESS",
    progress_percent: 60,
    due_label: "Today · safety copy",
    next_action: "Confirm every task card says sample/manual-first and does not imply live customer work.",
    evidence: "Internal safety validation task for Revenue Engine P1.",
    created_at: "2026-06-06T08:00:00.000Z",
    updated_at: "2026-06-06T13:45:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "TASK-P1-014",
    title: "Draft Execution Tracking P2 handoff criteria",
    client_label: "GXEON roadmap sample",
    source: "Manual",
    category: "Other",
    estimated_value_brl: 0,
    priority: "LOW",
    owner: "GXEON Operator",
    status: "DONE",
    progress_percent: 100,
    due_label: "Done · roadmap note",
    next_action: "Use criteria only after P1 validates task visibility and manual ownership.",
    evidence: "Internal roadmap placeholder; no automation or persistence is active.",
    created_at: "2026-06-04T08:45:00.000Z",
    updated_at: "2026-06-05T16:00:00.000Z",
    data_mode: "sample_manual_first",
  },
];

export function getTaskStatusCounts(tasks: TaskQueueItem[] = sampleManualFirstTasks) {
  return taskPipelineStatuses.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
    estimatedValueBrl: tasks
      .filter((task) => task.status === status)
      .reduce((total, task) => total + task.estimated_value_brl, 0),
  }));
}

export function getTasksByStatus(status: TaskStatus, tasks: TaskQueueItem[] = sampleManualFirstTasks) {
  return tasks.filter((task) => task.status === status);
}

export function getActiveTaskValue(tasks: TaskQueueItem[] = sampleManualFirstTasks) {
  return tasks
    .filter((task) => activeTaskStatuses.includes(task.status))
    .reduce((total, task) => total + task.estimated_value_brl, 0);
}

export function getCriticalTasks(tasks: TaskQueueItem[] = sampleManualFirstTasks) {
  return tasks.filter((task) => task.priority === "CRITICAL" && task.status !== "DONE" && task.status !== "ARCHIVED");
}

export function getAverageTaskProgress(tasks: TaskQueueItem[] = sampleManualFirstTasks) {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((total, task) => total + task.progress_percent, 0) / tasks.length);
}

export function getTaskQueueSummary(tasks: TaskQueueItem[] = sampleManualFirstTasks): TaskQueueSummary {
  return {
    open_tasks: tasks.filter((task) => activeTaskStatuses.includes(task.status)).length,
    critical_tasks: getCriticalTasks(tasks).length,
    in_progress_tasks: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    done_tasks: tasks.filter((task) => task.status === "DONE").length,
    potential_value_brl: getActiveTaskValue(tasks),
    average_progress: getAverageTaskProgress(tasks),
  };
}
