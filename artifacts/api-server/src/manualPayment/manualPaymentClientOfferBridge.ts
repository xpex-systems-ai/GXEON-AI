import { actionResult } from "../clientOffer/clientOfferSendBuilder";
import { createClientOfferSendPack } from "../clientOffer/clientOfferSendStore";
import { getManualPaymentRequestById } from "./manualPaymentRequestStore";
export function createClientOfferPackFromManualPaymentRequest(id:string){ const r=getManualPaymentRequestById(id); if(!r) return undefined; const pack=createClientOfferSendPack({sourceType:"MANUAL_PAYMENT_REQUEST",sourceId:r.id,title:r.offerTitle,amountBrl:r.amountBrl,channel:r.method==="PIX_MANUAL"?"DIRECT_PIX_MANUAL":"OTHER_MANUAL",paymentInstructionSnippet:r.ptBrCopyMessage,notes:r.notes}); return actionResult(pack,{createdFromManualPaymentRequest:true,manualPaymentRequestId:r.id}); }
