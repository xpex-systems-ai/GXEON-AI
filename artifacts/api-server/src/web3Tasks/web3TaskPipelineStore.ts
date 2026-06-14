import type { Web3TaskPreview } from "./web3TaskTypes";
import { qualifyWeb3TaskPreview } from "./web3TaskQualificationEngine";
import { web3PipelineSafetyFlags, type Web3PipelineLinkStatus, type Web3TaskPipelineLinkRecord } from "./web3TaskPipelineTypes";

const links: Web3TaskPipelineLinkRecord[] = [];

export function createPipelineLinkFromWeb3Preview(preview: Web3TaskPreview): Web3TaskPipelineLinkRecord {
  const existing = getPipelineLinkByWeb3PreviewId(preview.id);
  if (existing) return existing;
  const qualification = qualifyWeb3TaskPreview(preview);
  const now = new Date().toISOString();
  const record: Web3TaskPipelineLinkRecord = { ...web3PipelineSafetyFlags, id: `w3link_${Date.now().toString(36)}_${(links.length + 1).toString(36)}`, ...qualification, sourcePreview: preview, web3TaskPreviewId: preview.id, opportunityPreviewId: qualification.opportunityPreviewId, taskPreviewId: qualification.taskPreviewId, createdAt: now, updatedAt: now };
  links.unshift(record);
  return record;
}
export function listPipelineLinks() { return links; }
export function getPipelineLinkById(id: string) { return links.find((link) => link.id === id) ?? null; }
export function getPipelineLinkByWeb3PreviewId(web3PreviewId: string) { return links.find((link) => link.web3TaskPreviewId === web3PreviewId) ?? null; }
export function updatePipelineLinkState(id: string, status: Web3PipelineLinkStatus, patch: Partial<Web3TaskPipelineLinkRecord> = {}) {
  const link = getPipelineLinkById(id);
  if (!link) throw new Error("WEB3_PIPELINE_LINK_NOT_FOUND");
  Object.assign(link, patch, { status, updatedAt: new Date().toISOString() });
  return link;
}
export function clearWeb3TaskPipelineLinksForTests() { links.splice(0, links.length); }
