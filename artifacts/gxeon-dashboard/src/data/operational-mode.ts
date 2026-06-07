export const operationalMode = {
  activeMode: "PRIVATE_OPERATOR_QG",
  dataMode: "REAL_DATA_PENDING",
  connectorMode: "CONTROLLED_ACTIVATION",
  noSecretsBoundary: "Credenciais permanecem nos dashboards dos provedores; o frontend não recebe secrets, tokens, URLs privadas ou chaves de serviço.",
} as const;

export const operationalEmptyStates = {
  opportunities: {
    title: "aguardando primeira oportunidade real",
    description: "Nenhuma oportunidade validada por operador foi registrada ainda.",
    nextManualAction: "Captar lead por canal permitido, qualificar manualmente e registrar a primeira oportunidade real.",
    previousRoute: "/radar-x",
    nextRoute: "/ops/tasks",
  },
  tasks: {
    title: "nenhuma tarefa operacional criada ainda",
    description: "A fila P1 permanece vazia até uma oportunidade real virar escopo executável.",
    nextManualAction: "Converter a primeira oportunidade real em tarefa com dono, prazo e evidência mínima.",
    previousRoute: "/ops/opportunities",
    nextRoute: "/ops/execution",
  },
  executions: {
    title: "nenhuma execução real em andamento",
    description: "O tracker P2 aguarda uma tarefa operacional autorizada para entrega.",
    nextManualAction: "Iniciar execução somente após escopo manual aprovado e checklist de segurança revisado.",
    previousRoute: "/ops/tasks",
    nextRoute: "/ops/validation",
  },
  validations: {
    title: "nenhuma entrega real aguardando validação",
    description: "A validação P3 será preenchida quando uma execução real produzir evidências revisáveis.",
    nextManualAction: "Anexar critérios e evidências da primeira entrega real antes de liberar cobrança.",
    previousRoute: "/ops/execution",
    nextRoute: "/ops/release",
  },
  releases: {
    title: "nenhum release financeiro pronto ainda",
    description: "O gate P4 permanece travado até validação real aprovada pelo operador.",
    nextManualAction: "Revisar evidências, escopo e autorização humana antes de qualquer follow-up financeiro externo.",
    previousRoute: "/ops/validation",
    nextRoute: "/ops/ledger",
  },
  ledger: {
    title: "nenhum lançamento financeiro real registrado ainda",
    description: "O ledger P5 inicia zerado e não representa recebíveis, notas, faturas ou transações.",
    nextManualAction: "Registrar manualmente somente após confirmação financeira real fora do GXEON.",
    previousRoute: "/ops/release",
    nextRoute: "/ops/monetization",
  },
} as const;

export const firstRevenueActionSequence = [
  "captar lead",
  "criar proposta",
  "registrar oportunidade",
  "executar entrega",
  "validar evidência",
  "autorizar release",
  "registrar recebimento",
] as const;

export const operationalStatusCards = [
  { label: "Modo Operacional Privado", value: "QG Privado" },
  { label: "Dados", value: "aguardando registros reais" },
  { label: "Conectores", value: "ativação controlada" },
  { label: "Receita", value: "primeira receita pendente" },
] as const;
