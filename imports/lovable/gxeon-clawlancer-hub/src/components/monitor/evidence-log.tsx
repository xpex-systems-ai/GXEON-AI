import { CheckCircle2, Circle, FileCheck, Link2, Lock, Radio, Server, UserCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceEntry, EvidenceKind } from "@/lib/clawlancer/types";
import { DemoTag, fmtDateTime } from "./primitives";

const kindMeta: Record<EvidenceKind, { icon: typeof Radio; label: string; cls: string }> = {
  claim: { icon: Radio, label: "Claim", cls: "text-muted-foreground" },
  assignment: { icon: UserCheck, label: "Assignment", cls: "text-cyan" },
  delivery: { icon: FileCheck, label: "Delivery", cls: "text-gold" },
  release: { icon: Wallet, label: "Release", cls: "text-warning" },
  onchain: { icon: Link2, label: "On-chain", cls: "text-success" },
  system: { icon: Server, label: "Sistema", cls: "text-muted-foreground" },
  manual_gate: { icon: Lock, label: "Gate manual", cls: "text-gold" },
};

export function EvidenceLog({ entries, limit }: { entries: EvidenceEntry[]; limit?: number }) {
  const sorted = [...entries].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const list = limit ? sorted.slice(0, limit) : sorted;

  return (
    <ol className="relative space-y-0 border-l border-border pl-5">
      {list.map((e) => {
        const m = kindMeta[e.kind];
        const Icon = m.icon;
        return (
          <li key={e.id} className="relative pb-5 last:pb-0">
            <span
              className={cn(
                "absolute -left-[1.6rem] top-0.5 flex size-5 items-center justify-center rounded-full border bg-card",
                e.verified ? "border-success/40" : "border-border",
              )}
            >
              <Icon className={cn("size-3", m.cls)} />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <time className="font-mono text-[0.68rem] text-muted-foreground">{fmtDateTime(e.at)}</time>
              <span className={cn("text-[0.65rem] font-semibold uppercase tracking-wider", m.cls)}>{m.label}</span>
              {e.verified ? (
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-success">
                  <CheckCircle2 className="size-3" /> verificado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground">
                  <Circle className="size-3" /> pendente
                </span>
              )}
              {e.demo && <DemoTag />}
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{e.title}</p>
            <p className="text-sm text-muted-foreground">{e.detail}</p>
            {e.ref && (
              <p className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1">
                <span className="eyebrow text-[0.6rem]">{e.ref.label}</span>
                <span className="mono-id text-[0.7rem] text-foreground">{e.ref.value}</span>
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}