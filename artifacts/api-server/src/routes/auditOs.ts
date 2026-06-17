import { Router } from "express";
import { auditOsCategories, auditOsMonetizationLadder, auditOsSafetyFlags } from "../audit-os/auditOsCatalog";
import type { AuditOsPreviewRequest } from "../audit-os/auditOsTypes";

const router = Router();
const noStore = (_req: any, res: any, next: any) => { res.setHeader("Cache-Control", "no-store"); next(); };
const status = {
  product: "GXEON Audit OS P0",
  internalEngine: "GXEON OS",
  mode: "P0_SAFE_PREVIEW_ONLY",
  positioning: "Auditoria inteligente para destravar sites, lojas, perfis, sistemas, código, campanhas e negócios digitais.",
  coreFlow: ["Dor capturada", "Diagnóstico guiado", "Dashboard explicativo", "Oferta manual", "Execução assistida", "Validação", "Ledger", "Melhoria contínua"],
};

router.get("/audit-os/status", noStore, (_req, res) => res.json({ success: true, data: { ...status, safetyFlags: auditOsSafetyFlags } }));
router.get("/audit-os/catalog", noStore, (_req, res) => res.json({ success: true, data: { product: status.product, safetyFlags: auditOsSafetyFlags, categories: auditOsCategories, count: auditOsCategories.length } }));
router.get("/audit-os/monetization-ladder", noStore, (_req, res) => res.json({ success: true, data: { product: status.product, safetyFlags: auditOsSafetyFlags, ladder: auditOsMonetizationLadder } }));
router.post("/audit-os/preview", noStore, (req, res) => {
  const body = (req.body ?? {}) as AuditOsPreviewRequest;
  const category = auditOsCategories.find((item) => item.id === body.categoryId) ?? auditOsCategories[0];
  const targetLabel = String(body.targetLabel || "Exemplo manual").slice(0, 120);
  const pain = String(body.pain || category.pain).slice(0, 500);
  const suggestedOffer = auditOsMonetizationLadder[0];
  res.json({ success: true, data: {
    mode: "P0_SAFE_PREVIEW_ONLY", product: "GXEON Audit OS", category, targetLabel, pain,
    diagnosticFrame: ["Clareza da oferta", "Confiança e prova", "CTA e caminho de conversão", "Prioridade de correção manual"],
    dashboardSections: ["Resumo da dor", "Gargalos prováveis", "Plano de ação priorizado", "Oferta manual sugerida", "Limites P0"],
    suggestedOffer,
    copyOnlyOffer: `Diagnóstico GXEON Audit OS para ${targetLabel}: vamos mapear ${pain} e entregar um plano claro do que corrigir primeiro. Modo manual, sem scraping, sem envio automático e sem cobrança pelo sistema.`,
    nextManualAction: body.operatorConfirmedContext ? "Copiar o preview, revisar contexto autorizado e apresentar manualmente a oferta." : "Confirmar manualmente que o operador tem contexto/autorização antes de usar o preview.",
    safetyFlags: auditOsSafetyFlags, externalExecution: "DISABLED", persistence: "LOCAL_IN_MEMORY_RESPONSE_ONLY",
  }});
});
export default router;
