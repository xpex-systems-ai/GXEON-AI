import { MinimumRevenueSprintInput, MinimumRevenueSprintRecord, PreferredPayoutMethod, RevenueActionPlan, RevenueOfferPack, previewSafetyFlags } from "./commandBrainTypes";

const clean = (value?: string) => (typeof value === "string" ? value.trim() : "");

export function buildRevenueOfferPacks(targetAmountBrl = 100, paymentHint = "cole manualmente seu link Pix/Mercado Pago"): RevenueOfferPack[] {
  const packs = [
    { id: "ai_audit_express_50", routeType: "DIRECT_PIX_OFFER" as const, title: "Auditoria Express com IA", priceBrl: 50, targetSales: 2, deliveryWindow: "Hoje", deliverables: ["diagnóstico simples", "pontos de melhoria", "plano de 7 dias", "texto pronto para usar"] },
    { id: "repo_profile_audit_100", routeType: "DIRECT_PIX_OFFER" as const, title: "Auditoria Express de Projeto / GitHub / Perfil", priceBrl: 100, targetSales: 1, deliveryWindow: "Hoje", deliverables: ["relatório rápido", "riscos", "oportunidades", "próximos passos"] },
    { id: "ai_curriculum_profile_50", routeType: "DIRECT_PIX_OFFER" as const, title: "Currículo ou Perfil Profissional com IA", priceBrl: 50, targetSales: 2, deliveryWindow: "Hoje", deliverables: ["texto profissional", "bio", "resumo", "melhorias rápidas"] },
    { id: "web3_task_submission_pack", routeType: "WEB3_TASK_ATTEMPT" as const, title: "Web3 Task Submission Pack", priceBrl: 0, targetSales: 0, deliveryWindow: "Depende da task", deliverables: ["score da task", "checklist de submissão", "texto de entrega manual", "evidências"] },
  ];
  return packs.map((pack) => ({
    ...pack,
    readyToCopyMessage: pack.priceBrl > 0
      ? `Oi! Estou abrindo ${pack.targetSales} vaga(s) hoje para ${pack.title} por R$${pack.priceBrl}. Entrego: ${pack.deliverables.join(", ")}. Se fizer sentido, eu te mando as instruções de pagamento manual por Pix/Mercado Pago. ${paymentHint}. Sem automação e sem promessa de resultado garantido.`
      : `Vou tentar uma task Web3 manualmente usando GXEON como checklist: ${pack.deliverables.join(", ")}. A submissão, carteira e recompensa ficam fora do GXEON e dependem da plataforma externa.`,
    manualExecutionNotes: ["Copiar a mensagem", "Enviar manualmente pelo canal escolhido pelo operador", "Confirmar qualquer pagamento somente no app/site do provedor, fora do GXEON"],
  }));
}

export function buildRankedActionPlan(targetAmountBrl = 100): RevenueActionPlan[] {
  return [
    { rank: 1, routeType: "DIRECT_PIX_OFFER", label: "Direct Pix/Mercado Pago Offer", description: "Venda manual de serviço pequeno e urgente com pagamento fora do GXEON.", target: `2 ofertas de R$50 ou 1 oferta de R$${targetAmountBrl}`, estimatedSpeed: "Mais rápido: hoje", manualSteps: ["Escolher pacote", "Copiar mensagem", "Enviar manualmente para contatos quentes", "Conferir pagamento fora do GXEON"], riskNotes: ["Receita não garantida", "GXEON não verifica provedor"] },
    { rank: 2, routeType: "WEB3_TASK_ATTEMPT", label: "Web3/Bounty Task Attempt", description: "Preparar task Web3, mas submeter manualmente fora do GXEON.", target: "Uma task estimada em US$20+ ou R$100+", estimatedSpeed: "Depende da plataforma", manualSteps: ["Abrir Web3 Task Radar", "Escolher task clara", "Preparar evidências", "Submeter manualmente fora do GXEON"], riskNotes: ["Sem conexão de carteira", "Sem claim automático", "Recompensa não garantida"] },
    { rank: 3, routeType: "AGENT_ECONOMY_AUDIT", label: "Agent Economy Audit Offer", description: "Empacotar auditoria rápida de MCP/AI tool como serviço manual.", target: "Uma auditoria rápida vendida manualmente", estimatedSpeed: "Hoje ou próximo dia útil", manualSteps: ["Abrir Agent Economy Radar", "Escolher alvo", "Copiar oferta", "Executar entrega manual"], riskNotes: ["Depende de comprador", "Sem envio automático"] },
  ];
}

export function planMinimumRevenueSprint(input: MinimumRevenueSprintInput = {}): Omit<MinimumRevenueSprintRecord, "id" | "createdAt" | "updatedAt" | "status"> {
  const targetAmountBrl = Number.isFinite(input.targetAmountBrl) && Number(input.targetAmountBrl) > 0 ? Number(input.targetAmountBrl) : 100;
  const deadlineLabel = clean(input.deadlineLabel) || "today / next available manual window";
  const preferredPayoutMethod = (clean(input.preferredPayoutMethod) || "MERCADO_PAGO_PIX_MANUAL") as PreferredPayoutMethod;
  const mercadoPagoManualLink = clean(input.mercadoPagoManualLink);
  const pixKeyLabel = clean(input.pixKeyLabel);
  const paymentHint = mercadoPagoManualLink ? "Use o link manual já fornecido pelo operador" : pixKeyLabel ? `Use a chave Pix identificada como: ${pixKeyLabel}` : "Operador deve colar manualmente o próprio link Pix/Mercado Pago antes de enviar";
  const offerPacks = buildRevenueOfferPacks(targetAmountBrl, paymentHint);
  return {
    ...previewSafetyFlags,
    targetAmountBrl,
    deadlineLabel,
    preferredPayoutMethod,
    operatorNotes: clean(input.operatorNotes),
    actionPlan: buildRankedActionPlan(targetAmountBrl),
    offerPacks,
    paymentInstruction: { preferredPayoutMethod, mercadoPagoManualLinkProvided: Boolean(mercadoPagoManualLink), pixKeyLabelProvided: Boolean(pixKeyLabel), instructionText: `${paymentHint}. GXEON não cria link, não chama API de pagamento, não confirma recebimento e não garante receita.`, boundaries: ["No provider API", "No checkout session", "No automatic link creation", "Manual provider confirmation only outside GXEON"] },
    evidenceChecklist: ["Print da conversa enviada manualmente", "Escopo aceito pelo cliente", "Comprovante conferido fora do GXEON", "Entrega enviada manualmente", "Nota: providerVerified permanece false no GXEON P0"],
    ledgerPreview: { ...previewSafetyFlags, targetAmountBrl, expectedGrossBrl: targetAmountBrl, providerVerified: false, realRevenueClaimed: false, ledgerWriteDisabled: true, previewNote: "Prévia de ledger apenas. Não grava em banco e não representa dinheiro recebido." },
    nextBestAction: "Comece pelo pacote Direct Pix/Mercado Pago de R$50 ou R$100, copie a mensagem e envie manualmente para contatos quentes.",
  };
}
