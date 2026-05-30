import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type Plan = { id: string; name: string; price: number; interval: string; credits: number; highlight: string };
type Pack = { id: string; credits: number; price: number; bonus: number };
type MarketplaceItem = { id: string; type: string; title: string; price: number; recurring: boolean; conversion_copy: string };
type RecoveryFlow = { trigger: string; channel: string; action: string; delay_minutes: number; message: string };
type MercadoPagoStatus = {
  mode: string;
  ready_for_real_pix: boolean;
  can_create_pix: boolean;
  missing_required: string[];
  credentials: Record<string, { configured: boolean; masked: string | null; length: number }>;
  safety: string;
};
type Catalog = {
  status: string;
  mercado_pago: MercadoPagoStatus;
  radar_monetization: { status: string; offer_id: string; source: string };
  checkout_engine: string[];
  conversion_engine: string[];
  cart_recovery: { channels: string[]; flows: RecoveryFlow[] };
  subscription_engine: { plans: Plan[] };
  credit_pack_engine: { packs: Pack[] };
  agent_marketplace: { monetization: string[]; items: MarketplaceItem[] };
  analytics: Analytics;
};
type Analytics = {
  metrics: {
    checkout_views: number;
    pix_generated: number;
    pix_paid: number;
    conversion_rate: number;
    revenue_today: number;
    revenue_month: number;
    mrr: number;
    ltv: number;
    cac: number;
    pending_recovery: number;
    marketplace_revenue: number;
  };
};
type Checkout = {
  id: string;
  status: string;
  kind: string;
  amount: number;
  copy_paste_pix: string | null;
  pix_qr_render: string | null;
  ticket_url_redirect: string | null;
  checkout_expiration_timer: string;
  payment_status_realtime: string;
  dynamic_offer: {
    headline: string;
    social_proof: string;
    scarcity: string;
    urgency: string;
    upsell: { label: string; price: number };
    downsell: { label: string; price: number };
    one_click_recovery_url: string;
  };
};

type CheckoutKind = "subscription" | "credit_pack" | "marketplace";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return response.json();
}

function statusColor(status: string) {
  if (status === "PAID") return "text-green-500";
  if (status === "EXPIRED" || status === "FAILED") return "text-red-500";
  return "text-yellow-500";
}

function secondsUntil(date: string) {
  return Math.max(0, Math.floor((new Date(date).getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function RevenueEnginePage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [kind, setKind] = useState<CheckoutKind>("subscription");
  const [offerId, setOfferId] = useState("pro");
  const [actorId, setActorId] = useState("agent_buyer_1");
  const [payerEmail, setPayerEmail] = useState("cliente@gxeon.ai");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  const analytics = catalog?.analytics.metrics;
  const countdown = checkout ? secondsUntil(checkout.checkout_expiration_timer) : 0;
  const countdownProgress = checkout ? Math.max(0, Math.min(100, (countdown / (30 * 60)) * 100)) : 0;

  const selectedOffer = useMemo(() => {
    if (!catalog) return null;
    if (kind === "subscription") return catalog.subscription_engine.plans.find((plan) => plan.id === offerId);
    if (kind === "credit_pack") return catalog.credit_pack_engine.packs.find((pack) => pack.id === offerId);
    return catalog.agent_marketplace.items.find((item) => item.id === offerId);
  }, [catalog, kind, offerId]);

  async function loadCatalog() {
    setError(null);
    try {
      const data = await fetchJson<Catalog>("/api/v1/revenue-engine/catalog");
      setCatalog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar Revenue Engine");
    } finally {
      setLoading(false);
    }
  }

  async function createRadarCheckout() {
    setCreating(true);
    setError(null);
    setStatusMessage(null);
    try {
      const data = await fetchJson<{ checkout: Checkout; signal: { signal_id: string; confidence_score: number } }>("/api/v1/revenue-engine/radar/checkout", {
        method: "POST",
        body: JSON.stringify({ actor_id: actorId, payer_email: payerEmail, amount: selectedOffer && "price" in selectedOffer ? selectedOffer.price : undefined }),
      });
      setCheckout(data.checkout);
      setStatusMessage(`X-Radar monetizado: checkout PIX criado para o sinal ${data.signal.signal_id} (${data.signal.confidence_score}).`);
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao monetizar X-Radar via PIX");
    } finally {
      setCreating(false);
    }
  }

  async function createCheckout() {
    setCreating(true);
    setError(null);
    setStatusMessage(null);
    try {
      const data = await fetchJson<Checkout>("/api/v1/revenue-engine/checkout", {
        method: "POST",
        body: JSON.stringify({ kind, offer_id: offerId, actor_id: actorId, payer_email: payerEmail }),
      });
      setCheckout(data);
      setStatusMessage("Checkout PIX real gerado com QR, copia-e-cola e status em tempo real.");
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar checkout PIX");
    } finally {
      setCreating(false);
    }
  }

  async function refreshCheckoutStatus() {
    if (!checkout) return;
    try {
      const data = await fetchJson<{ checkout: Checkout }>(`/api/v1/revenue-engine/checkout/${checkout.id}/status`);
      setCheckout(data.checkout);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Status indisponível");
    }
  }

  async function processRecovery() {
    setError(null);
    try {
      const data = await fetchJson<{ emitted: unknown[] }>("/api/v1/revenue-engine/recovery/process", { method: "POST", body: JSON.stringify({}) });
      setStatusMessage(`${data.emitted.length} ação(ões) de recuperação processadas.`);
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao processar recuperação");
    }
  }

  async function copyPix() {
    if (!checkout?.copy_paste_pix) return;
    await navigator.clipboard.writeText(checkout.copy_paste_pix);
    setStatusMessage("Código PIX copiado para a área de transferência.");
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!checkout || checkout.status !== "PENDING") return undefined;
    const timer = window.setInterval(refreshCheckoutStatus, 10_000);
    return () => window.clearInterval(timer);
  }, [checkout?.id, checkout?.status]);

  useEffect(() => {
    if (!catalog) return;
    if (kind === "subscription") setOfferId(catalog.subscription_engine.plans[1]?.id || "pro");
    if (kind === "credit_pack") setOfferId(catalog.credit_pack_engine.packs[1]?.id || "credits_500");
    if (kind === "marketplace") setOfferId(catalog.agent_marketplace.items[0]?.id || "agent_sale_growth_ops");
  }, [kind, catalog]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><RefreshCw className="mr-2 h-5 w-5 animate-spin" />Carregando máquina de receita…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Revenue Engine</h1>
            <Badge className="bg-green-600">{catalog?.status || "REVENUE_READY"}</Badge>
          </div>
          <p className="text-muted-foreground">GXEON Phase 06 — checkout PIX, recuperação, assinaturas, créditos e marketplace monetizado.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCatalog}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
          <Button variant="outline" onClick={createRadarCheckout} disabled={creating || !catalog?.mercado_pago.ready_for_real_pix}><Sparkles className="mr-2 h-4 w-4" />Monetizar Radar</Button>
          <Button onClick={createCheckout} disabled={creating || !catalog?.mercado_pago.can_create_pix}><QrCode className="mr-2 h-4 w-4" />Gerar PIX real</Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
      {statusMessage && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600"><CheckCircle2 className="mr-2 inline h-4 w-4" />{statusMessage}</div>}

      {catalog?.mercado_pago && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_1fr_auto] md:items-center">
            <div>
              <p className="text-sm text-muted-foreground">Mercado Pago Produção</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={catalog.mercado_pago.ready_for_real_pix ? "default" : "outline"}>{catalog.mercado_pago.mode}</Badge>
                <span className={catalog.mercado_pago.ready_for_real_pix ? "text-sm font-semibold text-green-600" : "text-sm font-semibold text-yellow-600"}>
                  {catalog.mercado_pago.ready_for_real_pix ? "PIX real habilitado" : "Aguardando variáveis seguras"}
                </span>
              </div>
              {catalog.mercado_pago.missing_required.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Faltando: {catalog.mercado_pago.missing_required.join(", ")}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Access Token: {catalog.mercado_pago.credentials.access_token?.masked || "não configurado"}</span>
              <span>Public Key: {catalog.mercado_pago.credentials.public_key?.masked || "não configurado"}</span>
              <span>Client ID: {catalog.mercado_pago.credentials.client_id?.masked || "não configurado"}</span>
              <span>PIX Key: {catalog.mercado_pago.credentials.pix_key?.masked || "não configurado"}</span>
            </div>
            <Button onClick={createRadarCheckout} disabled={creating || !catalog.mercado_pago.ready_for_real_pix}>
              <Sparkles className="mr-2 h-4 w-4" />PIX do Radar agora
            </Button>
          </CardContent>
        </Card>
      )}

      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Receita hoje</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(analytics.revenue_today)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">MRR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(analytics.mrr)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Conversão PIX</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analytics.conversion_rate}%</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">PIX gerados/pagos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analytics.pix_generated}/{analytics.pix_paid}</p></CardContent></Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Checkout de alta conversão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Produto</label>
                <select className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value as CheckoutKind)}>
                  <option value="subscription">Assinatura recorrente</option>
                  <option value="credit_pack">Pacote de créditos</option>
                  <option value="marketplace">Marketplace</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Oferta dinâmica</label>
                <select className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={offerId} onChange={(event) => setOfferId(event.target.value)}>
                  {kind === "subscription" && catalog?.subscription_engine.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {formatCurrency(plan.price)}</option>)}
                  {kind === "credit_pack" && catalog?.credit_pack_engine.packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.credits + pack.bonus} créditos — {formatCurrency(pack.price)}</option>)}
                  {kind === "marketplace" && catalog?.agent_marketplace.items.map((item) => <option key={item.id} value={item.id}>{item.title} — {formatCurrency(item.price)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="text-sm font-medium">Actor/cliente</label><Input value={actorId} onChange={(event) => setActorId(event.target.value)} /></div>
              <div><label className="text-sm font-medium">E-mail</label><Input value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} /></div>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Oferta selecionada</p>
              <p className="mt-1 text-xl font-semibold">{selectedOffer && "name" in selectedOffer ? selectedOffer.name : selectedOffer && "title" in selectedOffer ? selectedOffer.title : selectedOffer ? `${selectedOffer.credits} créditos` : "—"}</p>
              <p className="text-sm text-muted-foreground">Social proof, escassez, urgência, upsell, downsell e recuperação em um clique são anexados automaticamente ao checkout.</p>
            </div>
            <Button className="w-full" size="lg" onClick={createCheckout} disabled={creating}>{creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Criar checkout PIX</Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/20 to-green-500/10"><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />PIX real em tempo real</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-6">
            {!checkout ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Gere um checkout para renderizar QR PIX, copia-e-cola, link de pagamento e timer de expiração.</div>
            ) : (
              <>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border bg-white p-3">
                    {checkout.pix_qr_render ? <img src={checkout.pix_qr_render} alt="QR Code PIX" className="h-full w-full object-contain" /> : <QrCode className="h-20 w-20 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><Badge variant="outline" className={statusColor(checkout.status)}>{checkout.status}</Badge></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Valor</span><strong>{formatCurrency(checkout.amount)}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Expira em</span><strong className="flex items-center gap-1"><Timer className="h-4 w-4" />{formatCountdown(countdown)}</strong></div>
                    <Progress value={countdownProgress} />
                    <Button variant="outline" className="w-full" onClick={refreshCheckoutStatus}><Activity className="mr-2 h-4 w-4" />Atualizar status</Button>
                    {checkout.ticket_url_redirect && <Button className="w-full" onClick={() => window.open(checkout.ticket_url_redirect || "", "_blank")}><ArrowRight className="mr-2 h-4 w-4" />Abrir ticket Mercado Pago</Button>}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">PIX copia-e-cola</label>
                  <div className="mt-1 flex gap-2"><Textarea readOnly value={checkout.copy_paste_pix || "QR retornado sem payload copia-e-cola"} className="min-h-20 text-xs" /><Button variant="outline" onClick={copyPix}><Copy className="h-4 w-4" /></Button></div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-3"><TrendingUp className="mb-2 h-4 w-4 text-green-500" /><p className="text-sm font-medium">Social proof</p><p className="text-xs text-muted-foreground">{checkout.dynamic_offer.social_proof}</p></div>
                  <div className="rounded-lg border p-3"><Clock className="mb-2 h-4 w-4 text-orange-500" /><p className="text-sm font-medium">Urgência</p><p className="text-xs text-muted-foreground">{checkout.dynamic_offer.urgency}</p></div>
                  <div className="rounded-lg border p-3"><Wallet className="mb-2 h-4 w-4 text-blue-500" /><p className="text-sm font-medium">Upsell</p><p className="text-xs text-muted-foreground">{checkout.dynamic_offer.upsell.label} por {formatCurrency(checkout.dynamic_offer.upsell.price)}</p></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />Recuperação de carrinho</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {catalog?.cart_recovery.flows.map((flow) => (
              <div key={flow.trigger} className="rounded-lg border p-3">
                <div className="flex items-center justify-between"><Badge variant="secondary">{flow.trigger}</Badge>{flow.channel === "whatsapp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}</div>
                <p className="mt-2 text-sm font-medium">{flow.action}</p><p className="text-xs text-muted-foreground">{flow.message}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={processRecovery}>Processar flows pendentes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Assinaturas + créditos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {catalog?.subscription_engine.plans.map((plan) => <div key={plan.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{plan.name}</p><p className="text-xs text-muted-foreground">{plan.credits} créditos/mês</p></div><Badge>{formatCurrency(plan.price)}</Badge></div>)}
            {catalog?.credit_pack_engine.packs.map((pack) => <div key={pack.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{pack.credits + pack.bonus} créditos</p><p className="text-xs text-muted-foreground">Bônus: {pack.bonus}</p></div><Badge variant="outline">{formatCurrency(pack.price)}</Badge></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />Agent Marketplace</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {catalog?.agent_marketplace.items.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-center justify-between"><p className="font-medium">{item.title}</p><Badge variant="outline">{item.type}</Badge></div><p className="text-xs text-muted-foreground">{item.conversion_copy}</p><p className="mt-2 text-sm font-semibold">{formatCurrency(item.price)}{item.recurring ? "/mês" : ""}</p></div>)}
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">Auto-refresh ativo: {checkout?.payment_status_realtime || "aguardando checkout"}. Último tick local: {new Date(now).toLocaleTimeString("pt-BR")}.</div>
    </div>
  );
}
