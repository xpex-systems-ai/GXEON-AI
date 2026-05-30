'use strict';

const { randomUUID } = require('node:crypto');
const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { createPixPayment, getPaymentsRuntimeAsync } = require('./paymentRuntime.cjs');
const { getMercadoPagoRuntimeConfig } = require('./mercadoPagoAdapter.cjs');
const { subscribeAgent } = require('./subscriptionRuntime.cjs');
const { ensureWallet, upsertWallet } = require('./creditRuntime.cjs');

const SUBSCRIPTION_PLANS = [
  { id: 'starter', name: 'Starter', price: 47, interval: 'month', credits: 100, highlight: 'Entrada rápida para validar ROI' },
  { id: 'pro', name: 'Pro', price: 97, interval: 'month', credits: 500, highlight: 'Melhor conversão para operação recorrente' },
  { id: 'enterprise', name: 'Enterprise', price: 297, interval: 'month', credits: 2000, highlight: 'Escala com suporte prioritário' },
];

const CREDIT_PACKS = [
  { id: 'credits_100', credits: 100, price: 29, bonus: 0 },
  { id: 'credits_500', credits: 500, price: 97, bonus: 50 },
  { id: 'credits_2000', credits: 2000, price: 297, bonus: 300 },
];

const MARKETPLACE_ITEMS = [
  { id: 'agent_sale_growth_ops', type: 'agent_sale', title: 'Agente Growth Ops', price: 197, recurring: false, conversion_copy: 'Automatiza campanhas, recupera carrinhos e entrega sinais de compra.' },
  { id: 'dataset_sale_b2b_intent', type: 'dataset_sale', title: 'Dataset B2B Intent', price: 97, recurring: false, conversion_copy: 'Leads enriquecidos com intenção e urgência para outbound.' },
  { id: 'workflow_sale_pix_recovery', type: 'workflow_sale', title: 'Workflow PIX Recovery', price: 147, recurring: false, conversion_copy: 'Fluxo pronto com WhatsApp, e-mail e desconto progressivo.' },
  { id: 'subscription_marketplace_pro', type: 'subscription', title: 'Marketplace Pro', price: 97, recurring: true, conversion_copy: 'Assinatura para publicar, vender e ranquear ativos GXEON.' },
  { id: 'radar_signal_priority_pack', type: 'workflow_sale', title: 'X-Radar Signal Priority Pack', price: 97, recurring: false, conversion_copy: 'Checkout PIX imediato para transformar sinais X-Radar em venda real.' },
];

const RECOVERY_FLOWS = [
  { trigger: 'pix_pending_15m', channel: 'whatsapp', action: 'whatsapp_reminder', delay_minutes: 15, message: 'Seu PIX GXEON expira em breve. Copie o código e ative seus créditos agora.' },
  { trigger: 'pix_pending_1h', channel: 'email', action: 'email_reminder', delay_minutes: 60, message: 'Ainda dá tempo de concluir sua compra GXEON com o mesmo checkout.' },
  { trigger: 'pix_pending_24h', channel: 'email', action: 'special_discount_offer', delay_minutes: 1440, message: 'Oferta especial liberada: conclua hoje e desbloqueie bônus de recuperação.' },
];

function getRevenueEngineMemory() {
  const mem = readMemory();
  return {
    checkouts: mem.revenue_engine_checkouts || [],
    events: mem.revenue_engine_events || [],
    recoveries: mem.revenue_engine_recoveries || [],
  };
}

function writeRevenueEngineMemory(next = {}) {
  const current = getRevenueEngineMemory();
  writeMemory({
    revenue_engine_checkouts: next.checkouts || current.checkouts,
    revenue_engine_events: next.events || current.events,
    revenue_engine_recoveries: next.recoveries || current.recoveries,
  });
}

function findOffer(kind, offerId) {
  if (kind === 'subscription') return SUBSCRIPTION_PLANS.find((plan) => plan.id === offerId) || SUBSCRIPTION_PLANS[1];
  if (kind === 'credit_pack') return CREDIT_PACKS.find((pack) => pack.id === offerId || String(pack.credits) === String(offerId)) || CREDIT_PACKS[1];
  return MARKETPLACE_ITEMS.find((item) => item.id === offerId) || MARKETPLACE_ITEMS[0];
}

function buildDynamicOffer({ kind = 'subscription', offer_id, actor_id } = {}) {
  const offer = findOffer(kind, offer_id);
  const amount = Number(offer.price || 97);
  const orderBump = kind === 'credit_pack'
    ? { id: 'support_fast_lane', label: 'Ativar prioridade por 7 dias', price: 19 }
    : { id: 'credits_bump_100', label: '+100 créditos de implementação', price: 29 };
  const state = getRevenueEngineMemory();
  const paidCount = state.checkouts.filter((checkout) => checkout.status === 'PAID').length;
  const generatedCount = state.checkouts.length;
  const socialProof = paidCount > 0
    ? `${paidCount} checkout(s) PIX pagos dentro do motor GXEON.`
    : `${generatedCount} checkout(s) PIX gerados pelo motor GXEON em produção.`;
  return {
    kind,
    offer,
    amount,
    headline: kind === 'subscription' ? `Plano ${offer.name} com ativação imediata` : offer.title || `${offer.credits} créditos GXEON`,
    social_proof: socialProof,
    scarcity: 'Bônus operacional liberado somente enquanto o checkout PIX estiver pendente.',
    urgency: 'QR PIX expira em 30 minutos e o follow-up automático inicia se o pagamento ficar pendente.',
    upsell: orderBump,
    downsell: { id: 'starter_recovery', label: 'Começar com oferta de entrada', price: 47 },
    one_click_recovery_url: `/revenue-engine?recover=${encodeURIComponent(actor_id || 'buyer')}&offer=${encodeURIComponent(offer.id)}`,
  };
}

function normalizePaymentStatus(status) {
  const value = String(status || 'PENDING').toUpperCase();
  if (value === 'PAID' || value === 'APPROVED') return 'PAID';
  if (value === 'EXPIRED' || value === 'FAILED' || value === 'CANCELED') return value;
  return 'PENDING';
}

function computeExpiresAt(input = {}) {
  const ttlMinutes = Number(input.ttl_minutes || 30);
  return new Date(Date.now() + Math.max(5, Math.min(ttlMinutes, 1440)) * 60_000).toISOString();
}

async function createRevenueCheckout(input = {}) {
  const kind = input.kind || 'subscription';
  const actorId = input.actor_id || input.agent_id || 'agent_buyer_1';
  const dynamicOffer = buildDynamicOffer({ kind, offer_id: input.offer_id, actor_id: actorId });
  const checkoutId = `chk_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const expiresAt = computeExpiresAt(input);
  const amount = Number(input.amount || dynamicOffer.amount);
  const description = input.description || `GXEON ${dynamicOffer.headline}`;
  const payment = await createPixPayment({
    amount,
    actor_id: actorId,
    actor_code: input.actor_code,
    external_reference: checkoutId,
    idempotency_key: `checkout:${checkoutId}`,
    description,
    payer: input.payer,
    payer_email: input.payer_email,
    date_of_expiration: expiresAt,
    metadata: {
      ...(input.metadata || {}),
      revenue_engine: true,
      checkout_id: checkoutId,
      kind,
      offer_id: dynamicOffer.offer.id,
      conversion_class: 'HOT',
      cta_source: 'GXEON_PHASE_06_REVENUE_ENGINE',
    },
  });

  const checkout = {
    id: checkoutId,
    status: normalizePaymentStatus(payment.status),
    kind,
    offer: dynamicOffer.offer,
    amount,
    actor_id: actorId,
    payment_id: payment.payment_id,
    provider_payment_id: payment.provider_payment_id,
    external_reference: checkoutId,
    pix_qr_render: payment.qrCodeBase64 ? `data:image/png;base64,${payment.qrCodeBase64}` : null,
    copy_paste_pix: payment.copyPastePix || payment.qrCode || null,
    ticket_url_redirect: payment.ticketUrl || null,
    checkout_expiration_timer: expiresAt,
    payment_status_realtime: 'AUTO_REFRESH_10S',
    auto_refresh_status: true,
    dynamic_offer: dynamicOffer,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const state = getRevenueEngineMemory();
  writeRevenueEngineMemory({
    checkouts: [checkout, ...state.checkouts].slice(0, 1000),
    events: [{ type: 'checkout_created', checkout_id: checkoutId, amount, kind, at: new Date().toISOString() }, ...state.events].slice(0, 5000),
  });

  return checkout;
}

async function getCheckoutStatus(checkoutId) {
  const state = getRevenueEngineMemory();
  const checkout = state.checkouts.find((item) => item.id === checkoutId || item.payment_id === checkoutId || item.provider_payment_id === checkoutId);
  if (!checkout) {
    const err = new Error('checkout not found');
    err.code = 'CHECKOUT_NOT_FOUND';
    throw err;
  }

  const runtime = await getPaymentsRuntimeAsync();
  const payment = (runtime.payments || []).find((item) =>
    item.payment_id === checkout.payment_id ||
    item.transaction_id === checkout.payment_id ||
    item.provider_payment_id === checkout.provider_payment_id ||
    item.external_reference === checkout.id,
  );
  const status = normalizePaymentStatus(payment?.status || checkout.status);
  const expired = new Date(checkout.checkout_expiration_timer).getTime() < Date.now();
  const nextStatus = status === 'PENDING' && expired ? 'EXPIRED' : status;
  const updated = { ...checkout, status: nextStatus, payment_status_realtime: nextStatus, updated_at: new Date().toISOString() };
  const checkouts = state.checkouts.map((item) => item.id === checkout.id ? updated : item);
  writeRevenueEngineMemory({ checkouts });
  return { checkout: updated, payment: payment || null, generated_at: new Date().toISOString() };
}

function processCartRecovery({ now = Date.now(), dry_run = false } = {}) {
  const state = getRevenueEngineMemory();
  const emitted = [];
  const recoveries = [...state.recoveries];
  const checkouts = state.checkouts.map((checkout) => {
    if (checkout.status !== 'PENDING') return checkout;
    const ageMinutes = (Number(now) - new Date(checkout.created_at).getTime()) / 60_000;
    const sent = new Set((checkout.recovery_actions || []).map((item) => item.trigger));
    const due = RECOVERY_FLOWS.filter((flow) => ageMinutes >= flow.delay_minutes && !sent.has(flow.trigger));
    if (due.length === 0) return checkout;
    const actions = due.map((flow) => ({ ...flow, checkout_id: checkout.id, status: dry_run ? 'DRY_RUN' : 'QUEUED', at: new Date().toISOString() }));
    emitted.push(...actions);
    recoveries.unshift(...actions);
    return { ...checkout, recovery_actions: [...(checkout.recovery_actions || []), ...actions], updated_at: new Date().toISOString() };
  });
  if (!dry_run && emitted.length > 0) writeRevenueEngineMemory({ checkouts, recoveries: recoveries.slice(0, 5000) });
  return { cart_recovery: 'ACTIVE', channels: ['whatsapp', 'email'], flows: RECOVERY_FLOWS, emitted, generated_at: new Date().toISOString() };
}

function getRevenueAnalytics() {
  const state = getRevenueEngineMemory();
  const paid = state.checkouts.filter((checkout) => checkout.status === 'PAID');
  const pending = state.checkouts.filter((checkout) => checkout.status === 'PENDING');
  const revenue = paid.reduce((sum, checkout) => sum + Number(checkout.amount || 0), 0);
  const month = new Date().toISOString().slice(0, 7);
  const revenueMonth = paid.filter((checkout) => String(checkout.updated_at || checkout.created_at).startsWith(month)).reduce((sum, checkout) => sum + Number(checkout.amount || 0), 0);
  const subMrr = paid.filter((checkout) => checkout.kind === 'subscription').reduce((sum, checkout) => sum + Number(checkout.amount || 0), 0);
  const marketplaceRevenue = paid.filter((checkout) => checkout.kind === 'marketplace').reduce((sum, checkout) => sum + Number(checkout.amount || 0), 0);
  const conversionRate = state.checkouts.length > 0 ? Number(((paid.length / state.checkouts.length) * 100).toFixed(2)) : 0;
  return {
    analytics_engine: 'ACTIVE',
    status: 'REVENUE_READY',
    metrics: {
      checkout_views: state.checkouts.length,
      pix_generated: state.checkouts.length,
      pix_paid: paid.length,
      conversion_rate: conversionRate,
      revenue_today: Number(revenue.toFixed(2)),
      revenue_month: Number(revenueMonth.toFixed(2)),
      mrr: Number(subMrr.toFixed(2)),
      ltv: paid.length > 0 ? Number((revenue / paid.length * 3).toFixed(2)) : 0,
      cac: 0,
      pending_recovery: pending.length,
      marketplace_revenue: Number(marketplaceRevenue.toFixed(2)),
    },
    output: ['real_pix_checkout', 'recovery_flows', 'subscription_sales', 'credit_sales', 'dashboard_revenue'],
    generated_at: new Date().toISOString(),
  };
}

function getRevenueCatalog() {
  const mercadoPago = getMercadoPagoRuntimeConfig();
  return {
    status: 'REVENUE_READY',
    mercado_pago: mercadoPago,
    radar_monetization: { status: mercadoPago.ready_for_real_pix ? 'READY_FOR_REAL_PIX' : 'WAITING_FOR_ENV', offer_id: 'radar_signal_priority_pack', source: 'X_RADAR_REVENUE_ENGINE' },
    checkout_engine: ['pix_qr_render', 'copy_paste_pix', 'ticket_url_redirect', 'checkout_expiration_timer', 'payment_status_realtime', 'auto_refresh_status'],
    conversion_engine: ['social_proof', 'scarcity', 'urgency', 'dynamic_offer', 'upsell', 'downsell', 'one_click_recovery'],
    cart_recovery: { channels: ['whatsapp', 'email'], flows: RECOVERY_FLOWS },
    subscription_engine: { plans: SUBSCRIPTION_PLANS },
    credit_pack_engine: { packs: CREDIT_PACKS },
    agent_marketplace: { monetization: ['agent_sale', 'dataset_sale', 'workflow_sale', 'subscription'], items: MARKETPLACE_ITEMS },
    analytics: getRevenueAnalytics(),
    generated_at: new Date().toISOString(),
  };
}

async function sellSubscription(input = {}) {
  const plan = findOffer('subscription', input.plan_id || input.offer_id);
  return createRevenueCheckout({ ...input, kind: 'subscription', offer_id: plan.id, amount: plan.price, metadata: { ...(input.metadata || {}), plan: plan.id } });
}

async function sellCreditPack(input = {}) {
  const pack = findOffer('credit_pack', input.pack_id || input.offer_id);
  ensureWallet(input.actor_id || input.agent_id || 'agent_buyer_1');
  return createRevenueCheckout({ ...input, kind: 'credit_pack', offer_id: pack.id, amount: pack.price, metadata: { ...(input.metadata || {}), credits: pack.credits + pack.bonus } });
}


async function createRadarMonetizationCheckout(input = {}) {
  const { generateSignal } = require('./xRadarEngine.cjs');
  const signal = input.signal || generateSignal({
    category: input.category || 'MEV',
    score: input.score || 88,
    source: 'X_RADAR_REVENUE_ENGINE',
    producer_agent_id: input.producer_agent_id || 'signal_producer_1',
  });
  const amount = Number(input.amount || input.price || Math.max(47, Math.round(Number(signal.expected_roi_pct || 3) * 10)));
  const checkout = await createRevenueCheckout({
    ...input,
    kind: 'marketplace',
    offer_id: input.offer_id || 'radar_signal_priority_pack',
    amount,
    actor_id: input.actor_id || input.consumer_agent_id || 'radar_buyer_1',
    description: input.description || `X-Radar premium signal ${signal.signal_id}`,
    metadata: {
      ...(input.metadata || {}),
      signal_id: signal.signal_id,
      signal_category: signal.category,
      signal_confidence_score: signal.confidence_score,
      signal_expected_roi_pct: signal.expected_roi_pct,
      signal_source: signal.source,
      monetization_channel: 'X_RADAR_REAL_PIX',
    },
  });

  const mem = readMemory();
  const radarSales = mem.x_radar_revenue_sales || [];
  writeMemory({
    x_radar_revenue_sales: [{ signal, checkout_id: checkout.id, amount: checkout.amount, status: checkout.status, created_at: new Date().toISOString() }, ...radarSales].slice(0, 5000),
  });

  return { status: 'RADAR_PIX_CHECKOUT_CREATED', signal, checkout, generated_at: new Date().toISOString() };
}

function activatePaidEntitlement({ actor_id, kind, offer_id } = {}) {
  if (!actor_id) throw new Error('actor_id is required');
  if (kind === 'subscription') {
    const mapped = offer_id === 'enterprise' ? 'ENTERPRISE' : offer_id === 'pro' ? 'PRO' : 'BASIC';
    return { kind, entitlement: subscribeAgent({ agent_id: actor_id, plan: mapped }) };
  }
  if (kind === 'credit_pack') {
    const pack = findOffer('credit_pack', offer_id);
    return { kind, entitlement: upsertWallet({ agent_id: actor_id, initial_balance: pack.credits + pack.bonus }) };
  }
  return { kind: 'marketplace', entitlement: { actor_id, item_id: offer_id, status: 'ACTIVE', activated_at: new Date().toISOString() } };
}

module.exports = {
  createRevenueCheckout,
  getCheckoutStatus,
  processCartRecovery,
  getRevenueAnalytics,
  getRevenueCatalog,
  sellSubscription,
  sellCreditPack,
  createRadarMonetizationCheckout,
  activatePaidEntitlement,
};
