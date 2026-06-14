import { scoreWeb3Task } from "./web3TaskScoring";
import { getWeb3TaskSourceById } from "./web3TaskSources";
import type { Web3TaskImportInput, Web3TaskPreview } from "./web3TaskTypes";

const previews: Web3TaskPreview[] = [];
const blockedActions = [
  "Connect wallet",
  "Sign message or blockchain transaction",
  "Submit task to an external platform",
  "Claim rewards or mark real money received",
  "Create accounts, bypass captcha, spam communities, or contact customers",
];

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function createWeb3TaskPreview(input: Web3TaskImportInput): Web3TaskPreview {
  if (!input.title?.trim()) throw new Error("WEB3_TASK_TITLE_REQUIRED");
  if (!input.url?.trim()) throw new Error("WEB3_TASK_URL_REQUIRED");
  const source = getWeb3TaskSourceById(input.sourceId);
  const category = input.category ?? source.supportedCategories[0] ?? "bounty";
  const scoring = scoreWeb3Task({ ...input, category });
  const now = new Date().toISOString();
  const preview: Web3TaskPreview = {
    id: `w3r_${Date.now().toString(36)}_${(previews.length + 1).toString(36)}`,
    mode: "PREVIEW_ONLY",
    source,
    title: input.title.trim(),
    url: input.url.trim(),
    category,
    rewardLabel: input.rewardLabel?.trim() || "Reward unclear - manual verification required",
    rewardType: input.rewardType ?? "UNKNOWN",
    estimatedRewardUsd: safeNumber(input.estimatedRewardUsd),
    estimatedRewardBrl: safeNumber(input.estimatedRewardBrl) ?? (safeNumber(input.estimatedRewardUsd) === null ? null : Math.round((safeNumber(input.estimatedRewardUsd) ?? 0) * 5)),
    deadlineLabel: input.deadlineLabel?.trim() || "Manual deadline verification required",
    difficulty: input.difficulty ?? "MEDIUM",
    payoutClarity: input.payoutClarity ?? (input.rewardLabel ? "PARTIAL" : "UNCLEAR"),
    ...scoring,
    recommendedNextManualAction: scoring.recommendedAction === "SKIP" ? "Skip or escalate for manual safety review; do not execute from GXEON." : "Open the source manually, verify rules, prepare evidence, then decide outside GXEON whether to proceed.",
    evidenceRequired: true,
    evidenceChecklist: input.evidenceChecklist?.length ? input.evidenceChecklist : ["Screenshot or link to task rules", "Draft deliverable or evidence artifact", "Manual proof that no wallet/signature/payment action is required", "Operator approval note"],
    blockedActions,
    manualExecutionRequired: true,
    walletConnectionRequired: false,
    externalSubmissionDisabled: true,
    rewardNotGuaranteed: true,
    operatorApprovalRequired: true,
    notes: input.notes?.trim() || "Preview-only internal radar entry.",
    createdAt: now,
    updatedAt: now,
  };
  previews.unshift(preview);
  return preview;
}

export function listWeb3TaskPreviews() {
  return previews;
}

export function getWeb3TaskPreviewById(id: string) {
  return previews.find((preview) => preview.id === id) ?? null;
}

export function clearWeb3TaskPreviewsForTests() {
  previews.splice(0, previews.length);
}
