# GXEON Knowledge Architecture

## Fontes de verdade

- **GitHub:** technical source of truth para código, ADRs, issues, PRs e histórico de engenharia.
- **Microsoft 365:** corporate document layer para documentos, apresentações, email, calendário e operação humana.
- **Supabase:** operational memory para eventos, evidências, storage, ledger e dados de execução.
- **GXEON OS:** dashboard and execution layer para orquestração, visualização, agentes e governança.

## Knowledge tree structure

```text
GXEON Knowledge
├── 00_Mission_Control
│   ├── README.md
│   ├── roadmap
│   └── operational_status
├── 01_Engineering_Source_of_Truth
│   ├── GitHub repositories
│   ├── pull requests
│   ├── issues
│   ├── ADRs
│   └── release notes
├── 02_Corporate_Document_Layer
│   ├── Microsoft 365 documents
│   ├── presentations
│   ├── email context
│   └── calendar decisions
├── 03_Operational_Memory
│   ├── Supabase events
│   ├── task state
│   ├── execution logs
│   └── dashboard snapshots
├── 04_Evidence_Memory
│   ├── validation artifacts
│   ├── screenshots without secrets
│   ├── delivery proofs
│   └── incident records
├── 05_Agent_Memory
│   ├── Home Center Agents missions
│   ├── permissions
│   ├── proposals
│   └── approval history
└── 06_Monetization_Memory
    ├── offers
    ├── checkout readiness
    ├── webhook events
    ├── ledger entries
    └── delivery outcomes
```

## Governança

Conhecimento precisa ser localizável, versionado e classificado. Intenção pertence a documentos e issues; execução pertence a tasks e evidências; credenciais não pertencem a nenhuma documentação commitada.
