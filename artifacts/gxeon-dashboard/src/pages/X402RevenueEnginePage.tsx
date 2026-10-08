import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/services/apiBase";
import { ArrowRight, ExternalLink, Radar, ShieldCheck, Wallet } from "lucide-react";

type BazaarItem = {
  resource: string; title: string; category: "SELLER_API";
  priceUsdc: string | null; status: string;
  historicCalls30d: number | null; historicPayers30d: number | null;
  capabilityMatch: boolean; fundedJobVerified: false; gxRevenueVerified: false;
};
type BazaarPreview = {
  mode: "READ_ONLY_PREVIEW"; catalogSourceVerified: false;
  matchedTagSignals: number; buyerDemandsVerified: 0; fundedBountiesVerified: 0;
  paymentConfirmed: false; revenueUsdc: null; items: BazaarItem[];
};
type Manifest = {
  name: string; status: string; paidExecutionEnabled: boolean;
  x402MiddlewareEnabled: boolean; paymentVerification: string;
  price: { amount: string; priceUsdc: string; asset: string; network: string };
};
type Status = {
  mode: string; authenticatedLiveCatalogConfigured: boolean;
  source: string; paidExecutionEnabled: false; fundedJobsVerified: 0;
  revenueVerifiedUsdc: null;
};
async function get<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("API_UNAVAILABLE_" + response.status);
  return response.json() as Promise<T>;
}

export default function X402RevenueEnginePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [catalogText, setCatalogText] = useState("");
  const [preview, setPreview] = useState<BazaarPreview | null>(null);
  const [evidenceText, setEvidenceText] = useState("");
  const [receipt, setReceipt] = useState<{ digest: string; canonicalization: string; verifiedPayment: false; attestsTruth: false } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      get<{ success: true; data: Status }>("/api/radar/x402/status"),
      get<Manifest>("/api/gxeon/evidence/manifest"),
    ]).then(([r, m]) => { if (active) { setStatus(r.data); setManifest(m); } })
      .catch(() => { if (active) setError("Backend de Evidence Verify / Bazaar não disponível neste ambiente."); });
    return () => { active = false; };
  }, []);

  async function classify() {
    setBusy(true); setError(null); setPreview(null);
    try {
      const payload = JSON.parse(catalogText) as unknown;
      const res = await fetch(apiUrl("/api/radar/x402/classify-preview"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await res.json() as { success?: boolean; data?: BazaarPreview; error?: string };
      if (!res.ok || !parsed.success || !parsed.data) throw new Error(parsed.error || "CATALOG_INVALID");
      setPreview(parsed.data);
    } catch (e) { setError(e instanceof Error ? e.message : "CATALOG_INVALID"); }
    finally { setBusy(false); }
  }
  async function loadFromProvider() {
    setBusy(true); setError(null); setPreview(null);
    try {
      const res = await fetch(apiUrl("/api/radar/x402/catalog-preview"), { cache: "no-store" });
      const parsed = await res.json() as { success?: boolean; data?: BazaarPreview; error?: string };
      if (!res.ok || !parsed.success || !parsed.data) throw new Error(parsed.error || "BAZAAR_NOT_AVAILABLE");
      setPreview(parsed.data);
    } catch (e) { setError(e instanceof Error ? e.message : "BAZAAR_NOT_AVAILABLE"); }
    finally { setBusy(false); }
  }
  async function previewReceipt() {
    setBusy(true); setError(null); setReceipt(null);
    try {
      const input = JSON.parse(evidenceText) as unknown;
      const r = await fetch(apiUrl("/api/gxeon/evidence/preview"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const result = await r.json() as { error?: string; digest?: string; canonicalization?: string; verifiedPayment?: false; attestsTruth?: false };
      if (!r.ok || !result.digest || !result.canonicalization) throw new Error(result.error || "EVIDENCE_PREVIEW_FAILED");
      setReceipt({ digest: result.digest, canonicalization: result.canonicalization, verifiedPayment: false, attestsTruth: false });
    } catch (e) { setError(e instanceof Error ? e.message : "EVIDENCE_PREVIEW_FAILED"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-cyan-300/25 bg-slate-950/85 p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">GXEON REVENUE ENGINE</Badge>
        <Badge variant="outline" className="text-amber-200 border-amber-400/40">X402 PAYMENT DISABLED</Badge>
        <Badge variant="outline">EVIDENCE FIRST</Badge>
      </div>
      <h1 className="text-3xl md:text-5xl font-black text-white">Radar x402 · vender APIs para agentes</h1>
      <p className="max-w-3xl text-slate-300">O Bazaar mostra serviços vendidos por terceiros, não tarefas contratadas pelo GXEON. Descobrimos oportunidades de produto sem gastar USDC, sem assinar transações e sem inventar compradores.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-900 p-4"><p className="text-xs text-slate-400">Capacidade própria</p><strong className="text-white">Evidence Verify v1 · SHA-256</strong><p className="text-xs text-slate-300">Preview gratuito; execução paga indisponível.</p></div>
        <div className="rounded-xl bg-slate-900 p-4"><p className="text-xs text-slate-400">Preço comercial planejado</p><strong className="text-xl text-emerald-300">{manifest?.price.priceUsdc ?? "0.01"} USDC</strong><p className="text-xs text-slate-300">Base · token USDC nativo, não cobrado agora.</p></div>
        <div className="rounded-xl bg-slate-900 p-4"><p className="text-xs text-slate-400">Pagamento confirmado</p><strong className="text-white">NÃO COMPROVADO</strong><p className="text-xs text-slate-300">O serviço ainda não utiliza middleware x402.</p></div>
      </div>
      <div className="flex flex-wrap gap-3 text-sm"><Link href="/ops/monetization" className="text-cyan-300">Monetization Board <ArrowRight className="inline h-4 w-4" /></Link><a href="https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/list-x402-resources" target="_blank" rel="noreferrer" className="text-cyan-300">Fonte oficial do Bazaar <ExternalLink className="inline h-4 w-4"/></a></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="border-cyan-300/25 bg-slate-950/85">
        <CardHeader><CardTitle className="flex gap-2 items-center text-white"><Radar className="h-5 w-5 text-cyan-300"/> Opportunity Intelligence</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-300">Cole um JSON do Bazaar com a propriedade <code>items</code> ou <code>resources</code> (até 25 registros). Os dados colados são classificados, não autenticados.</p>
          <Textarea rows={7} aria-label="JSON de catálogo x402" value={catalogText} onChange={e => setCatalogText(e.target.value)}
            placeholder='{"items":[{"resource":"https://api.exemplo.com/servico","accepts":[{"network":"eip155:8453","asset":"0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913","amount":"10000"}],"tags":["verification"]}]}' className="font-mono text-xs bg-black/50 text-slate-200" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || !catalogText.trim()} onClick={classify}>Classificar sem gastar</Button>
            <Button type="button" variant="outline" disabled={busy || !status?.authenticatedLiveCatalogConfigured}
              onClick={loadFromProvider}>Consultar CDP Bazaar (somente leitura)</Button>
          </div>
          <p className="text-xs text-amber-300">{status?.authenticatedLiveCatalogConfigured ? "Token CDP de descoberta configurado no backend." : "Consulta CDP direta aguardando token Bearer autorizado; classificação por JSON já está disponível."}</p>
          {preview && <>
            <div className="flex flex-wrap gap-2">
              <Badge>{preview.items.length} APIs anunciadas</Badge>
              <Badge>{preview.matchedTagSignals} compatibilidades por tags</Badge>
              <Badge variant="outline">0 bounties financiadas comprovadas</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {preview.items.map(item => <div key={item.resource} className="rounded-lg border border-slate-700 p-3">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-400 break-all">{item.resource}</p>
                <p className="text-xs text-cyan-200">SELLER_API · preço {item.priceUsdc ?? "indisponível"} USDC · chamadas 30d: {item.historicCalls30d ?? "—"} · pagadores: {item.historicPayers30d ?? "—"}</p>
                <p className="text-xs text-amber-300">Nenhum valor pertence ao GXEON até uma venda independente e liquidação verificadas.</p>
              </div>)}
            </div>
          </>}
        </CardContent>
      </Card>
      <Card className="border-amber-300/25 bg-slate-950/85">
        <CardHeader><CardTitle className="flex gap-2 items-center text-white"><ShieldCheck className="h-5 w-5 text-amber-300"/> GXEON Evidence Verify</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-300">Gere um recibo SHA-256 gratuito de um JSON. O hash comprova integridade dos bytes canonicalizados, não a veracidade nem autoria da informação.</p>
          <Textarea rows={6} aria-label="JSON de evidência" value={evidenceText} onChange={e => setEvidenceText(e.target.value)}
            placeholder='{"document":"exemplo","version":1}' className="font-mono text-xs bg-black/50 text-slate-200"/>
          <Button type="button" disabled={busy || !evidenceText.trim()} onClick={previewReceipt}>Gerar recibo gratuito</Button>
          {receipt && <div className="rounded-lg bg-black/50 p-3">
            <p className="text-xs text-slate-400">SHA-256 • {receipt.canonicalization}</p>
            <p className="font-mono text-xs break-all text-emerald-300 mt-2">{receipt.digest}</p>
            <p className="text-xs text-amber-300 mt-2">Pagamento verificado: NÃO • Verdade atestada: NÃO</p>
          </div>}
          <div className="flex gap-2 items-center text-xs text-slate-400"><Wallet className="h-4 w-4" />
            Recebedor x402 e middleware aguardam validação de titularidade, integração e conciliação.
          </div>
        </CardContent>
      </Card>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
  </div>;
}
