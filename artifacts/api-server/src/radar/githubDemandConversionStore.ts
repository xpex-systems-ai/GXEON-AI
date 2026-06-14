import { generateGitHubDemandConversionPack } from "./githubDemandConversionPack";
import type { GitHubDemandCandidate, GitHubDemandPipelinePreview } from "./githubDemandTypes";
import type { ConversionPackStatus, GitHubDemandConversionPack } from "./githubDemandConversionTypes";

const packs = new Map<string, GitHubDemandConversionPack>();
const byPipeline = new Map<string, string>();
export function createConversionPack(input: GitHubDemandPipelinePreview | GitHubDemandCandidate) {
  const pipelineId = "candidate" in input ? input.id : undefined;
  if (pipelineId) { const existingId = byPipeline.get(pipelineId); const existing = existingId ? packs.get(existingId) : undefined; if (existing) return existing; }
  const pack = generateGitHubDemandConversionPack(input); packs.set(pack.id, pack); if (pack.pipelinePreviewId) byPipeline.set(pack.pipelinePreviewId, pack.id); return pack;
}
export const listConversionPacks = () => [...packs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const getConversionPackById = (id: string) => packs.get(id) ?? null;
export function updateConversionPackStatus(id: string, status: ConversionPackStatus) { const pack = getConversionPackById(id); if (!pack) throw new Error("GITHUB_DEMAND_CONVERSION_PACK_NOT_FOUND"); const updated = { ...pack, status, updatedAt: new Date().toISOString() }; packs.set(id, updated); return updated; }
