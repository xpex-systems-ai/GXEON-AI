import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { PipelineStage } from "@/lib/clawlancer/types";
import { STAGE_LABELS } from "@/lib/clawlancer/status";

/* ---------- Badges ---------- */

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide whitespace-nowrap",
  {
    variants: {
      tone: {
        muted: "border-border bg-muted text-muted-foreground",
        cyan: "border-cyan/30 bg-cyan-dim text-cyan",
        gold: "border-gold/30 bg-gold-dim text-gold",
        success: "border-success/30 bg-success-dim text-success",
        warning: "border-warning/30 bg-warning-dim text-warning",
        destructive: "border-destructive/30 bg-destructive-dim text-destructive",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export function Badge({
  tone,
  className,
  children,
  dot,
}: VariantProps<typeof badgeVariants> & { className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {dot && <span className="size-1.5 rounded-full bg-current animate-pulse-dot" />}
      {children}
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-dashed border-warning/50 bg-warning-dim px-1.5 py-px font-mono text-[0.6rem] font-bold tracking-widest text-warning",
        className,
      )}
      title="Dado fictício para demonstração"
    >
      DEMO
    </span>
  );
}

const stageTone: Record<PipelineStage, VariantProps<typeof badgeVariants>["tone"]> = {
  claim: "muted",
  assigned: "cyan",
  delivery: "gold",
  release: "warning",
  payment_verified: "success",
};

export function StageBadge({ stage }: { stage: PipelineStage }) {
  return <Badge tone={stageTone[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

/* ---------- Layout helpers ---------- */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className,
  elevated,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div className={cn(elevated ? "panel-elevated" : "panel", "p-5 animate-fade-up", className)}>
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "muted",
  demo,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "muted" | "gold" | "cyan" | "success" | "warning";
  demo?: boolean;
}) {
  const accent = {
    muted: "text-foreground",
    gold: "text-gold",
    cyan: "text-cyan",
    success: "text-success",
    warning: "text-warning",
  }[tone];
  return (
    <Panel className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {demo && <DemoTag />}
      </div>
      <p className={cn("mt-2 font-display text-2xl font-semibold tabular-nums md:text-3xl", accent)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Panel>
  );
}

/* ---------- Formatters ---------- */

export const fmtUsdc = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) +
      " USDC";

export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(new Date(iso)) + " UTC"
    : "—";

export const truncateMiddle = (s: string, head = 8, tail = 6) =>
  s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;