export type LedgerMode = "PREVIEW_ONLY";

export type LedgerStatus = "FORECAST" | "APPROVED_MANUAL" | "PENDING_PAYMENT_REVIEW" | "LOST" | "CANCELLED" | "ARCHIVED";
export type LedgerRevenueClass = "EXPECTED_REVENUE" | "APPROVED_REVENUE" | "PENDING_REVENUE" | "LOST_REVENUE";

export type LedgerSafetyBoundary = {
  mode: LedgerMode;
  paymentDisabled: true;
  invoiceDisabled: true;
  receiptDisabled: true;
  realRevenueClaimed: false;
  databaseWriteDisabled: true;
  approvalRequired: true;
  externalContact: false;
  githubWrites: false;
  paymentAction: false;
  autonomousExecution: false;
};

export type LedgerTrace = {
  opportunity_id: string;
  task_id: string;
  execution_id: string;
  validation_id: string;
  release_id: string;
  ledger_id: string;
};

export type LedgerCreateInput = {
  title?: string;
  clientLabel?: string;
  opportunityId?: string;
  opportunity_id?: string;
  taskId?: string | null;
  task_id?: string | null;
  executionPreviewId?: string;
  execution_id?: string;
  validationPreviewId?: string;
  validation_id?: string;
  releasePreviewId?: string;
  release_id?: string;
  id?: string;
  estimatedRevenueBrl?: number;
  estimated_revenue_brl?: number;
  readinessScore?: number;
  readiness_score?: number;
  releaseStatus?: string;
  release_status?: string;
  financialReadinessState?: string;
  financial_readiness_state?: string;
  manualNotes?: string;
  nextManualAction?: string;
  next_manual_action?: string;
};

export type LedgerStateUpdateInput = {
  status?: LedgerStatus;
  manualNotes?: string;
  next_manual_action?: string;
  nextManualAction?: string;
};

export type LedgerPreviewRecord = LedgerSafetyBoundary & {
  id: string;
  releasePreviewId: string;
  validationPreviewId: string;
  executionPreviewId: string;
  taskId: string;
  opportunityId: string;
  release_id: string;
  validation_id: string;
  execution_id: string;
  task_id: string;
  opportunity_id: string;
  title: string;
  client_label: string;
  status: LedgerStatus;
  revenue_class: LedgerRevenueClass;
  expected_revenue_brl: number;
  approved_revenue_brl: number;
  pending_revenue_brl: number;
  received_revenue_brl: 0;
  lost_revenue_brl: number;
  conversion_probability: number;
  accounting_readiness_score: number;
  release_readiness_score: number;
  ledger_summary: string;
  accounting_note: string;
  next_manual_action: string;
  trace: LedgerTrace;
  full_trace_label: string;
  manualNotes: string;
  createdAt: string;
  updatedAt: string;
  created_at: string;
  updated_at: string;
};

export type LedgerStatusSummary = LedgerSafetyBoundary & {
  status: "LEDGER_P0_READY";
  recordsInMemory: number;
  total_records: number;
  estimated_revenue_brl: number;
  approved_revenue_brl: number;
  pending_revenue_brl: number;
  received_revenue_brl: 0;
  lost_revenue_brl: number;
  active_pipeline_brl: number;
  approval_conversion_rate: number;
  receipt_conversion_rate: 0;
  loss_rate: number;
  average_accounting_readiness: number;
  allowedStatuses: LedgerStatus[];
  allowedRevenueClasses: LedgerRevenueClass[];
  boundaries: string[];
};
