export type LedgerStatus = "FORECAST" | "APPROVED" | "PENDING_PAYMENT" | "RECEIVED_REAL" | "LOST" | "ARCHIVED";
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
  data_mode: "real";
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

export const ledgerStatuses: LedgerStatus[] = ["FORECAST", "APPROVED", "PENDING_PAYMENT", "RECEIVED_REAL", "LOST", "ARCHIVED"];

export const realFinancialLedgerRecords: FinancialLedgerRecord[] = [];

export const activeOperationalLedgerRecords: FinancialLedgerRecord[] = [];

export function getLedgerRecordsByStatus(status: LedgerStatus, records: FinancialLedgerRecord[] = activeOperationalLedgerRecords): FinancialLedgerRecord[] {
  return records.filter((record) => record.status === status);
}

export function getLedgerStatusCounts(records: FinancialLedgerRecord[] = activeOperationalLedgerRecords): { status: LedgerStatus; count: number }[] {
  return ledgerStatuses.map((status) => ({ status, count: getLedgerRecordsByStatus(status, records).length }));
}

export function getFinancialLedgerSummary(records: FinancialLedgerRecord[] = activeOperationalLedgerRecords): LedgerSummary {
  const activeRecords = records.filter((record) => record.status !== "ARCHIVED");
  const total = (field: keyof Pick<FinancialLedgerRecord, "expected_revenue_brl" | "approved_revenue_brl" | "pending_revenue_brl" | "received_revenue_brl" | "lost_revenue_brl">) =>
    activeRecords.reduce((sum, record) => sum + record[field], 0);
  const estimated = total("expected_revenue_brl");
  const approved = total("approved_revenue_brl");
  const pending = total("pending_revenue_brl");
  const received = total("received_revenue_brl");
  const lost = total("lost_revenue_brl");

  return {
    total_records: records.length,
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
