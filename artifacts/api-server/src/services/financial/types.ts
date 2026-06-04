export type ServiceLimitOptions = {
  limit?: number;
};

export type FinancialMetrics = {
  databaseLatencyMs: number | null;
  databaseLatencySamplesMs: number[];
  totalWallets: number;
  totalTransactions: number;
  totalLedgerEntries: number;
  healthScore: number;
};

export type FinancialHealth = {
  status: "healthy" | "degraded";
  databaseConfigured: boolean;
  databaseReachable: boolean;
  checkedAt: string;
  metrics: FinancialMetrics;
  risks: string[];
};
