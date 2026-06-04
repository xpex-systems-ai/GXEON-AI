export type ServiceLimitOptions = {
  limit?: number;
};

export type FinancialMetrics = {
  databaseLatencyMs: number | null;
  totalWallets: number;
  totalTransactions: number;
  totalLedgerEntries: number;
};

export type FinancialHealth = {
  status: "ok" | "degraded";
  databaseConfigured: boolean;
  databaseReachable: boolean;
  checkedAt: string;
  metrics: FinancialMetrics;
  risks: string[];
};
