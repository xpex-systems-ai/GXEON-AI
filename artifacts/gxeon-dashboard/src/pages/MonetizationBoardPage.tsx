import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CalendarDays, CircleDollarSign, HandCoins, Users } from "lucide-react";

const counters = [
  { label: "Leads", value: "0", hint: "sem leads reais registrados" },
  { label: "Propostas", value: "0", hint: "primeira proposta pendente" },
  { label: "Clientes", value: "0", hint: "primeiro cliente pendente" },
  { label: "Receita", value: "R$ 0", hint: "primeira receita pendente" },
];

const firstOffers = ["Landing Page", "Dashboard", "Portal do Cliente", "CRM Simples"];

const sevenDayActions = [
  "Dia 1: escolher nicho e listar 20 leads por indicação manual, formulário, email, LinkedIn, Workana ou 99Freelas.",
  "Dia 2: qualificar dores reais e registrar somente oportunidades consentidas no P0.",
  "Dia 3: criar proposta curta para uma oferta inicial com escopo, preço e prazo.",
  "Dia 4: converter oportunidade qualificada em tarefa P1 e preparar execução.",
  "Dia 5: executar entrega mínima com evidências revisáveis no P2.",
  "Dia 6: validar entrega no P3 e preparar release financeiro P4.",
  "Dia 7: registrar recebimento real confirmado no P5, sem gateway conectado.",
];

export default function MonetizationBoardPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-amber-950/25 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_14%,rgba(245,158,11,0.22),transparent_34%),radial-gradient(circle_at_16%_24%,rgba(16,185,129,0.16),transparent_30%)]" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-amber-300/40 bg-amber-400/10 text-amber-100">Board de monetização operacional</Badge>
            <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">sem clientes não reais</Badge>
            <Badge variant="outline" className="border-cyan-300/40 text-cyan-100">sem receita não real</Badge>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.5em] text-amber-200/70">LEAD → PROPOSTA → CLIENTE → RECEITA</p>
            <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">Monetização · primeira receita pendente</h1>
            <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">Quadro manual para gerar caixa sem integrações externas, pagamentos, banco de dados ou automações de prospecção.</p>
          </div>
          <Link href="/ops/opportunities">
            <Button className="bg-amber-300 text-slate-950 hover:bg-amber-200">Abrir P0 Opportunity Inbox <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
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

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><HandCoins className="h-5 w-5 text-emerald-200" /> Ofertas iniciais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {firstOffers.map((offer) => (
              <div key={offer} className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <p className="font-bold text-white">{offer}</p>
                <p className="mt-2 text-sm text-emerald-50/80">Oferta simples para proposta manual após dor real validada.</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><CalendarDays className="h-5 w-5 text-cyan-200" /> Próximas ações manuais · 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sevenDayActions.map((action) => (
              <div key={action} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                <span>{action}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Boundary financeiro</p>
            <h2 className="text-2xl font-bold text-white">Nenhum pagamento ou banco foi conectado</h2>
            <p className="mt-1 text-sm text-amber-50/80">O board só orienta ação manual; recebimentos reais devem ser confirmados fora do GXEON antes de qualquer registro futuro.</p>
          </div>
          <CircleDollarSign className="h-8 w-8 text-amber-200" />
        </div>
      </section>
    </div>
  );
}
