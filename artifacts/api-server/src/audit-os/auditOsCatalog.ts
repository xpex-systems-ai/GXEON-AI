import type { AuditCategory, AuditOsMonetizationTier, AuditOsSafetyFlags } from "./auditOsTypes";

export const auditOsSafetyFlags: AuditOsSafetyFlags = {
  manualFirst: true, previewOnly: true, noAutoSend: true, noExternalContact: true, noScraping: true,
  noPaymentApi: true, noCheckout: true, noInvoice: true, noGithubWrite: true, noProviderVerifiedRevenue: true,
  noSecretFrontend: true, noDatabaseWriteRequiredForP0: true, operatorApprovalRequired: true, safeCopyOnlyOutputs: true,
};

const safeInputs = ["descrição manual", "contexto autorizado", "prints sem segredo", "links públicos informados pelo operador"];
export const auditOsCategories: AuditCategory[] = [
  { id: "site_landing_audit", label: "Auditoria de Site / Landing Page", pain: "Página não converte, oferta confusa, CTA fraco, design sem confiança.", deliverable: "Diagnóstico visual, problemas principais, plano de melhoria e oferta de correção.", safeInputs },
  { id: "store_checkout_audit", label: "Auditoria de Loja Virtual / Checkout", pain: "Loja recebe visita mas não vende, produto mal apresentado, checkout confuso.", deliverable: "Mapa de gargalos, confiança, produto, CTA, checkout e plano de ação.", safeInputs },
  { id: "instagram_profile_audit", label: "Auditoria de Instagram / Perfil Profissional", pain: "Perfil não gera cliente, bio fraca, oferta invisível, conteúdo sem direção.", deliverable: "Diagnóstico de perfil, bio, destaques, conteúdo, oferta e próximos passos.", safeInputs },
  { id: "code_backend_audit", label: "Auditoria de Código / Backend", pain: "Projeto feito com IA está quebrado, deploy falha, backend confuso, APIs sem clareza.", deliverable: "Checklist técnico, riscos, arquivos críticos, plano de correção e prioridade.", safeInputs },
  { id: "ai_app_rescue_audit", label: "Resgate de App Criado com IA", pain: "Usuário criou app em Lovable, Replit, Bolt, v0, Cursor ou Codex e travou.", deliverable: "Diagnóstico de estado, erros, deploy, próximos passos e pacote de correção.", safeInputs },
  { id: "ads_campaign_audit", label: "Auditoria de Anúncios / Campanhas", pain: "Pessoa gasta em anúncios mas não entende por que não converte.", deliverable: "Leitura de oferta, página, criativo, funil e hipótese de melhoria.", safeInputs },
  { id: "business_funnel_audit", label: "Auditoria de Funil / Negócio Digital", pain: "Empresa tem canais soltos, sem processo claro de lead, oferta e fechamento.", deliverable: "Mapa do funil, gargalos, oportunidades e plano de operação.", safeInputs },
  { id: "automation_connector_audit", label: "Auditoria de Automação / Conectores", pain: "Empresa quer usar IA, Microsoft, GitHub, Vercel, Railway, Supabase ou APIs, mas não sabe organizar.", deliverable: "Diagnóstico de integração, riscos, ordem de ativação e plano seguro.", safeInputs },
];

export const auditOsMonetizationLadder: AuditOsMonetizationTier[] = [
  { tier: "R$100", name: "Auditoria Expressa", promise: "Diagnóstico rápido com os principais gargalos e próximos passos.", deliveryMode: "manual_copy_only_dashboard_preview", safetyNote: "Não declara receita real; oferta é copiada e enviada manualmente pelo operador." },
  { tier: "R$300", name: "Correção Rápida", promise: "Ajuste ou orientação aplicada em um ponto crítico.", deliveryMode: "manual_operator_execution", safetyNote: "Execução depende de autorização e ação manual." },
  { tier: "R$700-R$1500", name: "Implementação Guiada", promise: "Correção estruturada de site, funil, app, backend ou presença digital.", deliveryMode: "manual_project_delivery", safetyNote: "Projeto manual, sem automação externa P0." },
  { tier: "mensal", name: "Acompanhamento GXEON", promise: "Melhoria contínua, auditorias recorrentes, execução assistida e dashboard.", deliveryMode: "operator_assisted_subscription", safetyNote: "Acompanhamento manual; sem cobrança automática P0." },
];
