import { apiUrl } from "./apiBase";
async function json<T>(path:string, init?:RequestInit):Promise<T>{const res=await fetch(apiUrl(`/api${path}`),{headers:{"Content-Type":"application/json",...(init?.headers??{})},...init}); if(!res.ok) throw new Error(await res.text()); return res.json();}
export type R100WarRoomAction={actionId:string;title:string;reason:string;expectedValueBrl:number;urgency:"HIGH"|"MEDIUM"|"LOW";targetRoute:string;copyInstruction:string;blockedActions:string[];manualOnly:true;copyOnly:true};
export type R100WarRoomSummary={status:string;mode:"PREVIEW_ONLY";fastestRoute:string;nextBestManualAction:R100WarRoomAction;actions:R100WarRoomAction[];hotProspectCount:number;readyOfferCount:number;manualPaymentReadyCount:number;waitingResponseCount:number;acceptedManualCount:number;estimatedPreviewBrl:number;realRevenueBrl:0;hotProspects:any[];readyOffers:any[];manualPaymentRequests:any[];githubDemandPacks:any[];followUpQueue:any[];brainSprintPreview:any;ledgerPreview:any;safetyFlags:any};
export type R100WarRoomResponse<T>={success:boolean;data:T};
export const fetchR100WarRoomStatus=()=>json<R100WarRoomResponse<any>>("/r100-war-room/status");
export const fetchR100WarRoomSummary=()=>json<R100WarRoomResponse<R100WarRoomSummary>>("/r100-war-room/summary");
export const fetchR100WarRoomActions=()=>json<R100WarRoomResponse<{actions:R100WarRoomAction[];nextBestManualAction:R100WarRoomAction}>>("/r100-war-room/actions");
export const createManualActionPreview=(actionId:string)=>json<R100WarRoomResponse<any>>("/r100-war-room/manual-action-preview",{method:"POST",body:JSON.stringify({actionId})});
export const createFocusSprintPreview=()=>json<R100WarRoomResponse<any>>("/r100-war-room/focus-sprint-preview",{method:"POST"});
