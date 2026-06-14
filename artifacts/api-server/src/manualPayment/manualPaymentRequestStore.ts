import { buildManualPaymentRequest } from "./manualPaymentRequestBuilder";
import type { ManualPaymentActionRecord, ManualPaymentRequest, ManualPaymentRequestInput, ManualPaymentRequestStatus } from "./manualPaymentRequestTypes";
const requests=new Map<string,ManualPaymentRequest>(); const bySource=new Map<string,string>();
export function createManualPaymentRequest(input:ManualPaymentRequestInput){ const key=input.sourceType&&input.sourceId?`${input.sourceType}:${input.sourceId}`:undefined; if(key&&bySource.has(key)) return requests.get(bySource.get(key)!)!; const req=buildManualPaymentRequest(input); requests.set(req.id,req); if(key) bySource.set(key,req.id); return req; }
export const listManualPaymentRequests=()=>[...requests.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
export const getManualPaymentRequestById=(id:string)=>requests.get(id);
export function updateManualPaymentRequestStatus(id:string,status:ManualPaymentRequestStatus){ const r=requests.get(id); if(!r) return undefined; const updated={...r,status,updatedAt:new Date().toISOString()}; requests.set(id,updated); return updated; }
export function recordManualPaymentAction(id:string, action:Omit<ManualPaymentActionRecord,"timestamp">){ const r=requests.get(id); if(!r) return undefined; const updated={...r,actionHistory:[...r.actionHistory,{...action,timestamp:new Date().toISOString()}],updatedAt:new Date().toISOString()}; requests.set(id,updated); return updated; }
