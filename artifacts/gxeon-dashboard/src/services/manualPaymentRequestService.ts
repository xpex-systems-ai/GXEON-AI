import { apiUrl } from "./apiBase";
async function json<T>(path:string, init?:RequestInit):Promise<T>{ const res=await fetch(apiUrl(`/api${path}`),{headers:{"Content-Type":"application/json",...(init?.headers??{})},...init}); if(!res.ok) throw new Error(await res.text()); return res.json(); }
export type ManualPaymentRequestStatus="DRAFT"|"READY_TO_SEND_MANUALLY"|"WAITING_MANUAL_PAYMENT"|"PROOF_RECEIVED_MANUAL"|"MANUAL_REVIEW_REQUIRED"|"MANUAL_CONFIRMED_OUTSIDE_GXEON"|"CANCELLED"|"ARCHIVED";
export type ManualPaymentMethod="PIX_MANUAL"|"MERCADO_PAGO_LINK_MANUAL"|"BANK_TRANSFER_MANUAL"|"OTHER_MANUAL";
export type ManualPaymentRequest={id:string;status:ManualPaymentRequestStatus;offerTitle:string;amountBrl:number;method:ManualPaymentMethod;sourceType:string;ptBrCopyMessage:string;enUsCopyMessage:string;proofChecklist:string[];manualConfirmationChecklist:string[];receiptDraft:string;ledgerPreview:Record<string,unknown>;nextManualAction:string;paymentProviderDisabled:true;realRevenueClaimed:false;paymentNotGuaranteed:true};
export type ManualPaymentResponse={success:boolean;data:{request?:ManualPaymentRequest;requests?:ManualPaymentRequest[];actionResult?:any;[key:string]:any}};
export const fetchManualPaymentStatus=()=>json<ManualPaymentResponse>("/manual-payment/status");
export const fetchManualPaymentRequests=()=>json<ManualPaymentResponse>("/manual-payment/requests");
export const fetchManualPaymentRequestById=(id:string)=>json<ManualPaymentResponse>(`/manual-payment/requests/${id}`);
export const createManualPaymentRequest=(body:any)=>json<ManualPaymentResponse>("/manual-payment/requests",{method:"POST",body:JSON.stringify(body)});
export const createManualPaymentRequestFromDeliveryWorkspace=(id:string)=>json<ManualPaymentResponse>(`/manual-payment/from-delivery-workspace/${id}`,{method:"POST"});
export const updateManualPaymentRequestState=(id:string,status:ManualPaymentRequestStatus)=>json<ManualPaymentResponse>(`/manual-payment/requests/${id}/state`,{method:"PATCH",body:JSON.stringify({status})});
export const createProofChecklistPreview=(id:string)=>json<ManualPaymentResponse>(`/manual-payment/requests/${id}/proof-checklist-preview`,{method:"POST"});
export const createReceiptDraftPreview=(id:string)=>json<ManualPaymentResponse>(`/manual-payment/requests/${id}/receipt-draft-preview`,{method:"POST"});
export const createLedgerPreviewFromManualPaymentRequest=(id:string)=>json<ManualPaymentResponse>(`/manual-payment/requests/${id}/ledger-preview`,{method:"POST"});

export const createClientOfferPreviewFromManualPaymentRequest=(id:string)=>json<ManualPaymentResponse>(`/manual-payment/requests/${id}/client-offer-preview`,{method:"POST"});
