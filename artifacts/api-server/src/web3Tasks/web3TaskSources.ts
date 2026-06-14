import type { Web3TaskSource, Web3TaskSourceId } from "./web3TaskTypes";

export const web3TaskSources: Web3TaskSource[] = [
  { id: "superteam_earn", label: "Superteam Earn", baseUrl: "https://earn.superteam.fun/", supportedCategories: ["bounty", "content", "dev", "community"], payoutNotes: "Often useful for bounties and freelance-style tasks; payout is never guaranteed by GXEON.", riskNotes: ["Operator must verify rules manually", "No external submission from GXEON runtime"], manualOnly: true },
  { id: "zealy", label: "Zealy", baseUrl: "https://zealy.io/", supportedCategories: ["quest", "community", "content"], payoutNotes: "Campaign rewards may be points, token-related, or discretionary.", riskNotes: ["Avoid spam behavior", "Skip wallet/signature/KYC-heavy tasks in P0"], manualOnly: true },
  { id: "galxe", label: "Galxe", baseUrl: "https://galxe.com/", supportedCategories: ["quest", "airdrop", "community"], payoutNotes: "Credential and campaign rewards may be unclear or lottery-like.", riskNotes: ["Wallet-related requirements must be handled outside GXEON", "Do not sign messages from runtime"], manualOnly: true },
  { id: "layer3", label: "Layer3", baseUrl: "https://layer3.xyz/", supportedCategories: ["quest", "airdrop", "community"], payoutNotes: "Learning and campaign rewards are not guaranteed.", riskNotes: ["Onchain actions are blocked in P0", "Operator manual review required"], manualOnly: true },
  { id: "gitcoin", label: "Gitcoin", baseUrl: "https://gitcoin.co/", supportedCategories: ["grant", "hackathon", "dev"], payoutNotes: "Funding and grants are longer-horizon and review-dependent.", riskNotes: ["Grant timelines may be non-urgent", "No account creation or submission automation"], manualOnly: true },
  { id: "manual_import", label: "Manual Import", baseUrl: "", supportedCategories: ["bounty", "quest", "content", "dev", "audit", "community", "airdrop", "grant", "hackathon"], payoutNotes: "Operator-pasted opportunity; GXEON stores only an internal preview.", riskNotes: ["Verify source legitimacy manually", "Never paste secrets or wallet credentials"], manualOnly: true },
];

export function getWeb3TaskSourceById(id?: Web3TaskSourceId): Web3TaskSource {
  return web3TaskSources.find((source) => source.id === id) ?? web3TaskSources[web3TaskSources.length - 1];
}
