# GX-01.7 — dois orçamentos separados

DOCUMENTADO, sem autorização de gasto. Preços públicos consultados24/10/2026: [Vercel](https://vercel.com/pricing) ProUSD20/mês com condições/crédito de uso; [Railway](https://railway.com/pricing) Pro mínimoUSD20/mês comUSD20de uso incluído. Não somar mínimo+mesmo uso duas vezes. Impostos/câmbio/conta/seats e fatura real NOT VERIFIED. Recursos e preços podem mudar; revalidar na aprovação.

**A — Audit OS homologação limitada.** Envelope anteriorUSD40–70/30dias: um editorfrontend20+Railwaymínimo20 e reserva até30 para consumo/backup/egress/observação. É estimativa de ambiente pequeno comfixtures, não planoenterprise/multiempresa nem hardcap do provedor. Cap alvo70 requer alertas/stop por humano, não garante ausência de overage. Infra privada/TLS/retention e reviewer ainda sem aprovação. Custo humano/revisão/jurídico fora do envelopeA.

**B — OMNIX Commerce futuro.** Exemplo HIPOTÉTICO de planejamento, não medição/quote:5org×50 itens×4execuções/mês=1000inspeções; hipótese4GET/item=4000calls antes de paginação/retries. API/escopos/limites oficiais não homologados; o volume pode mudar. Não houve execução nem cliente.

| Item B / fórmula para30dias=2592000seg | USD/mês ilustrativo | Natureza |
|---|---:|---|
| Railway2GB RAM×0.00000386/GB/s |20.01 |uso variável assumido |
|0.25vCPU×0.00000772/vCPU/s |5.00 |uso variável assumido |
|volume10GB×0.00000006/GB/s |1.56 |uso variável assumido |
|egress20GB×0.05/GB |1.00 |uso variável assumido |
|Railway subtotal max(20,uso27.57) |27.57 |não adicionar mínimo20 novamente |
|Vercel um editor base |20.00 |base pública sujeita a consumo/conta |
|Identidade/vault |30.00 |RESERVA interna, sem fornecedor/quote selecionado |
|Logs/observabilidade |20.00 |RESERVA interna, não serviço contratado |
|CI |10.00 |RESERVA, pode estar incluso ou variar |
|backupobjeto5GB×0.015/GB/mês |0.075 |preço público, egress/requests/retenção extra |
|Subtotal técnico aproximado |107.65 |exemplo, antes de impostos/câmbio |

Custos humanos ilustrativos:8hoperações/suporte×USD30/h=240;4hrevisão×USD40/h=160; somando exemplo técnico≈507.65/mês **antes de impostos, desenvolvimento, jurídico e IA**. Essas taxas são entradas hipotéticas de cálculo, não preços de mercado/salários/contratos. Desenvolvimento inicial40–80h×Rdev, jurídicoRlegal, onboardingH×R e respostaaincidentes devem ser orçados separadamente; semtaxa definida=UNKNOWN, nãozero.

IA externa **desligada por padrão**, políticaML pendente; modelo não escolhido. Se futuramente permitida, custo porrun=(Tin/1M)×Pin+(Tout/1M)×Pout+armazenamento/retries, limites pororg e teto de gasto; preços/modelo/política não definidos. Não embutirIA grátis por suposição. Margem=(preço líquido−infra incremental−humano−revisão−suporte−impostos−risco); preço/margem/receita reais desconhecidos.

Sensibilidade: organizações/itens/execuções/retries/retention aumentam dados/CPU/suporte; seats eprojetos adicionamfixos; contrato enterprise/jurídico/transferências podem mudar desenho. Para aprovarB exigir estimativa porcenário, proprietário, moeda/impostos, consumo observado em piloto autorizado, alertas, quotas, plano de parada e custo total humano. AprovaçãoA não aprovaB. Nenhum recurso pago foi provisionado e nenhuma cobrança foi ativada.
