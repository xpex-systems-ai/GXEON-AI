# GX-01.6 — orçamento proposto, sem contratação

**BLOCKED — AUTHORIZATION REQUIRED.** Preços públicos consultados em 24/10/2026, USD, impostos/câmbio não calculados. Nenhum custo da conta foi conferido; nenhuma despesa nova autorizada. Consulta de inventário não prova fatura zero.

| Categoria | Preço público | Estimativa de homologação (hipótese) | Custo confirmado / ação |
|---|---|---|---|
| Frontend Vercel Pro | US$20/mês com crédito de uso20; seats adicionais dependem da conta | US$20, um responsável editor; sem funções/IA adicionais | NOT VERIFIED; não ativar |
| API + PG17 Railway Pro | Mínimo US$20 inclui20 de consumo; excedente medido | Memória total API0.5+PG0.5GB ~US$10/30dias; CPU média conjunta0.1vCPU ~US$2; volume5GB ~US$0.78; egress10GB ~US$0.50; inferior ao mínimo20 se hipóteses se mantiverem | NOT VERIFIED; não provisionar |
| Backups/dumps | Object storage Railway US$0.015/GB-mês, preços de egress/operacional dependem do desenho | 1GB ~US$0.02; reserva de operação/duplicação no envelope, sem provisionar bucket | NOT VERIFIED; não criar |
| Logs | Railway Pro anuncia30dias; opção/exportação extra pode cobrar | Somente logs sanitizados, sem observabilidade paga extra | NOT VERIFIED; retenção real precisa homologação |
| Assentos, domínio, suporte, revisão | Railway Pro seats incluídos; demais itens exigem proposta | Um editor frontend; DNS/domínio atual não alterado; revisão humana fora da infra | NOT VERIFIED; nenhum terceiro contratado |

Fontes: [Vercel](https://vercel.com/pricing), [Railway](https://railway.com/pricing). Fórmula ilustrativa de consumo Railway: segundos de30dias×(GB×0.00000386 + vCPU×0.00000772 + GBvolume×0.00000006) + GBegress×0.05. Cobrança Pro é max(20, consumo), não20+consumo quando este está dentro do crédito. Não somar API e banco com dois mínimos se no mesmo workspace elegível; validar conta/termos primeiro.

Faixa de planejamento **US$40–70/mês**, condicionada a um editor e consumo baixo. Não é teto contratual, cotação ou despesa confirmada. Reserva não comprova backup contratado. Limite operacional proposto para decisão: **US$70 por30dias**, alertas humanos em40 e55, parar admissão de novos casos e solicitar decisão antes de atingir70; não há hard cap automático comprovado. Sem garantias de provider para cessar custo instantaneamente, owner deve aprovar mecanismo de controle antes de provisionar.

Mínimo viável: um frontend dedicado, uma API/réplica com gates disabled inicialmente, PG17 com5GB persistentes privados e restore ensaiado em banco novo, sem IA paga/túneis/serviços financeiros. Homologação primeiro só TEST DATA. Período e nomes de contas/projetos devem ser aprovados. Custos de horas humanas, revisão, impostos, câmbio e suporte excluídos da faixa e exigem estimativa separada.

Formulário a preencher pelo proprietário: conta/scope/projectIds ___; titularidade/permissões ___; plano/região ___; período ___; teto e mecanismo ___; alertas/responsável ___; ação ao atingir limite ___; preço de revisão/suporte ___; autorização nominal/data ___ . Nenhuma contratação ou cobrança foi efetuada.
