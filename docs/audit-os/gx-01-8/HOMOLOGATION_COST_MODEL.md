# GX-01.8 — orçamento A e B, sem contratação

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**Estimativas de planejamento, não fatura, cotação de mão de obra ou limite contratual. Nenhuma despesa autorizada.** Reconsulta 25/10: [Vercel pricing](https://vercel.com/pricing) Pro USD 20/mês, crédito de uso 20, assento desenvolvedor 20/mês, viewers ilimitados; [Railway pricing](https://railway.com/pricing) Pro mínimo 20/mês com 20 de uso incluído. Elegibilidade real das contas/planos e descontos: NOT VERIFIED (Railway pede reautenticação). Não assumir plano grátis elegível a atividade empresarial.

Base de cálculo 30 dias=2.592.000 s. Railway: memória 0.00000386 USD/GB/s; CPU 0.00000772 USD/vCPU/s; volume 0.00000006 USD/GB/s; egress 0.05 USD/GB; objectstorage para backup 0.015 USD/GB/mês. DB compõe RAM/CPU/volume totais; não somar outro servidor PG já incluído. Fórmula: Railway=max(20, RAM*s*mem+CPU*s*cpu+volume*s*vol+egress*0.05)+backup GB*0.015. Créditos não são cobrados duas vezes. Proposta de um assento Vercel editor; revisor GitHub/read-only não implica segundo desenvolvedor Vercel. Se necessário segundo editor, acrescer 20 e reaprovar.

Orçamento A — **somente homologação Audit OS**:

| Cenário | RAM GB /CPU média vCPU | Volume/egress/backup GB | Reserva USD | Infra 30 dias USD | Humanos USD | Total antes de câmbio/impostos USD |
| --- | --- | --- | --- | --- | --- | --- |
| mínimo | 1/0.1 | 5/5/1 | 5.00 | 45.02 | 365.00 | 410.02 |
| base | 2/0.25 | 10/20/5 | 10.00 | 57.64 | 755.00 | 812.64 |
| acima do previsto | 4/0.5 | 20/100/20 | 15.00 | 93.44 | 1270.00 | 1363.44 |

CPU é média hipotética, não limite de provisionamento; RAM é sizing total API+PG proposto. Logs de 30 dias utilizam recursos previstos e reserva operacional, sem cotação de sink separado. Backup remoto, localização/criptografia e tarifas precisam de confirmação; usar objectstorage é hipótese de custo, não serviço criado. Reserva não é produto de monitoramento contratado. Sem HA/PITR/plantão; se exigidos, recotar.

Mão de obra ilustrativa: operações/suporte/rollback 25 USD/h, revisor independente 60/h, jurídico 50/h, apenas parâmetros internos não aprovados. Horas A mínimo:2/1/4/1/0; base 4/2/8/2/1; alto 8/4/12/4/2 (ops/suporte/review/jurídico/rollback). Revisão independente não foi contratada. Taxa real pode diferir; horas/cotação/entidade contratante devem ser aprovadas. Modelo integral reproduzível: [cost-model.json](evidence/cost-model.json).

A faixa histórica 40–70 USD refere-se a tecnologia limitada, sem garantia/cap e sem humanos/impostos. O cenário A alto agora projeta 93.44 USD só tecnologia/reserva, acima de 70; deve motivar nova decisão ANTES de gasto. Total base com humanos 812.64 USD é planejamento, não valor cobrado ao cliente.

Orçamento B — **futuro OMNIX Commerce, aprovação separada**:

| Cenário | RAM GB /CPU média vCPU | Volume/egress/backup GB | Reserva USD | Infra 30 dias USD | Humanos USD | Total antes de câmbio/impostos USD |
| --- | --- | --- | --- | --- | --- | --- |
| mínimo | 2/0.3 | 20/100/20 | 15.00 | 69.42 | 905.00 | 974.42 |
| base | 4/0.75 | 50/300/50 | 25.00 | 123.55 | 1910.00 | 2033.55 |
| acima do previsto | 8/2 | 100/1000/100 | 50.00 | 257.11 | 3340.00 | 3597.11 |

Hipótese de trabalho B:5 organizações×50 itens×4 execuções=1.000 inspeções/mês, não usuários/clientes existentes. Quatro chamadas por inspeção seriam 4.000 antes de paginação/retries; quotas/custos reais API não verificados. Sizing dos cenários é hipótese, não benchmark por inspeção. Horas B min 4/4/8/4/1; base 12/8/16/8/2; alto 24/16/24/16/4. Inclui mais revisão, suporte, jurídico e rollback, sem promessa de escala. IA externa desligada por padrão; custo não incluído enquanto política/modelo/provider não forem aprovados. Se liberada, acrescentar tokens IN*preço IN+tokens OUT*preço OUT por execução e repetir orçamento/política antes de uso. Não contratar fornecedor.

Câmbio/impostos/IOF/fees: NOT VERIFIED, nenhum percentual inventado. Fórmula BRL=total USD×FX aprovado+taxas/impostos aplicáveis. Owner/jurídico/contábil definem país de cobrança, fonte/data de FX, impostos e margem. Reserva cambial deve ser explícita; totais acima não são finais em BRL.

Controle proposto para A: owner acompanha diariamente consumo, um monitor designado registra projeção 30 dias; alertas humanos em 50/75/90% do limite escolhido e em aumento de ritmo. Antes de projetar ultrapassagem, suspender novos testes/intake, preservar evidências/volume, avisar owner para reduzir recursos autorizados ou aprovar novo limite. Não presumir hard cap ou que desligar API elimina storage/assentos. Sem exclusão automática de banco/dump. Quando a janela expirar: owner decide retenção/encerramento explícito. Nenhuma regra/alerta foi ativada no provedor. [Formulário](BUDGET_APPROVAL_FORM.md).
