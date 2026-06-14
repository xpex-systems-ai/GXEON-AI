import type { Web3TaskImportInput, Web3TaskRecommendedAction, Web3TaskRiskFlag } from "./web3TaskTypes";

const flagRules: Array<[Web3TaskRiskFlag, RegExp]> = [
  ["SEED_PHRASE_RISK", /seed phrase|recovery phrase|mnemonic/i],
  ["UNKNOWN_SIGNATURE_REQUEST", /sign(ature| message)|permit/i],
  ["WALLET_CONNECTION_REQUIRED", /connect wallet|wallet required|link wallet|onchain/i],
  ["UPFRONT_FEE_REQUIRED", /upfront fee|pay to|deposit|gas fee required/i],
  ["KYC_REQUIRED", /kyc|passport|identity verification/i],
  ["LOTTERY_ONLY", /lottery|raffle|chance to win|random winner/i],
  ["UNKNOWN_TOKEN", /unknown token|new token|unlisted token|points only/i],
  ["SPAM_BEHAVIOR", /spam|mass dm|raid|shill|bulk comment/i],
  ["MULTI_ACCOUNT_RISK", /multi.?account|multiple accounts|farm accounts/i],
];

export function scoreWeb3Task(input: Web3TaskImportInput) {
  const text = `${input.title ?? ""} ${input.rewardLabel ?? ""} ${input.deadlineLabel ?? ""} ${input.notes ?? ""}`;
  const riskFlags = new Set<Web3TaskRiskFlag>();
  for (const [flag, pattern] of flagRules) if (pattern.test(text)) riskFlags.add(flag);
  if (!input.rewardLabel || input.payoutClarity === "UNCLEAR") riskFlags.add("UNCLEAR_REWARD");
  if (input.payoutClarity === "LOTTERY_ONLY") riskFlags.add("LOTTERY_ONLY");
  if (input.category === "hackathon" && !/urgent|today|24h|48h|short/i.test(input.deadlineLabel ?? "")) riskFlags.add("LONG_HACKATHON");
  if (input.category === "grant" && !/urgent|today|24h|48h/i.test(input.deadlineLabel ?? "")) riskFlags.add("GRANT_NOT_URGENT");

  let riskScore = riskFlags.size * 12;
  if (["grant", "hackathon", "airdrop"].includes(input.category ?? "")) riskScore += 8;
  if (input.difficulty === "HIGH") riskScore += 10;
  riskScore = Math.max(0, Math.min(100, riskScore));

  let opportunityScore = 50;
  if ((input.estimatedRewardUsd ?? 0) >= 20 || (input.estimatedRewardBrl ?? 0) >= 100) opportunityScore += 16;
  if (/urgent|today|24h|48h|short/i.test(input.deadlineLabel ?? "")) opportunityScore += 12;
  if (["CLEAR", undefined].includes(input.payoutClarity)) opportunityScore += 12;
  if (input.difficulty === "LOW") opportunityScore += 10;
  if (input.category && ["bounty", "content", "dev", "audit"].includes(input.category)) opportunityScore += 8;
  opportunityScore -= Math.round(riskScore * 0.75);
  opportunityScore = Math.max(0, Math.min(100, opportunityScore));

  let recommendedAction: Web3TaskRecommendedAction = "REVIEW_MANUALLY";
  if (riskScore >= 60 || riskFlags.has("SEED_PHRASE_RISK") || riskFlags.has("UPFRONT_FEE_REQUIRED")) recommendedAction = "SKIP";
  else if (opportunityScore >= 75) recommendedAction = "CREATE_TASK_PREVIEW";
  else if (opportunityScore >= 55) recommendedAction = "PREPARE_SUBMISSION";

  return { riskFlags: Array.from(riskFlags), riskScore, opportunityScore, recommendedAction };
}
