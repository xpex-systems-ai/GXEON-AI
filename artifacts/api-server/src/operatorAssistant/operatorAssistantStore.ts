import { operatorAssistantSafety, type OperatorAssistantHandoff, type OperatorAssistantPreview } from "./operatorAssistantTypes";
const previews=new Map<string,OperatorAssistantPreview>(); const handoffs=new Map<string,OperatorAssistantHandoff>();
export const saveActionPreview=(p:OperatorAssistantPreview)=>{previews.set(p.id,p);return p};
export const listActionPreviews=()=>[...previews.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
export function createInternalHandoff(input:any):OperatorAssistantHandoff{const h={...operatorAssistantSafety,id:`oas_handoff_${Date.now()}`,createdAt:new Date().toISOString(),targetRoute:String(input?.targetRoute||"/ops/prospects"),reason:String(input?.reason||"manual preview"),note:"Handoff interno preview-only; nenhuma ação externa foi executada.",safetyFlags:["PREVIEW_ONLY","IN_MEMORY_ONLY","NO_EXTERNAL_ACTION","NO_GITHUB_WRITE","NO_PAYMENT_API"]};handoffs.set(h.id,h);return h;}
export const listInternalHandoffs=()=>[...handoffs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
