import { buildManualPaymentRequest } from "./manualPaymentRequestBuilder";
import type { ManualPaymentActionRecord, ManualPaymentRequest, ManualPaymentRequestInput, ManualPaymentRequestStatus } from "./manualPaymentRequestTypes";
import { r100DurableStateRegistry } from "../durableState/r100DurableStateRegistry";
const requests=new Map<string,ManualPaymentRequest>(); const bySource=new Map<string,string>();
const rebuild=()=>{bySource.clear(); requests.forEach(p=>{const key=(p as any).sourceType&&(p as any).sourceId?`${(p as any).sourceType}:${(p as any).sourceId}`:undefined; if(key) bySource.set(key,p.id);});};
export function hydrateManualPaymentRequestsFromDurableState(){ requests.clear(); r100DurableStateRegistry.loadCollection<ManualPaymentRequest>("manualPaymentRequests").forEach(p=>requests.set(p.id,p)); rebuild(); }
hydrateManualPaymentRequestsFromDurableState();
const persist=()=>r100DurableStateRegistry.saveCollection("manualPaymentRequests",[...requests.values()]);
export function createManualPaymentRequest(input:ManualPaymentRequestInput){ const key=input.sourceType&&input.sourceId?`${input.sourceType}:${input.sourceId}`:undefined; if(key&&bySource.has(key)) return requests.get(bySource.get(key)!)!; const req=buildManualPaymentRequest(input); requests.set(req.id,req); if(key) bySource.set(key,req.id); persist(); return req; }
export const listManualPaymentRequests=()=>[...requests.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
export const getManualPaymentRequestById=(id:string)=>requests.get(id);
export function updateManualPaymentRequestStatus(id:string,status:ManualPaymentRequestStatus){ const r=requests.get(id); if(!r) return undefined; const updated={...r,status,updatedAt:new Date().toISOString()}; requests.set(id,updated); persist(); return updated; }
export function recordManualPaymentAction(id:string, action:Omit<ManualPaymentActionRecord,"timestamp">){ const r=requests.get(id); if(!r) return undefined; const updated={...r,actionHistory:[...r.actionHistory,{...action,timestamp:new Date().toISOString()}],updatedAt:new Date().toISOString()}; requests.set(id,updated); persist(); return updated; }
