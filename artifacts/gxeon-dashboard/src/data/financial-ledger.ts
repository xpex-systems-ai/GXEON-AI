export type LedgerStatus = "FORECAST" | "APPROVED" | "PENDING_PAYMENT" | "RECEIVED_SAMPLE" | "LOST" | "ARCHIVED";
export type LedgerRevenueClass = "EXPECTED_REVENUE" | "APPROVED_REVENUE" | "PENDING_REVENUE" | "RECEIVED_REVENUE" | "LOST_REVENUE";

export type LedgerTrace = {
  opportunity_id: string;
  task_id: string;
  execution_id: string;
  validation_id: string;
  release_id: string;
  ledger_id: string;
};

export type FinancialLedgerRecord = {
  id: string;
  release_id: string;
  opportunity_id: string;
  task_id: string;
  execution_id: string;
  validation_id: string;
  title: string;
  client_label: string;
  status: LedgerStatus;
  revenue_class: LedgerRevenueClass;
  expected_revenue_brl: number;
  approved_revenue_brl: number;
  pending_revenue_brl: number;
  received_revenue_brl: number;
  lost_revenue_brl: number;
  conversion_probability: number;
  accounting_readiness_score: number;
  release_readiness_score: number;
  ledger_summary: string;
  accounting_note: string;
  next_manual_action: string;
  trace: LedgerTrace;
  full_trace_label: string;
  created_at: string;
  updated_at: string;
  data_mode: "sample_manual_first";
  safe_preview: true;
};

export type LedgerSummary = {
  total_records: number;
  estimated_revenue_brl: number;
  approved_revenue_brl: number;
  pending_revenue_brl: number;
  received_revenue_brl: number;
  lost_revenue_brl: number;
  active_pipeline_brl: number;
  approval_conversion_rate: number;
  receipt_conversion_rate: number;
  loss_rate: number;
  average_accounting_readiness: number;
};

export const ledgerStatuses: LedgerStatus[] = ["FORECAST", "APPROVED", "PENDING_PAYMENT", "RECEIVED_SAMPLE", "LOST", "ARCHIVED"];

export const sampleFinancialLedgerRecords: FinancialLedgerRecord[] = [
  {
    id: "LED-P5-001",
    release_id: "REL-P4-001",
    opportunity_id: "OPP-P0-007",
    task_id: "TASK-P1-005",
    execution_id: "EXEC-P2-005",
    validation_id: "VAL-P3-003",
    title: "Safe AI workflow boundary release packet",
    client_label: "Sample startup team",
    status: "APPROVED",
    revenue_class: "APPROVED_REVENUE",
    expected_revenue_brl: 7800,
    approved_revenue_brl: 7800,
    pending_revenue_brl: 0,
    received_revenue_brl: 0,
    lost_revenue_brl: 0,
    conversion_probability: 82,
    accounting_readiness_score: 91,
    release_readiness_score: 94,
    ledger_summary: "P4 release is manually approved and ready for a human-led commercial follow-up.",
    accounting_note: "No invoice, receipt, payment link, gateway event, transaction, or database write exists in GXEON OS.",
    next_manual_action: "Operator confirms billing terms outside GXEON, then records any result manually in the future P6 persistence plan.",
    trace: {
      opportunity_id: "OPP-P0-007",
      task_id: "TASK-P1-005",
      execution_id: "EXEC-P2-005",
      validation_id: "VAL-P3-003",
      release_id: "REL-P4-001",
      ledger_id: "LED-P5-001",
    },
    full_trace_label: "OPP-P0-007 → TASK-P1-005 → EXEC-P2-005 → VAL-P3-003 → REL-P4-001 → LED-P5-001",
    created_at: "2026-06-07T13:00:00.000Z",
    updated_at: "2026-06-07T13:20:00.000Z",
    data_mode: "sample_manual_first",
    safe_preview: true,
  },
  {
    id: "LED-P5-002",
    release_id: "REL-P4-002",
    opportunity_id: "OPP-P0-003",
    task_id: "TASK-P1-001",
    execution_id: "EXEC-P2-001",
    validation_id: "VAL-P3-001",
    title: "Agency reporting dashboard milestone review",
    client_label: "Sample agency operations team",
    status: "FORECAST",
    revenue_class: "EXPECTED_REVENUE",
    expected_revenue_brl: 9500,
    approved_revenue_brl: 0,
    pending_revenue_brl: 0,
    received_revenue_brl: 0,
    lost_revenue_brl: 0,
    conversion_probability: 43,
    accounting_readiness_score: 54,
    release_readiness_score: 58,
    ledger_summary: "Forecast-only record held until evidence completion and P4 release approval are manually reviewed.",
    accounting_note: "Expected value is visible for planning only and is not a receivable, invoice, or collectible balance.",
    next_manual_action: "Complete P3 evidence review, update P4 readiness, then decide whether to move this ledger card to APPROVED.",
    trace: {
      opportunity_id: "OPP-P0-003",
      task_id: "TASK-P1-001",
      execution_id: "EXEC-P2-001",
      validation_id: "VAL-P3-001",
      release_id: "REL-P4-002",
      ledger_id: "LED-P5-002",
    },
    full_trace_label: "OPP-P0-003 → TASK-P1-001 → EXEC-P2-001 → VAL-P3-001 → REL-P4-002 → LED-P5-002",
    created_at: "2026-06-07T13:04:00.000Z",
    updated_at: "2026-06-07T13:18:00.000Z",
    data_mode: "sample_manual_first",
    safe_preview: true,
  },
  {
    id: "LED-P5-003",
    release_id: "REL-P4-004",
    opportunity_id: "OPP-P0-004",
    task_id: "TASK-P1-003",
    execution_id: "EXEC-P2-003",
    validation_id: "VAL-P3-004",
    title: "Founder revenue ops advisory handoff",
    client_label: "Sample founder office",
    status: "PENDING_PAYMENT",
    revenue_class: "PENDING_REVENUE",
    expected_revenue_brl: 12400,
    approved_revenue_brl: 12400,
    pending_revenue_brl: 12400,
    received_revenue_brl: 0,
    lost_revenue_brl: 0,
    conversion_probability: 76,
    accounting_readiness_score: 86,
    release_readiness_score: 88,
    ledger_summary: "Approved release value is waiting on a manual external payment confirmation sample.",
    accounting_note: "Pending label is an operator forecast. GXEON OS does not poll gateways or create receivables.",
    next_manual_action: "Human reviewer checks external payment status and keeps proof outside the product until P6 storage mapping is approved.",
    trace: {
      opportunity_id: "OPP-P0-004",
      task_id: "TASK-P1-003",
      execution_id: "EXEC-P2-003",
      validation_id: "VAL-P3-004",
      release_id: "REL-P4-004",
      ledger_id: "LED-P5-003",
    },
    full_trace_label: "OPP-P0-004 → TASK-P1-003 → EXEC-P2-003 → VAL-P3-004 → REL-P4-004 → LED-P5-003",
    created_at: "2026-06-07T13:08:00.000Z",
    updated_at: "2026-06-07T13:15:00.000Z",
    data_mode: "sample_manual_first",
    safe_preview: true,
  },
  {
    id: "LED-P5-004",
    release_id: "REL-P4-005",
    opportunity_id: "OPP-P0-011",
    task_id: "TASK-P1-007",
    execution_id: "EXEC-P2-007",
    validation_id: "VAL-P3-006",
    title: "Manual automation audit sample settlement",
    client_label: "Sample ecommerce operator",
    status: "RECEIVED_SAMPLE",
    revenue_class: "RECEIVED_REVENUE",
    expected_revenue_brl: 4200,
    approved_revenue_brl: 4200,
    pending_revenue_brl: 0,
    received_revenue_brl: 4200,
    lost_revenue_brl: 0,
    conversion_probability: 100,
    accounting_readiness_score: 95,
    release_readiness_score: 96,
    ledger_summary: "Sample received state demonstrates accounting visibility after a manual confirmation label.",
    accounting_note: "Received sample is a visual lifecycle state only; no transaction ID, money movement, or invoice was created.",
    next_manual_action: "Use this as an accounting-readiness example for reconciliation fields in P6, not as proof of cash received.",
    trace: {
      opportunity_id: "OPP-P0-011",
      task_id: "TASK-P1-007",
      execution_id: "EXEC-P2-007",
      validation_id: "VAL-P3-006",
      release_id: "REL-P4-005",
      ledger_id: "LED-P5-004",
    },
    full_trace_label: "OPP-P0-011 → TASK-P1-007 → EXEC-P2-007 → VAL-P3-006 → REL-P4-005 → LED-P5-004",
    created_at: "2026-06-07T13:10:00.000Z",
    updated_at: "2026-06-07T13:14:00.000Z",
    data_mode: "sample_manual_first",
    safe_preview: true,
  },
  {
    id: "LED-P5-005",
    release_id: "REL-P4-003",
    opportunity_id: "OPP-P0-001",
    task_id: "TASK-P1-002",
    execution_id: "EXEC-P2-002",
    validation_id: "VAL-P3-002",
    title: "Landing page checklist release block",
    client_label: "Sample local clinic",
    status: "LOST",
    revenue_class: "LOST_REVENUE",
    expected_revenue_brl: 3600,
    approved_revenue_brl: 0,
    pending_revenue_brl: 0,
    received_revenue_brl: 0,
    lost_revenue_brl: 3600,
    conversion_probability: 0,
    accounting_readiness_score: 22,
    release_readiness_score: 31,
    ledger_summary: "Blocked release is modeled as lost sample revenue so operators can see leakage without financial side effects.",
    accounting_note: "Lost revenue is an internal planning label and does not issue credit notes, refunds, or accounting entries.",
    next_manual_action: "Archive or reopen after scope clarification; do not initiate payment or invoice flows from GXEON OS.",
    trace: {
      opportunity_id: "OPP-P0-001",
      task_id: "TASK-P1-002",
      execution_id: "EXEC-P2-002",
      validation_id: "VAL-P3-002",
      release_id: "REL-P4-003",
      ledger_id: "LED-P5-005",
    },
    full_trace_label: "OPP-P0-001 → TASK-P1-002 → EXEC-P2-002 → VAL-P3-002 → REL-P4-003 → LED-P5-005",
    created_at: "2026-06-07T13:12:00.000Z",
    updated_at: "2026-06-07T13:12:00.000Z",
    data_mode: "sample_manual_first",
    safe_preview: true,
  },
  {
    id: "LED-P5-006",
    release_id: "REL-P4-000",
    opportunity_id: "OPP-P0-000",
    task_id: "TASK-P1-000",
    execution_id: "EXEC-P2-000",
    validation_id: "VAL-P3-000",
    title: "Archived legacy sample revenue note",
    client_label: "Internal GXEON sample archive",
    status: "ARCHIVED",
    revenue_class: "EXPECTED_REVENUE",
    expected_revenue_brl: 1800,
    approved_revenue_brl: 0,
    pending_revenue_brl: 0,
    received_revenue_brl: 0,
    lost_revenue_brl: 0,
    conversion_probability: 0,
    accounting_readiness_score: 10,
    release_readiness_score: 10,
    ledger_summary: "Archived sample retained to test board behavior without affecting active ledger metrics.",
    accounting_note: "Archive has no accounting impact and is excluded from active conversion interpretation.",
    next_manual_action: "Keep as visual-only history until P6 defines immutable archive policies.",
    trace: {
      opportunity_id: "OPP-P0-000",
      task_id: "TASK-P1-000",
      execution_id: "EXEC-P2-000",
      validation_id: "VAL-P3-000",
      release_id: "REL-P4-000",
      ledger_id: "LED-P5-006",
    },
    full_trace_label: "OPP-P0-000 → TASK-P1-000 → EXEC-P2-000 → VAL-P3-000 → REL-P4-000 → LED-P5-006",
    created_at: "2026-06-07T13:16:00.000Z",
    updated_at: "2026-06-07T13:16:00.000Z",
    data_mode: "sample_manual_first",
    safe_preview: true,
  },
];

export function getLedgerRecordsByStatus(status: LedgerStatus): FinancialLedgerRecord[] {
  return sampleFinancialLedgerRecords.filter((record) => record.status === status);
}

export function getLedgerStatusCounts(): { status: LedgerStatus; count: number }[] {
  return ledgerStatuses.map((status) => ({ status, count: getLedgerRecordsByStatus(status).length }));
}

export function getFinancialLedgerSummary(): LedgerSummary {
  const activeRecords = sampleFinancialLedgerRecords.filter((record) => record.status !== "ARCHIVED");
  const total = (field: keyof Pick<FinancialLedgerRecord, "expected_revenue_brl" | "approved_revenue_brl" | "pending_revenue_brl" | "received_revenue_brl" | "lost_revenue_brl">) =>
    activeRecords.reduce((sum, record) => sum + record[field], 0);
  const estimated = total("expected_revenue_brl");
  const approved = total("approved_revenue_brl");
  const pending = total("pending_revenue_brl");
  const received = total("received_revenue_brl");
  const lost = total("lost_revenue_brl");

  return {
    total_records: sampleFinancialLedgerRecords.length,
    estimated_revenue_brl: estimated,
    approved_revenue_brl: approved,
    pending_revenue_brl: pending,
    received_revenue_brl: received,
    lost_revenue_brl: lost,
    active_pipeline_brl: approved + pending,
    approval_conversion_rate: estimated === 0 ? 0 : Math.round((approved / estimated) * 100),
    receipt_conversion_rate: approved === 0 ? 0 : Math.round((received / approved) * 100),
    loss_rate: estimated === 0 ? 0 : Math.round((lost / estimated) * 100),
    average_accounting_readiness: activeRecords.length === 0 ? 0 : Math.round(activeRecords.reduce((sum, record) => sum + record.accounting_readiness_score, 0) / activeRecords.length),
  };
}
