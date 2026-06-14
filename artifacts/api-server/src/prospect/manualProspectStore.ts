import { buildManualProspect } from "./manualProspectBuilder";
import { nextManualActionFor, scoreManualProspect } from "./manualProspectScoring";
import type { ManualProspect, ManualProspectActionRecord, ManualProspectInput, ManualProspectStatus } from "./manualProspectTypes";
const prospects=new Map<string,ManualProspect>(); const byLabelSource=new Map<string,string>();
const save=(p:ManualProspect)=>{prospects.set(p.id,p); byLabelSource.set(`${p.displayNameOrLabel.toLowerCase()}:${p.source}`,p.id); return p;};
export function createManualProspect(input:ManualProspectInput){ const key=`${input.displayNameOrLabel?.toLowerCase()}:${input.source??"OPERATOR_KNOWN_CONTACT"}`; const existing=byLabelSource.get(key); if(existing) return prospects.get(existing)!; return save(buildManualProspect(input)); }
export const listManualProspects=()=>[...prospects.values()].sort((a,b)=>b.score.totalScore-a.score.totalScore || b.createdAt.localeCompare(a.createdAt));
export const getManualProspectById=(id:string)=>prospects.get(id);
export function updateManualProspectStatus(id:string,status:ManualProspectStatus){ const p=prospects.get(id); if(!p) return undefined; const score=scoreManualProspect(p); return save({...p,status,score,nextManualAction:nextManualActionFor(p,status,score),updatedAt:new Date().toISOString()}); }
export function linkProspectToOfferPack(id:string,linkedOfferPackId:string){ const p=prospects.get(id); if(!p) return undefined; return save({...p,linkedOfferPackId,status:"OFFER_READY",nextManualAction:nextManualActionFor(p,"OFFER_READY"),updatedAt:new Date().toISOString()}); }
export function linkProspectToManualPaymentRequest(id:string,linkedPaymentRequestId:string){ const p=prospects.get(id); if(!p) return undefined; return save({...p,linkedPaymentRequestId,status:"PAYMENT_PENDING_MANUAL",nextManualAction:nextManualActionFor(p,"PAYMENT_PENDING_MANUAL"),updatedAt:new Date().toISOString()}); }
export function linkProspectToDeliveryWorkspace(id:string,linkedDeliveryWorkspaceId:string){ const p=prospects.get(id); if(!p) return undefined; return save({...p,linkedDeliveryWorkspaceId,status:"DELIVERY_READY",updatedAt:new Date().toISOString()}); }
export function recordManualProspectAction(id:string, action:Omit<ManualProspectActionRecord,"timestamp">){ const p=prospects.get(id); if(!p) return undefined; return save({...p,actionHistory:[...p.actionHistory,{...action,timestamp:new Date().toISOString()}],updatedAt:new Date().toISOString()}); }
