export type Web3TaskRadarMode = "PREVIEW_ONLY";

export type Web3TaskCategory = "bounty" | "quest" | "content" | "dev" | "audit" | "community" | "airdrop" | "grant" | "hackathon";
export type Web3TaskDifficulty = "LOW" | "MEDIUM" | "HIGH";
export type Web3TaskPayoutClarity = "CLEAR" | "PARTIAL" | "UNCLEAR" | "LOTTERY_ONLY";
export type Web3TaskRewardType = "USD" | "USDC" | "TOKEN" | "POINTS" | "GRANT" | "UNKNOWN";
export type Web3TaskRecommendedAction = "SKIP" | "REVIEW_MANUALLY" | "PREPARE_SUBMISSION" | "CREATE_TASK_PREVIEW";

export type Web3TaskRiskFlag =
  | "WALLET_CONNECTION_REQUIRED"
  | "UNKNOWN_SIGNATURE_REQUEST"
  | "SEED_PHRASE_RISK"
  | "UPFRONT_FEE_REQUIRED"
  | "KYC_REQUIRED"
  | "UNCLEAR_REWARD"
  | "LOTTERY_ONLY"
  | "UNKNOWN_TOKEN"
  | "SPAM_BEHAVIOR"
  | "MULTI_ACCOUNT_RISK"
  | "LONG_HACKATHON"
  | "GRANT_NOT_URGENT";

export type Web3TaskSourceId = "superteam_earn" | "zealy" | "galxe" | "layer3" | "gitcoin" | "manual_import";

export type Web3TaskSource = {
  id: Web3TaskSourceId;
  label: string;
  baseUrl: string;
  supportedCategories: Web3TaskCategory[];
  payoutNotes: string;
  riskNotes: string[];
  manualOnly: true;
};

export type Web3TaskImportInput = {
  title?: string;
  url?: string;
  sourceId?: Web3TaskSourceId;
  category?: Web3TaskCategory;
  rewardLabel?: string;
  rewardType?: Web3TaskRewardType;
  estimatedRewardUsd?: number;
  estimatedRewardBrl?: number;
  deadlineLabel?: string;
  difficulty?: Web3TaskDifficulty;
  payoutClarity?: Web3TaskPayoutClarity;
  notes?: string;
  evidenceChecklist?: string[];
};

export type Web3TaskPreview = {
  id: string;
  mode: Web3TaskRadarMode;
  source: Web3TaskSource;
  title: string;
  url: string;
  category: Web3TaskCategory;
  rewardLabel: string;
  rewardType: Web3TaskRewardType;
  estimatedRewardUsd: number | null;
  estimatedRewardBrl: number | null;
  deadlineLabel: string;
  difficulty: Web3TaskDifficulty;
  payoutClarity: Web3TaskPayoutClarity;
  riskScore: number;
  opportunityScore: number;
  recommendedAction: Web3TaskRecommendedAction;
  recommendedNextManualAction: string;
  evidenceRequired: true;
  evidenceChecklist: string[];
  blockedActions: string[];
  riskFlags: Web3TaskRiskFlag[];
  manualExecutionRequired: true;
  walletConnectionRequired: false;
  externalSubmissionDisabled: true;
  rewardNotGuaranteed: true;
  operatorApprovalRequired: true;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Web3TaskRadarStatus = {
  mode: Web3TaskRadarMode;
  status: "WEB3_TASK_RADAR_P0_PREVIEW_READY";
  manualFirst: true;
  walletConnectionRequired: false;
  externalSubmissionDisabled: true;
  rewardNotGuaranteed: true;
  operatorApprovalRequired: true;
  persistence: "IN_MEMORY_ONLY";
  sourceCount: number;
  previewCount: number;
  boundaries: string[];
};
