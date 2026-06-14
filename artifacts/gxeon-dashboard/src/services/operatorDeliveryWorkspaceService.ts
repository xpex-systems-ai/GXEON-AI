import { apiUrl } from "./apiBase";
export type DeliveryWorkspaceActionResult={actionType:string;status:string;workspaceId:string;executionPackId:string;mode:"PREVIEW_ONLY";safetyFlags:Record<string,unknown>;nextManualAction:string;preview:Record<string,unknown>};
async function req<T>(path:string,init?:RequestInit,fallback?:T):Promise<T>{try{const r=await fetch(apiUrl(path),{...init,headers:{Accept:"application/json","Content-Type":"application/json",...(init?.headers??{})}}); const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||j.error||path); return j.data as T;}catch(e){if(fallback!==undefined)return fallback; throw e;}}
export const fetchDeliveryWorkspaceStatus=(signal?:AbortSignal)=>req<any>("/api/delivery-workspace/status",{signal},{mode:"PREVIEW_ONLY",readyCount:0,workspaceCount:0});
export const fetchDeliveryWorkspaces=(signal?:AbortSignal)=>req<any>("/api/delivery-workspace/workspaces",{signal},{workspaces:[],count:0});
export const fetchDeliveryWorkspaceById=(id:string,signal?:AbortSignal)=>req<any>(`/api/delivery-workspace/workspaces/${id}`,{signal});
export const createDeliveryWorkspaceFromGitHubExecutionPack=(id:string)=>req<any>(`/api/delivery-workspace/from-github-execution-pack/${id}`,{method:"POST",body:JSON.stringify({})});
export const createEvidencePreviewFromWorkspace=(id:string)=>req<{actionResult:DeliveryWorkspaceActionResult;workspace:any}>(`/api/delivery-workspace/workspaces/${id}/evidence-preview`,{method:"POST",body:JSON.stringify({})});
export const createValidationPreviewFromWorkspace=(id:string)=>req<{actionResult:DeliveryWorkspaceActionResult;workspace:any}>(`/api/delivery-workspace/workspaces/${id}/validation-preview`,{method:"POST",body:JSON.stringify({})});
export const createReleasePreviewFromWorkspace=(id:string)=>req<{actionResult:DeliveryWorkspaceActionResult;workspace:any}>(`/api/delivery-workspace/workspaces/${id}/release-preview`,{method:"POST",body:JSON.stringify({})});
export const createLedgerPreviewFromWorkspace=(id:string)=>req<{actionResult:DeliveryWorkspaceActionResult;workspace:any}>(`/api/delivery-workspace/workspaces/${id}/ledger-preview`,{method:"POST",body:JSON.stringify({})});
