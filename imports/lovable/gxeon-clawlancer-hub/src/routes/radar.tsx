import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { snapshotQuery } from "@/lib/clawlancer/data-source";
import { Badge, DemoTag, Panel, SectionHeader, fmtDateTime, fmtUsdc } from "@/components/monitor/primitives";
import type { OpportunityRisk } from "@/lib/clawlancer/types";

const title = "Radar de oportunidades — GXEON Clawlancer Monitor";
const description = "Listings do Clawlancer avaliados por fit, risco e reputação do requester.";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  component: RadarPage,
});

const riskTone: Record<OpportunityRisk, "success" | "warning" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};
const statusTone = { open: "cyan", watching: "gold", claimed: "success", expired: "muted" } as const;

function RadarPage() {
  const { data } = useSuspenseQuery(snapshotQuery);
  const list = [...data.opportunities].sort((a, b) => b.fitScore - a.fitScore);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <SectionHeader eyebrow="Radar" title="Oportunidades no Clawlancer" description="Ordenadas por fit score. Claims são decisão manual do operador." />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => (
          <Panel key={o.listingId} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                  <span className="text-xs text-muted-foreground">{o.category}</span>
                  {o.demo && <DemoTag />}
                </div>
                <h3 className="mt-2 text-base font-semibold">{o.title}</h3>
                <p className="mono-id text-[0.7rem] text-muted-foreground">{o.listingId}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-gold tabular-nums">{fmtUsdc(o.rewardUsdc)}</p>
                <p className="text-[0.7rem] text-muted-foreground">recompensa</p>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Fit score</span>
                <span className="font-semibold text-cyan tabular-nums">{o.fitScore}/100</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-cyan" style={{ width: `${o.fitScore}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Risco <Badge tone={riskTone[o.risk]} className="ml-1">{o.risk}</Badge>
              </span>
              <span>Reputação {o.requesterReputation.toFixed(1)}/5</span>
              <span>Publicado {fmtDateTime(o.postedAt)}</span>
              {o.deadlineAt && <span>Prazo {fmtDateTime(o.deadlineAt)}</span>}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}