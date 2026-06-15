import { r100DurableStateRegistry } from "../durableState/r100DurableStateRegistry";
import type { OperatorConfirmedRevenue, RevenueCloseLoop } from "./revenueCloseLoopTypes";
const loops=new Map<string,RevenueCloseLoop>(); const revenues=new Map<string,OperatorConfirmedRevenue>(); let seq=1; let revSeq=1;
function syncSeq(){ seq=[...loops.keys()].reduce((m,id)=>Math.max(m,Number(id.match(/(\d+)$/)?.[1]??0)+1),1); revSeq=[...revenues.keys()].reduce((m,id)=>Math.max(m,Number(id.match(/(\d+)$/)?.[1]??0)+1),1); }
export function hydrateRevenueCloseLoopsFromDurableState(){ loops.clear(); revenues.clear(); r100DurableStateRegistry.loadCollection<RevenueCloseLoop>("revenueCloseLoops").forEach(l=>loops.set(l.id,l)); r100DurableStateRegistry.loadCollection<OperatorConfirmedRevenue>("operatorConfirmedRevenue").forEach(r=>revenues.set(r.id,r)); syncSeq(); }
hydrateRevenueCloseLoopsFromDurableState();
const persistLoops=()=>r100DurableStateRegistry.saveCollection("revenueCloseLoops",[...loops.values()]);
const persistRevenues=()=>r100DurableStateRegistry.saveCollection("operatorConfirmedRevenue",[...revenues.values()]);
export const nextLoopId=()=>`r100_loop_${String(seq++).padStart(6,"0")}`; export const nextRevenueId=()=>`operator_revenue_${String(revSeq++).padStart(6,"0")}`;
export const saveRevenueCloseLoop=(l:RevenueCloseLoop)=>{loops.set(l.id,l);persistLoops();return l}; export const listRevenueCloseLoops=()=>[...loops.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); export const getRevenueCloseLoopById=(id:string)=>loops.get(id);
export const findLoopByLink=(k:"prospectId"|"offerId"|"paymentRequestId", id:string)=>listRevenueCloseLoops().find(l=>l[k]===id);
export const saveOperatorConfirmedRevenue=(r:OperatorConfirmedRevenue)=>{revenues.set(r.id,r);persistRevenues();return r}; export const listOperatorConfirmedRevenue=()=>[...revenues.values()].sort((a,b)=>b.confirmedAt.localeCompare(a.confirmedAt)); export const getOperatorConfirmedRevenueById=(id:string)=>revenues.get(id);
