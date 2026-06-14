import { generateGitHubDemandExecutionPack } from "./githubDemandExecutionPack";
import type { GitHubDemandConversionPack } from "./githubDemandConversionTypes";
import type { ExecutionPackAction, ExecutionPackStatus, GitHubDemandExecutionPack } from "./githubDemandExecutionTypes";

const packs = new Map<string, GitHubDemandExecutionPack>();
const byConversion = new Map<string, string>();
export function createExecutionPack(conversionPack: GitHubDemandConversionPack): GitHubDemandExecutionPack { const existing = byConversion.get(conversionPack.id); if (existing) return packs.get(existing)!; const pack = generateGitHubDemandExecutionPack(conversionPack); packs.set(pack.id, pack); byConversion.set(conversionPack.id, pack.id); return pack; }
export const listExecutionPacks = () => [...packs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
export const getExecutionPackById = (id: string) => packs.get(id);
export function updateExecutionPackStatus(id: string, status: ExecutionPackStatus): GitHubDemandExecutionPack | undefined { const pack = packs.get(id); if (!pack) return undefined; const updated = { ...pack, status, updatedAt: new Date().toISOString() }; packs.set(id, updated); return updated; }
export function recordExecutionPackAction(id: string, action: Omit<ExecutionPackAction,"timestamp">): GitHubDemandExecutionPack | undefined { const pack = packs.get(id); if (!pack) return undefined; const updated = { ...pack, actionHistory: [...pack.actionHistory, { ...action, timestamp: new Date().toISOString() }], updatedAt: new Date().toISOString() }; packs.set(id, updated); return updated; }
