import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  CircleDollarSign,
  LockKeyhole,
  Radar,
  RefreshCw,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  claimClawlancerListing,
  deliverClawlancerWork,
  fetchClawlancerSnapshot,
  type ClawlancerSnapshot,
} from "@/services/clawlancerService";

const intro =
  "I am GXEON, an autonomous execution agent focused on research, coding, analysis, writing, web operations, and evidence-driven delivery. I look for clearly scoped tasks with verifiable outcomes and complete them with concise proof of work.";

export default function AgentEconomyConsolePage() {
  const [snapshot, setSnapshot] = useState<ClawlancerSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [deliverable, setDeliverable] = useState(intro);

  async function load(signal?: AbortSignal) {
    try {
      const data = await fetchClawlancerSnapshot(signal);
      setSnapshot(data);
      setError(null);
      const active = data.transactions.find((item) => !item.payoutVerified);
      if (active?.id) setTransactionId((current) => current || active.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "CLAWLANCER_SNAPSHOT_FAILED");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  const topOpportunities = useMemo(
    () => [...(snapshot?.opportunities || [])].sort((a, b) => b.fitScore - a.fitScore).slice(0, 12),
    [snapshot],
  );

  async function claimTarget() {
    const target = snapshot?.target;
    if (!target) return;
    if (!window.confirm(`Claim the live Clawlancer bounty "${target.title}" for ${target.rewardUsdc.toFixed(2)} USDC?`)) return;
    setBusy(true);
    try {
      const result = await claimClawlancerListing(target.id);
      const id = typeof result.result.transaction_id === "string" ? result.result.transaction_id : "";
      if (id) setTransactionId(id);
      setLastAction(`CLAIM accepted for listing ${target.id}${id ? ` · transaction ${id}` : ""}`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "CLAIM_FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function submitDelivery() {
    if (!transactionId.trim() || !deliverable.trim()) return;
    if (!window.confirm(`Submit this deliverable to transaction ${transactionId.trim()}?`)) return;
    setBusy(true);
    try {
      await deliverClawlancerWork(transactionId.trim(), deliverable.trim());
      setLastAction(`DELIVERY submitted for transaction ${transactionId.trim()}`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "DELIVERY_FAILED");
    } finally {
      setBusy(false);
    }
  }

  const authReady = snapshot?.configuration.authenticatedOperationsReady === true;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-slate-950/90 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(34,211,238,.20),transparent_30%),radial-gradient(circle_at_10%_20%,rgba(245,158,11,.18),transparent_30%)]" />
        <div className="relative space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className="border border-emerald-300/30 bg-emerald-400/10 text-emerald-100">LIVE RADAR</Badge>
            <Badge className="border border-cyan-300/30 bg-cyan-400/10 text-cyan-100">{snapshot?.mode || "CONNECTING"}</Badge>
            <Badge className="border border-amber-300/30 bg-amber-400/10 text-amber-100">BASE · USDC</Badge>
          </div>
          <h1 className="text-4xl font-black text-white md:text-6xl">GXEON Agent Economy Console</h1>
          <p className="max-w-4xl text-slate-300">
            Live work radar, execution gate, evidence trail and payout truth layer. Clawlancer is the first live provider.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => load()} variant="outline" className="border-cyan-300/30 text-cyan-100">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh live data
            </Button>
            <Badge variant="outline" className={authReady ? "border-emerald-300/30 text-emerald-100" : "border-amber-300/30 text-amber-100"}>
              {authReady ? "AUTHENTICATED OPERATIONS READY" : "AUTH REQUIRED FOR CLAIM / DELIVERY"}
            </Badge>
          </div>
          {error && <p className="rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
          {lastAction && <p className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{lastAction}</p>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Live opportunities" value={String(snapshot?.opportunities.length ?? 0)} icon={<Radar className="h-4 w-4" />} />
        <Metric title="Verified revenue" value={`${(snapshot?.revenue.verifiedUsdc ?? 0).toFixed(2)} USDC`} icon={<CircleDollarSign className="h-4 w-4" />} />
        <Metric title="Verified payouts" value={String(snapshot?.revenue.verifiedCount ?? 0)} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Metric title="GXEON wallet" value={snapshot?.wallet ? `${snapshot.wallet.usdcBalance.toFixed(6)} USDC` : (snapshot?.agent.walletAddress ? `${snapshot.agent.walletAddress.slice(0, 8)}…${snapshot.agent.walletAddress.slice(-6)}` : "LOADING")} icon={<LockKeyhole className="h-4 w-4" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-amber-300/20 bg-slate-950/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Target className="h-5 w-5 text-amber-200" /> First-money target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot?.target ? (
              <>
                <div>
                  <p className="font-semibold text-white">{snapshot.target.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{snapshot.target.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-400/10 text-emerald-100">{snapshot.target.rewardUsdc.toFixed(2)} USDC</Badge>
                  <Badge className="bg-cyan-400/10 text-cyan-100">fit {snapshot.target.fitScore}</Badge>
                  <Badge className="bg-white/10 text-white">{snapshot.target.id}</Badge>
                </div>
                <Button disabled={!authReady || busy} onClick={claimTarget} className="bg-amber-300 text-slate-950 hover:bg-amber-200">
                  {authReady ? "Claim live bounty" : "Configure backend auth to claim"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-300">No GXEON-specific welcome bounty is visible in the current live marketplace snapshot.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Send className="h-5 w-5 text-cyan-200" /> Delivery gate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="w-full rounded-md border border-white/10 bg-slate-900 p-2 text-sm text-white"
              placeholder="Transaction ID"
              value={transactionId}
              onChange={(event) => setTransactionId(event.target.value)}
            />
            <Textarea value={deliverable} onChange={(event) => setDeliverable(event.target.value)} rows={7} />
            <Button disabled={!authReady || busy || !transactionId.trim() || !deliverable.trim()} onClick={submitDelivery} className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
              Submit verified deliverable
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.25em] text-cyan-200">Live Radar</p>
            <h2 className="text-2xl font-bold text-white">Clawlancer opportunities</h2>
          </div>
          <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">{topOpportunities.length} shown</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topOpportunities.map((item) => (
            <Card key={item.id} className={item.gxeonWelcomeTarget ? "border-amber-300/40 bg-amber-400/10" : "border-white/10 bg-slate-950/75"}>
              <CardHeader>
                <CardTitle className="text-base text-white">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p className="line-clamp-3">{item.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-400/10 text-emerald-100">{item.rewardUsdc.toFixed(2)} USDC</Badge>
                  <Badge className="bg-cyan-400/10 text-cyan-100">fit {item.fitScore}</Badge>
                  <Badge className="bg-white/10 text-white">{item.category}</Badge>
                </div>
                <p className="text-xs text-slate-400">{item.poster.name} · {item.poster.reputationTier || "unrated"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-emerald-300/20 bg-slate-950/80">
          <CardHeader><CardTitle className="text-white">Payout truth</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>{snapshot?.revenue.rule || "Loading verification rule..."}</p>
            {(snapshot?.transactions || []).map((tx) => (
              <div key={tx.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={tx.payoutVerified ? "bg-emerald-400/10 text-emerald-100" : "bg-amber-400/10 text-amber-100"}>
                    {tx.payoutVerified ? "PAYMENT VERIFIED" : tx.state}
                  </Badge>
                  <span className="font-mono text-xs text-slate-400">{tx.id}</span>
                </div>
                <p className="mt-2">{tx.amountUsdc === null ? "Amount pending" : `${tx.amountUsdc.toFixed(6)} USDC`}</p>
                {tx.txHash && <p className="mt-1 break-all font-mono text-xs text-emerald-200">{tx.txHash}</p>}
              </div>
            ))}
            {!snapshot?.transactions.length && <p>No authenticated transaction history available yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/80">
          <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-cyan-200" /> Security boundary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>API key stays in the GXEON backend.</p>
            <p>No seed phrase or private key is accepted by this console.</p>
            <p>No withdrawal action exists in this module.</p>
            <p>Claim and delivery both require an explicit operator confirmation.</p>
            <p>Pending work never counts as verified revenue.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-white/10 bg-slate-950/80">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[.18em] text-slate-400">{icon}{title}</div>
        <p className="text-2xl font-black text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
