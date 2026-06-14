import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CircleDollarSign, HandCoins, Plug, Route, ShieldCheck } from "lucide-react";
import { fetchMonetizationOffers, fetchMonetizationStatus, type MonetizationOffersResponse, type MonetizationRuntimeStatus } from "@/services/monetizationService";
import { fetchWeb3PipelineLinks, fetchWeb3TaskPreviews } from "@/services/web3TaskRadarService";
import { fetchConnectorBrainSummary, type ConnectorBrainSummary } from "@/services/realConnectorService";

const fallbackPath = ["Opportunity", "Proposal", "Task", "Evidence", "Ledger Preview", "Manual Payment Review"];

export default function MonetizationBoardPage() {
  const [status, setStatus] = useState<MonetizationRuntimeStatus | null>(null);
  const [offers, setOffers] = useState<MonetizationOffersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [web3Counts, setWeb3Counts] = useState({ previews: 0, qualifiedLinks: 0 });
  const [connectorSummary, setConnectorSummary] = useState<ConnectorBrainSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchMonetizationStatus(controller.signal), fetchMonetizationOffers(controller.signal), fetchWeb3TaskPreviews(controller.signal), fetchWeb3PipelineLinks(controller.signal), fetchConnectorBrainSummary(controller.signal)])
      .then(([runtimeStatus, offerData, web3Previews, web3Links, connectors]) => {
        setStatus(runtimeStatus);
        setOffers(offerData);
        setWeb3Counts({ previews: web3Previews.count, qualifiedLinks: web3Links.links.filter((link) => link.status === "QUALIFIED_FOR_TASK_QUEUE").length });
        setConnectorSummary(connectors);
        setError(null);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "MONETIZATION_RUNTIME_UNAVAILABLE");
      });
    return () => controller.abort();
  }, []);

  const counters = [
    { label: "Offers", value: String(status?.counts.offers ?? 0), hint: "real-data registry starts empty" },
    { label: "Clients", value: String(status?.counts.clients ?? 0), hint: "awaiting first approved customer" },
    { label: "Revenue", value: "R$ 0", hint: "requires externally confirmed payment" },
    { label: "Ledger preview", value: String(status?.counts.ledgerPreviewEvents ?? status?.ledgerPreviewReadiness?.previewEvents ?? 0), hint: "preview events only" },
    { label: "Web3 previews", value: String(web3Counts.previews), hint: "manual imports only" },
    { label: "Qualified Web3", value: String(web3Counts.qualifiedLinks), hint: "pipeline links preview" },
    { label: "GitHub Exec Packs", value: String(status?.githubDemandExecution?.readyCount ?? 0), hint: "manual revenue source preview" },
  ];

  const checkout = offers?.checkoutReadiness ?? status?.checkoutReadiness;
  const firstRevenuePath = status?.firstRevenuePath ?? fallbackPath;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-amber-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_14%,rgba(245,158,11,0.22),transparent_34%),radial-gradient(circle_at_16%_24%,rgba(16,185,129,0.16),transparent_30%)]" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-amber-300/40 bg-amber-400/10 text-amber-100">Monetization runtime P0</Badge>
            <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">real empty state</Badge>
            <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">payment providers {status?.payments ?? "NOT_CONNECTED"}</Badge>
            <Badge variant="outline" className="border-white/20 text-white">mode {status?.mode ?? "PREVIEW_ONLY"}</Badge>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.5em] text-amber-200/70">MICRODATA → MICROTASK → MICROTRANSACTION → LEDGER</p>
            <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">Monetization board · runtime ready</h1>
            <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">P0 exposes opportunity pipeline readiness, offer templates, checkout readiness and ledger preview boundaries. Revenue remains R$0, with realRevenueClaimed=false, until a future manual payment review stage is approved outside P0.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/ops/brain"><Button className="bg-amber-300 text-slate-950 hover:bg-amber-200">Open Command Brain <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link href="/ops/radar-x"><Button variant="outline" className="border-amber-300/30 text-amber-100 hover:bg-amber-400/10">Open Radar X intake</Button></Link>
            <Link href="/ops/github-demand"><Button variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10">Open GitHub Demand Radar</Button></Link>
            <Link href="/ops/opportunities"><Button variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10">Open Opportunity Inbox</Button></Link>
            <Link href="/ops/web3-tasks"><Button variant="outline" className="border-emerald-300/30 text-emerald-100 hover:bg-emerald-400/10">Open Web3 Task Radar</Button></Link>
            <Link href="/ops/agent-economy"><Button variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10">Open Agent Economy Radar</Button></Link>
            <Link href="/ops/ledger"><Button variant="outline" className="border-white/20 text-white hover:bg-white/10">Open ledger</Button></Link>
            <Link href="/ops/connectors"><Button variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10"><Plug className="mr-2 h-4 w-4" />Open Connector Command Center</Button></Link>
          </div>
          {error && <p className="rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">Backend unavailable: {error}</p>}
        </div>
      </section>


      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Object.entries(connectorSummary?.monetizationReadiness ?? { paymentManualReady: false, marketplaceSetupReady: false, modelProviderSetupReady: false, walletReadOnlyReady: false }).map(([label, ready]) => (<Card key={label} className="border-cyan-300/20 bg-slate-950/75"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.25em] text-cyan-100">{label}</p><p className="mt-2 text-2xl font-black text-white">{ready ? "READY" : "SETUP"}</p><p className="text-xs text-slate-300">Readiness only; no checkout/payment buttons.</p></CardContent></Card>))}</section>
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {counters.map((counter) => (
          <Card key={counter.label} className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{counter.label}</p>
              <p className="mt-2 text-3xl font-black text-white">{counter.value}</p>
              <p className="text-xs text-amber-200">{counter.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>



      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Opportunity monetization pipeline</p>
            <h2 className="text-2xl font-bold text-white">Opportunity → Proposal → Task → Evidence → Ledger Preview → Manual Payment Review</h2>
            <p className="mt-1 text-sm text-cyan-50/80">Counts come from the P0 in-memory Opportunity Inbox when the backend is available. Ledger preview events remain preview-only and providers remain NOT_CONNECTED.</p>
          </div>
          <Link href="/ops/opportunities"><Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Review inbox <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["New", status?.opportunityPipeline?.new ?? 0],
            ["Review", status?.opportunityPipeline?.review ?? 0],
            ["Qualified", status?.opportunityPipeline?.qualified ?? 0],
            ["Proposal", status?.opportunityPipeline?.proposalDrafted ?? 0],
            ["Task", status?.opportunityPipeline?.taskReady ?? 0],
            ["Evidence", status?.opportunityPipeline?.evidenceReady ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-cyan-300/20 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-100/70">{label}</p>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><HandCoins className="h-5 w-5 text-emerald-200" /> Microtask offer templates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(offers?.templates ?? []).map((offer) => (
              <div key={offer.id} className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-white">{offer.title}</p>
                  <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">approval required</Badge>
                </div>
                <p className="mt-2 text-sm text-emerald-50/80">{offer.priceRange.currency} {offer.priceRange.min.toLocaleString()}-{offer.priceRange.max.toLocaleString()} · {offer.deliveryWindow}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-emerald-50/70">
                  {offer.evidenceRequirements.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
            {!offers?.templates?.length && <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">Waiting for the backend template registry. No real offers are stored yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-cyan-200" /> Checkout readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(checkout?.providers ?? []).map((provider) => (
              <div key={provider.provider} className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-white">{provider.label}</p>
                  <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">{provider.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-cyan-50/80">{provider.nextStep}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50/85">
              {checkout?.boundary ?? "Payment capture and checkout session creation are disabled in P0."}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/10 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">GitHub Demand execution readiness</p><h2 className="text-2xl font-bold text-white">{status?.githubDemandExecution?.readyCount ?? 0} manual revenue pack(s)</h2><p className="mt-1 text-sm text-cyan-50/80">Top route: {status?.githubDemandExecution?.topRouteForR100Sprint?.route ?? "No execution pack yet"}. No provider verification or revenue claim.</p></div><Link href="/ops/github-demand"><Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Open GitHub Demand</Button></Link></div></section>

      <section className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">First revenue path</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
              {firstRevenuePath.map((step, index) => (
                <span key={step} className="flex items-center gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{step}</span>{index < firstRevenuePath.length - 1 && <ArrowRight className="h-4 w-4 text-amber-200" />}</span>
              ))}
            </div>
            <p className="mt-3 text-sm text-amber-50/80">Ledger events remain preview-only; P0 does not create checkout sessions, capture payments, issue invoices, contact customers, or claim real revenue.</p>
          </div>
          <Route className="h-8 w-8 text-amber-200" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">Financial boundary</p>
            <h2 className="text-2xl font-bold text-white">No checkout session creation in P0</h2>
            <p className="mt-1 text-sm text-emerald-50/80">This board prepares offer, webhook, ledger and delivery readiness only.</p>
          </div>
          <CircleDollarSign className="h-8 w-8 text-emerald-200" />
        </div>
      </section>
    </div>
  );
}
