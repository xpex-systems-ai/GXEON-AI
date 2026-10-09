import { PIPELINE_ORDER, type MonetizationLine, type PipelineStage } from "./types";

/**
 * Status global da linha de monetização.
 * REGRA INVIOLÁVEL: "revenue_confirmed" só existe com prova de release + tx hash + payment verified.
 */
export type GlobalStatus =
  | "idle"
  | "in_progress"
  | "awaiting_release"
  | "awaiting_proof"
  | "revenue_confirmed"
  | "blocked";

export interface GlobalStatusResult {
  status: GlobalStatus;
  label: string;
  description: string;
  tone: "muted" | "cyan" | "gold" | "warning" | "success" | "destructive";
  proof: {
    releaseConfirmed: boolean;
    txHashPresent: boolean;
    paymentVerified: boolean;
  };
}

const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export function isValidTxHash(hash: string | null | undefined): boolean {
  return !!hash && TX_HASH_RE.test(hash);
}

export function currentStage(line: MonetizationLine): PipelineStage | null {
  const active = line.pipeline.find((s) => s.state === "active");
  if (active) return active.stage;
  const done = line.pipeline.filter((s) => s.state === "done");
  return done.length ? done[done.length - 1].stage : null;
}

export function stageIndex(stage: PipelineStage): number {
  return PIPELINE_ORDER.indexOf(stage);
}

export function deriveGlobalStatus(line: MonetizationLine): GlobalStatusResult {
  const proof = {
    releaseConfirmed: line.releaseConfirmed,
    txHashPresent: isValidTxHash(line.releaseTxHash),
    paymentVerified: line.paymentVerified,
  };

  if (line.pipeline.some((s) => s.state === "blocked")) {
    return {
      status: "blocked",
      label: "Bloqueado",
      description: "Uma etapa está bloqueada e exige intervenção manual.",
      tone: "destructive",
      proof,
    };
  }

  // Única via para receita confirmada: as três provas presentes.
  if (proof.releaseConfirmed && proof.txHashPresent && proof.paymentVerified) {
    return {
      status: "revenue_confirmed",
      label: "Receita confirmada",
      description: "Release comprovado, tx hash válido e pagamento verificado on-chain.",
      tone: "success",
      proof,
    };
  }

  if (proof.releaseConfirmed || proof.txHashPresent) {
    return {
      status: "awaiting_proof",
      label: "Aguardando prova completa",
      description: "Há sinal de release, mas falta prova completa (tx hash válido + verificação).",
      tone: "warning",
      proof,
    };
  }

  const stage = currentStage(line);
  if (!stage) {
    return {
      status: "idle",
      label: "Sem atividade",
      description: "Nenhuma etapa iniciada nesta linha de monetização.",
      tone: "muted",
      proof,
    };
  }

  if (stage === "delivery" && line.pipeline.find((s) => s.stage === "delivery")?.state === "done") {
    return {
      status: "awaiting_release",
      label: "Aguardando release",
      description: "Entrega concluída. Receita NÃO confirmada até o release com tx hash.",
      tone: "gold",
      proof,
    };
  }

  return {
    status: "in_progress",
    label: "Em execução",
    description: "Linha em andamento. Nenhuma receita confirmada ainda.",
    tone: "cyan",
    proof,
  };
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  claim: "Claim",
  assigned: "Assigned",
  delivery: "Delivery",
  release: "Release",
  payment_verified: "Payment verified",
};