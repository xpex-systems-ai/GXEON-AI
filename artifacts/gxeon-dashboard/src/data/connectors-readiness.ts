export type ConnectorReadinessStatus = "CONNECTED_MANUAL" | "READY_TO_CONNECT" | "LOCKED" | "NEEDS_REVIEW" | "FUTURE";

export type ConnectorReadiness = {
  id: string;
  name: string;
  status: ConnectorReadinessStatus;
  nextAction: string;
  activationRisk: string;
  requiredOperatorAction: string;
  destinationDashboardHint: string;
  buttonLabel: "Abrir checklist" | "Preparar conector" | "Ver status" | "Bloqueado";
};

export const connectorCredentialBoundary = "Credenciais permanecem nos dashboards dos provedores; GXEON não inicia OAuth, não chama APIs e não armazena secrets nesta etapa.";

export const connectorsReadiness: ConnectorReadiness[] = [
  { id: "github", name: "GitHub", status: "READY_TO_CONNECT", nextAction: "Mapear repositório e permissões mínimas.", activationRisk: "Escopo de token excessivo ou branch incorreta.", requiredOperatorAction: "Confirmar repo, branch e política de revisão antes de qualquer sync.", destinationDashboardHint: "GitHub repository settings", buttonLabel: "Abrir checklist" },
  { id: "vercel", name: "Vercel", status: "READY_TO_CONNECT", nextAction: "Validar projeto e ambiente de deploy sem importar secrets.", activationRisk: "Deploy acidental com variáveis ausentes.", requiredOperatorAction: "Conferir projeto, domínio e variáveis diretamente na Vercel.", destinationDashboardHint: "Vercel project dashboard", buttonLabel: "Preparar conector" },
  { id: "railway", name: "Railway", status: "LOCKED", nextAction: "Aguardar autorização de ativação controlada.", activationRisk: "Provisionamento ou mutação de serviço fora da janela.", requiredOperatorAction: "Revisar checklist de serviços antes de conectar.", destinationDashboardHint: "Railway project dashboard", buttonLabel: "Bloqueado" },
  { id: "supabase", name: "Supabase", status: "LOCKED", nextAction: "Manter banco pendente até plano P6.", activationRisk: "Exposição de chaves, migrations ou writes não autorizados.", requiredOperatorAction: "Validar schema, RLS e política de secrets fora do frontend.", destinationDashboardHint: "Supabase project dashboard", buttonLabel: "Bloqueado" },
  { id: "microsoft-365", name: "Microsoft 365", status: "NEEDS_REVIEW", nextAction: "Definir uso permitido de email/calendário.", activationRisk: "Acesso indevido a dados pessoais ou mensagens.", requiredOperatorAction: "Criar política manual-first e consentimento antes de integração.", destinationDashboardHint: "Microsoft admin center", buttonLabel: "Ver status" },
  { id: "workana", name: "Workana", status: "NEEDS_REVIEW", nextAction: "Usar captação manual permitida, sem scraping.", activationRisk: "Violação de termos por automação não autorizada.", requiredOperatorAction: "Registrar leads manualmente com evidência consentida.", destinationDashboardHint: "Workana dashboard", buttonLabel: "Ver status" },
  { id: "99freelas", name: "99Freelas", status: "NEEDS_REVIEW", nextAction: "Preparar roteiro manual de leitura e cadastro.", activationRisk: "Mensagens automatizadas ou coleta indevida.", requiredOperatorAction: "Capturar somente oportunidades revisadas pelo operador.", destinationDashboardHint: "99Freelas dashboard", buttonLabel: "Ver status" },
  { id: "linkedin", name: "LinkedIn", status: "NEEDS_REVIEW", nextAction: "Manter prospecção manual-first.", activationRisk: "Automação de mensagens ou coleta sem autorização.", requiredOperatorAction: "Usar apenas ações humanas e consentidas.", destinationDashboardHint: "LinkedIn account", buttonLabel: "Ver status" },
  { id: "mercado-pago", name: "Mercado Pago", status: "FUTURE", nextAction: "Aguardar ledger real e política financeira.", activationRisk: "Criação indevida de cobranças ou exposição de chaves.", requiredOperatorAction: "Aprovar fluxo financeiro antes de qualquer gateway.", destinationDashboardHint: "Mercado Pago dashboard", buttonLabel: "Bloqueado" },
];
