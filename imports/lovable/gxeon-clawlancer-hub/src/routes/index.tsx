import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { snapshotQuery } from "@/lib/clawlancer/data-source";
import { DemoTag, MetricCard, Panel, SectionHeader, StageBadge, fmtUsdc, Badge } from "@/components/monitor/primitives";
import { GlobalStatusPanel, IdentityGrid, ManualGateNotice, PipelineTracker } from "@/components/monitor/status-panels";
import { EvidenceLog } from "@/components/monitor/evidence-log";

const title = "Mission Control — GXEON Clawlancer Monitor";
const description =
  "Painel operacional da linha de monetização Clawlancer: pipeline do claim ao payout, identidade pública e prova on-chain.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  component: MissionControl,
});

function MissionControl() {
  const { data } = useSuspenseQuery(snapshotQuery);
  const { line, identity, tasks, evidence, performance, opportunities } = data;
  const gates = tasks.filter((t) => t.needsManualGate).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="eyebrow">Mission Control</p>
        <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">
          {line.name} {line.demo && <DemoTag className="ml-2 align-middle" />}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{line.description}</p>
      </header>

      <GlobalStatusPanel line={line} />

      <section>
        <SectionHeader eyebrow="Pipeline" title="Claim → Payment verified" description="Etapas da única linha monitorada." />
        <PipelineTracker line={line} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Receita verificada" value={fmtUsdc(performance.totalVerifiedUsdc)} tone="success" hint="Somente com tx hash" demo={performance.demo} />
        <MetricCard label="Receita pendente" value={fmtUsdc(performance.totalPendingUsdc)} tone="gold" hint="Não confirmada" demo={performance.demo} />
        <MetricCard label="Gates manuais" value={gates} tone="warning" hint="Aguardando operador" demo={line.demo} />
        <MetricCard label="Oportunidades" value={opportunities.filter((o) => o.status !== "expired").length} tone="cyan" hint="No radar" demo={line.demo} />
      </section>

      <section>
        <SectionHeader eyebrow="Identidade pública" title="Agente, carteira e referências" description="Apenas dados públicos. Nenhuma chave é armazenada." />
        <IdentityGrid identity={identity} />
      </section>

      <ManualGateNotice />

      <section className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <SectionHeader
            title="Fila prioritária"
            action={
              <Link to="/tasks" className="inline-flex items-center gap-1 text-xs text-cyan hover:underline">
                Ver todas <ArrowRight className="size-3" />
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {tasks.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="mono-id text-[0.68rem] text-muted-foreground">{t.listingId}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StageBadge stage={t.stage} />
                  {t.needsManualGate && <Badge tone="gold">gate</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="lg:col-span-3">
          <SectionHeader
            title="Últimas evidências"
            action={
              <Link to="/evidence" className="inline-flex items-center gap-1 text-xs text-cyan hover:underline">
                Log completo <ArrowRight className="size-3" />
              </Link>
            }
          />
          <EvidenceLog entries={evidence} limit={4} />
        </Panel>
      </section>
    </div>
  );
}