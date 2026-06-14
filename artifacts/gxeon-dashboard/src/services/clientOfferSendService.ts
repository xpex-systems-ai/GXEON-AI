import { apiUrl } from "./apiBase";
async function json<T>(path:string, init?:RequestInit):Promise<T>{ const res=await fetch(apiUrl(`/api${path}`),{headers:{"Content-Type":"application/json",...(init?.headers??{})},...init}); if(!res.ok) throw new Error(await res.text()); return res.json(); }
export type ClientOfferSendStatus="DRAFT"|"READY_TO_COPY"|"SENT_MANUALLY"|"WAITING_RESPONSE_MANUAL"|"ACCEPTED_MANUALLY"|"DECLINED_MANUALLY"|"PAYMENT_PROOF_RECEIVED_MANUAL"|"MANUAL_REVIEW_REQUIRED"|"ARCHIVED";
export type ClientOfferChannel="WHATSAPP_MANUAL"|"EMAIL_MANUAL"|"LINKEDIN_MANUAL"|"GITHUB_MANUAL"|"DIRECT_PIX_MANUAL"|"OTHER_MANUAL";
export type ClientOfferSendPack={id:string;sourceType:string;sourceId?:string;status:ClientOfferSendStatus;title:string;amountBrl:number;channel:ClientOfferChannel;contactLabel?:string;notes?:string;ptBrShortMessage:string;ptBrFullMessage:string;enUsShortMessage:string;enUsFullMessage:string;paymentInstructionSnippet:string;manualSendChecklist:string[];proofOfSendChecklist:string[];followUpChecklist:string[];deliveryPromiseChecklist:string[];riskWarnings:string[];ledgerPreview:Record<string,unknown>;nextManualAction:string;autoSendDisabled:true;externalContactDisabled:true;paymentProviderDisabled:true;realRevenueClaimed:false;rewardNotGuaranteed:true};
export type ClientOfferSendResponse={success:boolean;data:{pack?:ClientOfferSendPack;packs?:ClientOfferSendPack[];actionResult?:any;[key:string]:any}};
export const fetchClientOfferSendStatus=()=>json<ClientOfferSendResponse>("/client-offer-send/status");
export const fetchClientOfferSendPacks=()=>json<ClientOfferSendResponse>("/client-offer-send/packs");
export const fetchClientOfferSendPackById=(id:string)=>json<ClientOfferSendResponse>(`/client-offer-send/packs/${id}`);
export const createClientOfferSendPack=(body:any)=>json<ClientOfferSendResponse>("/client-offer-send/packs",{method:"POST",body:JSON.stringify(body)});
export const createClientOfferFromManualPaymentRequest=(id:string)=>json<ClientOfferSendResponse>(`/client-offer-send/from-manual-payment/${id}`,{method:"POST"});
export const createClientOfferFromDeliveryWorkspace=(id:string)=>json<ClientOfferSendResponse>(`/client-offer-send/from-delivery-workspace/${id}`,{method:"POST"});
export const updateClientOfferSendPackState=(id:string,status:ClientOfferSendStatus)=>json<ClientOfferSendResponse>(`/client-offer-send/packs/${id}/state`,{method:"PATCH",body:JSON.stringify({status})});
export const createProofOfSendPreview=(id:string)=>json<ClientOfferSendResponse>(`/client-offer-send/packs/${id}/proof-of-send-preview`,{method:"POST"});
export const createFollowUpPreview=(id:string)=>json<ClientOfferSendResponse>(`/client-offer-send/packs/${id}/follow-up-preview`,{method:"POST"});
export const createLedgerPreviewFromClientOffer=(id:string)=>json<ClientOfferSendResponse>(`/client-offer-send/packs/${id}/ledger-preview`,{method:"POST"});
