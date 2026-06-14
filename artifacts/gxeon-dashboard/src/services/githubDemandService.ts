import { apiUrl } from "./apiBase";
export type GitHubDemandCandidate={id:string;title:string;url:string;repository:{fullName:string;url:string};category:string;monetizationRoute:string;recommendedAction:string;riskFlags:string[];manualReviewRequired:true;externalContactDisabled:true;githubWriteDisabled:true;rewardNotGuaranteed:true;score:{demandScore:number;bountyConfidenceScore:number;serviceLeadScore:number;riskScore:number;executionEaseScore:number;gxeonFitScore:number;urgencyScore:number}};
export type GitHubDemandQueryPack={id:string;label:string;query:string;categoryHint:string;monetizationRouteHint:string;riskNotes:string[];operatorUseCase:string};
export type GitHubDemandPipelinePreview={id:string;candidate:GitHubDemandCandidate;status:string;proposalPackReady:boolean;nextManualAction:string};
async function req<T>(path:string,init?:RequestInit,fallback?:T):Promise<T>{try{const r=await fetch(apiUrl(path),{...init,headers:{Accept:"application/json","Content-Type":"application/json",...(init?.headers??{})}}); const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||path); return j.data as T;}catch(e){if(fallback!==undefined)return fallback; throw e;}}
const boundary={mode:"PREVIEW_ONLY",manualReviewRequired:true,externalContactDisabled:true,githubWriteDisabled:true,rewardNotGuaranteed:true};
export const fetchGitHubDemandStatus=(signal?:AbortSignal)=>req<any>("/api/github-demand/status",{signal},{...boundary,status:"GITHUB_DEMAND_BACKEND_UNAVAILABLE",maxCandidates:0});
export const fetchGitHubDemandQueryPacks=(signal?:AbortSignal)=>req<{queryPacks:GitHubDemandQueryPack[];count:number}>("/api/github-demand/query-packs",{signal},{queryPacks:[],count:0});
export const searchGitHubDemandPreview=(body:{queryPackId?:string;query?:string;limit?:number})=>req<{candidates:GitHubDemandCandidate[];diagnostics:any;query:string;normalizedQuery:string}>("/api/github-demand/search-preview",{method:"POST",body:JSON.stringify(body)});
export const scoreGitHubDemandPreview=(candidate:GitHubDemandCandidate)=>req<any>("/api/github-demand/score-preview",{method:"POST",body:JSON.stringify({candidate})});
export const createGitHubDemandPipelinePreview=(candidate:GitHubDemandCandidate)=>req<{pipelinePreview:GitHubDemandPipelinePreview}>("/api/github-demand/pipeline-preview",{method:"POST",body:JSON.stringify({candidate})});
export const fetchGitHubDemandPipelinePreviews=(signal?:AbortSignal)=>req<{pipelinePreviews:GitHubDemandPipelinePreview[];count:number}>("/api/github-demand/pipeline-previews",{signal},{pipelinePreviews:[],count:0});
export const generateGitHubDemandProposalPack=(id:string)=>req<any>(`/api/github-demand/pipeline-previews/${id}/proposal-pack`,{method:"POST",body:JSON.stringify({})});
export const createOpportunityFromGitHubDemand=(id:string,operatorConfirmed:boolean)=>req<any>(`/api/github-demand/pipeline-previews/${id}/create-opportunity-preview`,{method:"POST",body:JSON.stringify({operatorConfirmed})});

export const generateGitHubDemandConversionPack=(id:string)=>req<any>(`/api/github-demand/pipeline-previews/${id}/conversion-pack`,{method:"POST",body:JSON.stringify({})});
export const fetchGitHubDemandConversionPacks=(signal?:AbortSignal)=>req<any>("/api/github-demand/conversion-packs",{signal},{conversionPacks:[],count:0});
export const fetchGitHubDemandConversionPackById=(id:string,signal?:AbortSignal)=>req<any>(`/api/github-demand/conversion-packs/${id}`,{signal});
export const createOpportunityFromConversionPack=(id:string,operatorConfirmed=false)=>req<any>(`/api/github-demand/conversion-packs/${id}/create-opportunity-preview`,{method:"POST",body:JSON.stringify({operatorConfirmed})});
export const createTaskPreviewFromConversionPack=(id:string)=>req<any>(`/api/github-demand/conversion-packs/${id}/create-task-preview`,{method:"POST",body:JSON.stringify({})});
export const createBrainRevenueSprintPreviewFromConversionPack=(id:string)=>req<any>(`/api/github-demand/conversion-packs/${id}/brain-revenue-sprint-preview`,{method:"POST",body:JSON.stringify({})});
