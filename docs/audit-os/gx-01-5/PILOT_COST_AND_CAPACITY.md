# Custos e capacidade — proposta sem contratação

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

Consulta pública21/10/2026; USD, sem imposto/câmbio. **Custo efetivamente confirmado na conta: NÃO VERIFICADO.** Nenhuma assinatura/cartão/recurso pago foi criado. Faixa histórica40–70não é teto.

| Item | Preço publicado / fonte | Estimativa e condição |
| --- | --- | --- |
| Vercel Pro | US$20/mês por developer seat;20crédito de uso; [preços](https://vercel.com/pricing) | 1assento:20; 2assentos:40; excedentes/observabilidade/proteção paga separados |
| Vercel Hobby | uso pessoal não comercial; [política](https://vercel.com/docs/plans/hobby) | não usar como premissa de piloto comercial |
| Railway Pro | mínimo20com20de uso; assentos incluídos/log30dias; [preços](https://railway.com/pricing) | max(20, uso dos serviços), não somar20+uso integral |
| Railway Hobby | mínimo5com5de uso; workspace individual/log7dias; [planos](https://docs.railway.com/pricing/plans) | mais barato em tese; adequação comercial/governança não confirmada para esta empresa, não recomendado sem confirmação |
| RAM/CPU Railway | US$0.00000386/GB/s e0.00000772/vCPU/s; [preços](https://railway.com/pricing) | mês30dias: ~10/GB e20/vCPU; consumo médio, não limite provisionado |
| Volume/tráfego Railway |0.00000006/GB/s (~0.1555/GB-mês), egress0.05/GB; [preços](https://railway.com/pricing) |1GB +1GBegress ~0.21; PG usa recursos normais, não segundo plano implícito |
| Backups/logs/builds | storage, retenção, overage e CI precisam cotação conforme conta | reservar margem5–30; não supor grátis/cobertura de crédito; sem addon ativado |

Premissa mínima:1frontend estático,1API e1PG; média conjunta1GiBRAM+0.1vCPU por30dias →~10+2+0.21=12.21usoRailway, coberto pelo mínimo20. Vercel1assento20 → **base estimada40/mês**. Revisão com2developer seats pode elevar base60; workspace/assento existentes podem mudar custo incremental, não verificados. Proposta prudente40–70para1assento e uso pequeno, **sem garantia de teto**; backups, picos, retenção, build/CI e impostos podem superar. Não contratar Hobby baseado somente nessa comparação; Pro é baseline conservador comercial da proposta. Não há custo zero confirmado na conta.

Capacidade proposta, não medida:1operador interno,1revisor designado, até20casos/dia, arquivo sanitizado<=24KiB dentro de payload32KiB, sem uploads binários, sem varredura externa/LLM. Uma réplica; pool4/role8; sem autorunners/financeiro. Medir CPU/RAM/latência p95/erros/disco/bytes por caso em teste sintético autorizado antes de dimensionar. Alertas propostos50/80/100% do orçamento aprovado, verificação diária e pausa manual de novas escritas ao exceder; não presumir spending cap aplicado ou que limite de RAM seja SLA. Despesas reais e permissões da conta permanecem gate humano.
