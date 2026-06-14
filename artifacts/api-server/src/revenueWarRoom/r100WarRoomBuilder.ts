import { listManualProspects } from "../prospect/manualProspectStore";
import { listClientOfferSendPacks } from "../clientOffer/clientOfferSendStore";
import { listManualPaymentRequests } from "../manualPayment/manualPaymentRequestStore";
import { listConversionPacks } from "../radar/githubDemandConversionStore";
import { rankR100ManualActions } from "./r100ActionPriorityEngine";
import { r100WarRoomSafetyFlags, type R100WarRoomSummary } from "./r100WarRoomTypes";
export function buildR100WarRoomSummary():R100WarRoomSummary{
 const prospects=listManualProspects(); const offers=listClientOfferSendPacks(); const payments=listManualPaymentRequests(); const githubPacks=listConversionPacks();
 const actions=rankR100ManualActions({prospects,offers,payments,githubPacks});
 const hotProspects=prospects.filter(p=>p.score?.sprintFitLabel==="HIGH"||p.urgencyLabel==="HIGH").slice(0,6);
 const readyOffers=offers.filter(o=>["READY_TO_COPY","DRAFT","WAITING_RESPONSE_MANUAL"].includes(o.status)).slice(0,6);
 const readyPayments=payments.filter(p=>["READY_TO_SEND_MANUALLY","DRAFT","WAITING_MANUAL_PAYMENT"].includes(p.status)).slice(0,6);
 const followUpQueue=offers.filter(o=>o.status==="WAITING_RESPONSE_MANUAL").concat(prospects.filter(p=>p.status==="WAITING_RESPONSE_MANUAL") as any).slice(0,6);
 const estimatedPreviewBrl=Math.min(100, Math.max(...[...hotProspects.map(p=>p.estimatedBudgetBrl??0),...readyOffers.map(o=>o.amountBrl??0),...readyPayments.map(p=>p.amountBrl??0),100]));
 return { ...r100WarRoomSafetyFlags, status:"R100_OPERATOR_WAR_ROOM_P0_READY", fastestRoute: actions[0]?.targetRoute ?? "/ops/prospects", nextBestManualAction: actions[0], actions, hotProspectCount:hotProspects.length, readyOfferCount:readyOffers.length, manualPaymentReadyCount:readyPayments.length, waitingResponseCount:followUpQueue.length, acceptedManualCount:prospects.filter(p=>p.status==="ACCEPTED_MANUALLY").length, estimatedPreviewBrl, realRevenueBrl:0, hotProspects, readyOffers, manualPaymentRequests:readyPayments, githubDemandPacks:githubPacks.slice(0,6), followUpQueue, brainSprintPreview:{targetBrl:100,windowMinutes:15,nextStep:actions[0]?.title,previewOnly:true}, ledgerPreview:{estimatedPreviewBrl,realRevenueBrl:0,providerVerified:false,realRevenueClaimed:false,previewOnly:true}, safetyFlags:r100WarRoomSafetyFlags };
}
