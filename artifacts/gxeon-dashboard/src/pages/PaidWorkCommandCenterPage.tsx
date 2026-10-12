import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Activity, ExternalLink, Radar, RefreshCw, ShieldCheck, WalletCards, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPaidWorkRadar, type PaidWorkRadarSnapshot } from "@/services/paidWorkRadarService";

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function StatusBadge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <Badge className={ok ? "bg-emerald-400/15 text-emerald-100" : "bg-amber-400/15 text-amber-100"}>{children}</Badge>;
}

export default function PaidWorkCommandCenterPage() {
  const [snapshot, setSnapshot] = useState<PaidWorkRadarSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      setSnapshot(await fetchPaidWorkRadar(signal));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  const totals = useMemo(() => {
    const providers = snapshot?.providers ?? [];
    return {
      open: providers.reduce((sum, p) => sum + p.openRecords, 0),
      advertised: providers.reduce((sum, p) => sum + p.advertisedUsd, 0),
      funded: providers.reduce((sum, p) => sum + p.fundedRecords, 0),
      claimReady: providers.reduce((sum, p) => sum + p.claimReadyRecords, 0),
    };
  }, [snapshot]);

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#070707] p-6 shadow-2xl shadow-black/50">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-amber-400/15 text-amber-100">GXEON COMMAND CENTER</Badge>
        <Badge className="bg-cyan-400/10 text-cyan-100">READ ONLY</Badge>
        <Badge className="bg-emerald-400/10 text-emerald-100">EVIDENCE FIRST</Badge>
        <Badge className="bg-white/10 text-white">NO AUTO CLAIM</Badge>
        <Badge className="bg-white/10 text-white">NO WALLET WRITE</Badge>
      </div>
      <div className="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200/60">Agent Work & Revenue OS</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-6xl">Paid Work Command Center</h1>
          <p className="mt-3 max-w-4xl text-slate-300">ENCONTRAR → COMPROVAR → EXECUTAR → RECEBER. Recompensa anunciada, funding e receita confirmada ficam separados por design.</p>
        </div>
        <Button onClick={() => void refresh()} disabled={loading} className="bg-amber-300 text-black hover:bg-amber-200">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar radar
        </Button>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {([
        { label: "Open records", value: totals.open, Icon: Radar },
        { label: "Advertised", value: usd(totals.advertised), Icon: Activity },
        { label: "Funded signals", value: totals.funded, Icon: ShieldCheck },
        { label: "Claim-ready", value: totals.claimReady, Icon: WalletCards },
      ] satisfies Array<{ label: string; value: string | number; Icon: LucideIcon }>).map(({ label, value, Icon }) => <Card key={label} className="border-white/10 bg-slate-950/80">
        <CardContent className="p-5">
          <Icon className="h-5 w-5 text-amber-200" />
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-black text-white">{String(value)}</p>
        </CardContent>
      </Card>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-3">
      {(snapshot?.providers ?? []).map((provider) => <Card key={provider.id} className="border-cyan-300/15 bg-slate-950/75">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-white">{provider.label}</CardTitle>
              <p className="mt-1 text-xs text-slate-500">{provider.id}</p>
            </div>
            <StatusBadge ok={provider.reachable}>{provider.reachable ? "LIVE READ" : "UNAVAILABLE"}</StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-white/10 p-3"><p className="text-slate-500">Open</p><p className="text-xl font-bold text-white">{provider.openRecords}</p></div>
            <div className="rounded-xl border border-white/10 p-3"><p className="text-slate-500">Advertised</p><p className="text-xl font-bold text-white">{usd(provider.advertisedUsd)}</p></div>
            <div className="rounded-xl border border-white/10 p-3"><p className="text-slate-500">Funded</p><p className="text-xl font-bold text-white">{provider.fundedRecords}</p></div>
            <div className="rounded-xl border border-white/10 p-3"><p className="text-slate-500">Claim-ready</p><p className="text-xl font-bold text-white">{provider.claimReadyRecords}</p></div>
          </div>
          <p className="text-sm text-slate-300">{provider.note}</p>
          {provider.error ? <p className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-2 text-xs text-amber-100">{provider.error}</p> : null}
          <a href={provider.endpoint} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-semibold text-cyan-200 hover:text-cyan-100">
            Fonte pública <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </CardContent>
      </Card>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <Card className="border-emerald-300/15 bg-emerald-400/[0.04]">
        <CardHeader><CardTitle className="text-white">GitHub demand engine</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <StatusBadge ok={snapshot?.githubDemandBackendReachable === true}>
            {snapshot?.githubDemandBackendReachable ? "BACKEND CONNECTED" : "BACKEND NOT CONFIRMED"}
          </StatusBadge>
          <p>O radar GitHub existente continua responsável por candidatos, scoring e pipeline preview. Este painel não duplica o motor.</p>
          <Link href="/ops/github-demand"><Button variant="outline" className="border-cyan-300/25 text-cyan-100">Abrir GitHub Demand Radar</Button></Link>
        </CardContent>
      </Card>
      <Card className="border-amber-300/15 bg-amber-400/[0.04]">
        <CardHeader><CardTitle className="text-white">Revenue truth gate</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <p><strong className="text-white">Advertised</strong> não entra no caixa.</p>
          <p><strong className="text-white">Funded</strong> ainda exige elegibilidade, claim legítimo e aceite.</p>
          <p><strong className="text-white">Revenue</strong> somente após settlement e prova independente.</p>
          <p className="text-xs text-slate-500">Última leitura: {snapshot?.generatedAt ? new Date(snapshot.generatedAt).toLocaleString("pt-BR") : "carregando"}</p>
        </CardContent>
      </Card>
    </section>
  </div>;
}
