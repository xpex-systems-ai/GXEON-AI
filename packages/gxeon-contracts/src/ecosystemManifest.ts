export const GXEON_PRODUCT_KEYS = ["gxeon_os", "audit_os", "proposal_engine", "revenue_ledger", "agent_economy", "marketplace", "academy", "connector_hub", "saas", "consulting_os", "store_brasil", "web3_tasks", "ai_portfolio"] as const;
export type GxeonProductKey = (typeof GXEON_PRODUCT_KEYS)[number];
export type GxeonModuleStatus = "active" | "planned" | "future" | "lab" | "commercial_priority" | "official_core";
export const gxeonEcosystemManifest = {
  "mission": "MISSION_GXEON_OS_REPOSITORY_MASTER_STRUCTURE",
  "repositoryIdentity": "GXEON OS monorepo / operating ecosystem",
  "generatedFor": "Junior Sena",
  "safetyDefaults": {
    "manualFirst": true,
    "previewFirst": true,
    "productionWrites": false,
    "migrationsRun": false,
    "secretLogging": false,
    "fakeRevenue": false,
    "fakeClients": false,
    "connectorWrites": false
  },
  "products": [
    {
      "key": "gxeon_os",
      "name": "GXEON OS",
      "type": "core_system",
      "status": "official_core",
      "purpose": "Sistema operacional central para captar sinais, organizar oportunidades, executar com segurança, validar entregas, registrar evidências, monetizar e escalar.",
      "dependencies": [],
      "monetizationStage": "P0 foundation",
      "safetyLevel": "internal_safe",
      "nextMission": "Formalizar o repositório-mãe e contratos base."
    },
    {
      "key": "audit_os",
      "name": "GXEON Audit OS",
      "type": "official_product",
      "status": "active",
      "purpose": "Auditoria de sites, sistemas, GitHub, deploys, APIs, bancos, funis e ativos digitais.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "active_p0_p1",
      "safetyLevel": "read_only_preview",
      "nextMission": "MISSION_007_AUDIT_OS_PROPOSAL_AND_OFFER"
    },
    {
      "key": "proposal_engine",
      "name": "GXEON Proposal Engine",
      "type": "official_module",
      "status": "planned",
      "purpose": "Transformar achados, relatórios e oportunidades em propostas comerciais, pacotes, mensagens e ofertas.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "next_official_module",
      "safetyLevel": "preview_only",
      "nextMission": "Criar previews de propostas a partir de relatórios Audit OS."
    },
    {
      "key": "revenue_ledger",
      "name": "GXEON Revenue Ledger",
      "type": "official_module",
      "status": "planned",
      "purpose": "Controlar receita prevista, proposta, aceita, confirmada manualmente, verificada por provedor e perdida.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "manual_confirmation",
      "safetyLevel": "manual_first",
      "nextMission": "Criar ledger sem receitas falsas e sem provedores ativos."
    },
    {
      "key": "agent_economy",
      "name": "GXEON Agent Economy",
      "type": "future_platform",
      "status": "future",
      "purpose": "Gerenciar agentes especializados, permissões, missões, resultados, custos, reputação e contribuição para receita.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "future",
      "safetyLevel": "restricted",
      "nextMission": "Modelar permissões, reputação e custos por agente."
    },
    {
      "key": "marketplace",
      "name": "GXEON Marketplace",
      "type": "future_platform",
      "status": "future",
      "purpose": "Loja de agentes, templates, playbooks, prompts, fluxos, pacotes e automações.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "future",
      "safetyLevel": "restricted",
      "nextMission": "Definir catálogo inicial sem checkout ou publicação externa."
    },
    {
      "key": "academy",
      "name": "GXEON Academy",
      "type": "commercial_content",
      "status": "planned",
      "purpose": "Cursos, tutoriais, ebooks, treinamentos e documentação educacional do método GXEON.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "content_monetization",
      "safetyLevel": "preview_only",
      "nextMission": "Organizar trilhas e templates educacionais."
    },
    {
      "key": "connector_hub",
      "name": "GXEON Connector Hub",
      "type": "infrastructure_module",
      "status": "planned",
      "purpose": "Central segura de conectores: GitHub, Supabase, Railway, Vercel, Mercado Pago, Mercado Livre, OpenAI, Google, Microsoft e outros.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "enablement",
      "safetyLevel": "read_only_by_default",
      "nextMission": "Criar matriz de conectores com escopos explícitos."
    },
    {
      "key": "saas",
      "name": "GXEON SaaS",
      "type": "future_business_model",
      "status": "future",
      "purpose": "Transformar o GXEON em produto de assinatura para operadores, freelancers, agências e empresas.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "future",
      "safetyLevel": "restricted",
      "nextMission": "Mapear tenancy, billing manual-first e limites SaaS."
    },
    {
      "key": "consulting_os",
      "name": "GXEON Consulting OS",
      "type": "commercial_service",
      "status": "commercial_priority",
      "purpose": "Pacotes de consultoria, implantação, automação e organização operacional com IA.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "commercial_priority",
      "safetyLevel": "manual_first",
      "nextMission": "Criar pacotes comerciais revisados manualmente."
    },
    {
      "key": "store_brasil",
      "name": "GXEON Store Brasil",
      "type": "vertical_lab",
      "status": "lab",
      "purpose": "Vertical de loja/afiliados para Brasil, Copa, Mercado Livre, produtos e campanhas comerciais.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "lab",
      "safetyLevel": "no_external_calls",
      "nextMission": "Definir laboratório sem scraping, webhook ou afiliado ativo."
    },
    {
      "key": "web3_tasks",
      "name": "GXEON Web3 Tasks",
      "type": "opportunity_lab",
      "status": "lab",
      "purpose": "Radar de tarefas, bounties, quests, airdrops, hackathons e recompensas Web3.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "lab",
      "safetyLevel": "read_only_research",
      "nextMission": "Definir radar manual sem wallet automation."
    },
    {
      "key": "ai_portfolio",
      "name": "GXEON AI Portfolio",
      "type": "commercial_asset",
      "status": "commercial_priority",
      "purpose": "Portfólio vivo dos sistemas, cases, demos, prints, automações e serviços do operador.",
      "dependencies": [
        "gxeon_os"
      ],
      "monetizationStage": "commercial_priority",
      "safetyLevel": "manual_first",
      "nextMission": "Criar vitrine de cases reais e evidências aprovadas."
    }
  ]
} as const;
