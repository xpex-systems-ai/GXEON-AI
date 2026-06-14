import type { OperatorConfirmedRevenue, RevenueCloseLoop } from "./revenueCloseLoopTypes";
const loops=new Map<string,RevenueCloseLoop>(); const revenues=new Map<string,OperatorConfirmedRevenue>(); let seq=1; let revSeq=1;
export const nextLoopId=()=>`r100_loop_${String(seq++).padStart(6,"0")}`; export const nextRevenueId=()=>`operator_revenue_${String(revSeq++).padStart(6,"0")}`;
export const saveRevenueCloseLoop=(l:RevenueCloseLoop)=>{loops.set(l.id,l);return l}; export const listRevenueCloseLoops=()=>[...loops.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); export const getRevenueCloseLoopById=(id:string)=>loops.get(id);
export const findLoopByLink=(k:"prospectId"|"offerId"|"paymentRequestId", id:string)=>listRevenueCloseLoops().find(l=>l[k]===id);
export const saveOperatorConfirmedRevenue=(r:OperatorConfirmedRevenue)=>{revenues.set(r.id,r);return r}; export const listOperatorConfirmedRevenue=()=>[...revenues.values()].sort((a,b)=>b.confirmedAt.localeCompare(a.confirmedAt)); export const getOperatorConfirmedRevenueById=(id:string)=>revenues.get(id);
