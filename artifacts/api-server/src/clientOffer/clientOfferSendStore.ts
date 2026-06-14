import { buildClientOfferSendPack } from "./clientOfferSendBuilder";
import type { ClientOfferActionRecord, ClientOfferSendInput, ClientOfferSendPack, ClientOfferSendStatus } from "./clientOfferSendTypes";
const packs=new Map<string,ClientOfferSendPack>(); const bySource=new Map<string,string>();
export function createClientOfferSendPack(input:ClientOfferSendInput){ const key=input.sourceType&&input.sourceId?`${input.sourceType}:${input.sourceId}`:undefined; if(key&&bySource.has(key)) return packs.get(bySource.get(key)!)!; const pack=buildClientOfferSendPack(input); packs.set(pack.id,pack); if(key) bySource.set(key,pack.id); return pack; }
export const listClientOfferSendPacks=()=>[...packs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
export const getClientOfferSendPackById=(id:string)=>packs.get(id);
export function updateClientOfferSendPackStatus(id:string,status:ClientOfferSendStatus){ const p=packs.get(id); if(!p) return undefined; const updated={...p,status,updatedAt:new Date().toISOString()}; packs.set(id,updated); return updated; }
export function recordClientOfferAction(id:string, action:Omit<ClientOfferActionRecord,"timestamp">){ const p=packs.get(id); if(!p) return undefined; const updated={...p,actionHistory:[...p.actionHistory,{...action,timestamp:new Date().toISOString()}],updatedAt:new Date().toISOString()}; packs.set(id,updated); return updated; }
