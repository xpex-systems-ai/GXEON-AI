import type { OperatorWorkflowEvent, OperatorWorkflowHandoff, OperatorWorkflowStatus } from "./operatorWorkflowTypes";
const handoffs=new Map<string,OperatorWorkflowHandoff>(); let seq=1; let eventSeq=1;
const open=new Set<OperatorWorkflowStatus>(["CREATED","ROUTE_OPENED","PREFILL_VIEWED","PREVIEW_CREATED","WAITING_MANUAL_RESPONSE"]);
export const isOpenHandoff=(h:OperatorWorkflowHandoff)=>open.has(h.status);
export const listOperatorWorkflowHandoffs=()=>[...handoffs.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
export const getOperatorWorkflowHandoff=(id:string)=>handoffs.get(id);
export function saveOperatorWorkflowHandoff(h:OperatorWorkflowHandoff){handoffs.set(h.id,h);return h;}
export function nextOperatorWorkflowHandoffId(){return `ow_handoff_${String(seq++).padStart(6,"0")}`;}
export function appendOperatorWorkflowEvent(handoffId:string,type:string,message:string,status?:OperatorWorkflowStatus){const h=handoffs.get(handoffId); if(!h)return undefined; const ev:OperatorWorkflowEvent={id:`ow_event_${String(eventSeq++).padStart(6,"0")}`,handoffId,at:new Date().toISOString(),type,message,status}; const updated={...h,status:status??h.status,updatedAt:ev.at,timeline:[...h.timeline,ev]}; handoffs.set(handoffId,updated); return updated;}
export const operatorWorkflowStats=()=>{const all=listOperatorWorkflowHandoffs();return{handoffs:all.length,openHandoffs:all.filter(isOpenHandoff).length,manualCompleted:all.filter(h=>h.status==="MANUAL_ACTION_DONE_OUTSIDE_GXEON"||h.status==="OPERATOR_CONFIRMED").length,lastHandoff:all[0],nextOpenHandoff:all.find(isOpenHandoff)}};
