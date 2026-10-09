import { Check, Lock, ShieldAlert, ShieldCheck, X, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_ORDER, type Identity, type MonetizationLine } from "@/lib/clawlancer/types";
import { deriveGlobalStatus, STAGE_LABELS } from "@/lib/clawlancer/status";
import { Badge, DemoTag, Panel, fmtDateTime, fmtUsdc } from "./primitives";

/* ---------- Status global ---------- */

export function GlobalStatusPanel({ line }: { line: MonetizationLine }) {
  const s = deriveGlobalStatus(line);
  const glow = {
    success: "shadow-glow-success",
    gold: "shadow-glow-gold",
    cyan: "shadow-glow-cyan",
    warning: "",
    destructive: "",
    muted: "",
  }[s.tone];

  return (
    <Panel elevated className={cn("relative overflow-hidden", glow)}>
      <div className="pointer-events-none absolute inset-0 bg-grid-dots opacity-40" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Status global</p>
            {line.demo && <DemoTag />}
          </div>
          <div className="mt-2 flex items-center gap-3">
            {s.status === "revenue_confirmed" ? (
              <ShieldCheck className="size-7 text-success" />
            ) : (
              <ShieldAlert className={cn("size-7", `text-${s.tone === "muted" ? "muted-foreground" : s.tone}`)} />
            )}
            <h2 className="font-display text-2xl font-semibold md:text-3xl">{s.label}</h2>
            <Badge tone={s.tone} dot={s.status !== "idle"}>
              {s.status}
            </Badge>
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{s.description}</p>
        </div>

        <ul className="grid shrink-0 grid-cols-3 gap-2 md:w-[26rem]">
          <ProofItem ok={s.proof.releaseConfirmed} label="Release" />
          <ProofItem ok={s.proof.txHashPresent} label="Tx hash" />
          <ProofItem ok={s.proof.paymentVerified} label="Pagamento" />
        </ul>
      </div>
      <p className="relative mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        Receita só é marcada como confirmada com release + tx hash válido + verificação on-chain.
      </p>
    </Panel>
  );
}

function ProofItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs font-medium",
        ok ? "border-success/30 bg-success-dim text-success" : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {ok ? <Check className="size-4" /> : <X className="size-4" />}
      {label}
    </li>
  );
}

/* ---------- Pipeline ---------- */

export function PipelineTracker({ line }: { line: MonetizationLine }) {
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      {PIPELINE_ORDER.map((stage, i) => {
        const step = line.pipeline.find((p) => p.stage === stage) ?? { stage, state: "pending" as const };
        const styles = {
          done: "border-success/40 bg-success-dim text-success",
          active: "border-gold/50 bg-gold-dim text-gold shadow-glow-gold",
          pending: "border-border bg-muted/40 text-muted-foreground",
          blocked: "border-destructive/40 bg-destructive-dim text-destructive",
        }[step.state];
        return (
          <li key={stage} className={cn("relative rounded-lg border p-3 transition-colors", styles)}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.65rem] opacity-70">0{i + 1}</span>
              {step.state === "active" && <span className="size-2 rounded-full bg-current animate-pulse-dot" />}
              {step.state === "done" && <Check className="size-3.5" />}
            </div>
            <p className="mt-1 text-sm font-semibold">{STAGE_LABELS[stage]}</p>
            <p className="mt-0.5 text-[0.7rem] opacity-80">{step.at ? fmtDateTime(step.at) : step.state}</p>
            {step.note && <p className="mt-1 line-clamp-2 text-[0.7rem] opacity-70">{step.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Identity cards ---------- */

function IdCard({
  label,
  value,
  demo,
  tone = "muted",
  sub,
}: {
  label: string;
  value: string | null;
  demo?: boolean;
  tone?: "muted" | "gold" | "cyan" | "success";
  sub?: string;
}) {
  const toneCls = { muted: "text-foreground", gold: "text-gold", cyan: "text-cyan", success: "text-success" }[tone];
  const copy = () => value && navigator.clipboard?.writeText(value);
  return (
    <Panel className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {demo && <DemoTag />}
      </div>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className={cn("mono-id min-w-0", value ? toneCls : "text-muted-foreground italic")}>
          {value ?? "não disponível"}
        </p>
        {value && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copiar ${label}`}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Copy className="size-3.5" />
          </button>
        )}
      </div>
      {sub && <p className="text-[0.7rem] text-muted-foreground">{sub}</p>}
    </Panel>
  );
}

export function IdentityGrid({ identity }: { identity: Identity }) {
  const d = identity.demo;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <IdCard label="Agent ID" value={identity.agentId} demo={d} tone="cyan" />
      <IdCard label="Public wallet" value={identity.publicWallet} demo={d} tone="gold" sub={`${identity.network} · somente leitura`} />
      <IdCard label="Listing ID" value={identity.listingId} demo={d} />
      <IdCard label="Transaction ID" value={identity.transactionId} demo={d} sub="Preenchido após o release" />
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">USDC balance</p>
          {d && <DemoTag />}
        </div>
        <p className="font-display text-2xl font-semibold tabular-nums text-success">{fmtUsdc(identity.usdcBalance)}</p>
        <p className="text-[0.7rem] text-muted-foreground">Leitura em {fmtDateTime(identity.balanceCheckedAt)}</p>
      </Panel>
      <IdCard label="Transaction hash" value={identity.transactionHash} demo={d} tone="success" sub="Prova on-chain obrigatória para confirmar receita" />
    </div>
  );
}

/* ---------- Gate manual ---------- */

export function ManualGateNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gold/25 bg-gold-dim/60 p-4 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-gold" />
      <div>
        <p className="font-semibold text-gold">Gate manual obrigatório</p>
        <p className="mt-0.5 text-muted-foreground">
          Este painel é somente leitura. Nenhuma carteira é conectada, nenhum fundo é movido e nenhuma
          chave privada ou seed phrase existe no frontend. Release e pagamento são executados fora daqui,
          por operador humano, e registrados aqui apenas como evidência.
        </p>
      </div>
    </div>
  );
}