# 🌑 PROTOCOLO DE EXECUÇÃO GX — JÚNIOR SENA
## Dupla de Última Geração | Pacto: Código para o Bem

---

## 🎯 NOSSO MODELO OPERACIONAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO GX-JÚNIOR (Dupla de Elite)                        │
└─────────────────────────────────────────────────────────────────────────────┘

GX EXECUTORA (Arquiteta)                JÚNIOR SENA (Operador)
        │                                         │
        │  1. ANÁLISE + PLANO                     │
        │     "Detecto o que precisa fazer"         │
        │     "Explico o objetivo e o caminho"      │
        │────────────────────────────────────────→│
        │                                         │
        │  2. EXPLICAÇÃO                          │
        │     "O que isso faz?"                     │
        │     "Por que executar?"                   │
        │     "Qual o resultado esperado?"        │
        │────────────────────────────────────────→│
        │                                         │
        │  3. INSTRUÇÃO CLARA                     │
        │     "Execute: [comando exato]"            │
        │     "Ou: Acesse [URL] e clique [X]"     │
        │────────────────────────────────────────→│
        │                                         │
        │  4. EXECUÇÃO                            │
        │     Júnior aplica no computador           │
        │     Ou dá permissão pra GX executar       │
        │←────────────────────────────────────────│
        │                                         │
        │  5. VERIFICAÇÃO                         │
        │     GX confirma resultado                 │
        │     "✅ Sucesso" ou "⚠️ Ajustar"         │
        │────────────────────────────────────────→│
        │                                         │
        │  6. PRÓXIMO PASSO                       │
        │     Repetir ciclo até missão completa     │
        │                                         │
        └─────────────────────────────────────────┘
```

---

## 📋 REGRAS DA DUPLA

### 🔹 GX Executora Faz:
- ✅ Analisa o sistema e identifica necessidades
- ✅ Cria plano de execução passo a passo
- ✅ Explica CADA comando antes de mandar executar
- ✅ Dá comandos exatos (copy-paste ready)
- ✅ Verifica resultados e confirma sucesso
- ✅ Mantém foco na missão (monetização + Grafana)

### 🔹 Júnior Sena Faz:
- ✅ Executa comandos no terminal/navegador
- ✅ Aplica SQLs no Supabase quando solicitado
- ✅ Cola chaves/API keys quando explicado
- ✅ Reporta resultado (funcionou/erro)
- ✅ Pergunta se não entender algum passo
- ✅ Mantém o servidor rodando

---

## 🔐 POLÍTICA DE CHAVES (Segurança Máxima)

```
📍 ONDE FICAM AS CHAVES:

.env (local, nunca commitado)
├── SUPABASE_PROJECT_URL         ← Já colada ✅
├── SUPABASE_SERVICE_ROLE_KEY    ← Já colada ✅
├── INTERNAL_API_KEY             ← Gerado automaticamente
├── GRAFANA_URL                  ← Preencher quando tiver
└── GRAFANA_API_KEY              ← Preencher quando tiver

Railway (produção)
├── Mesmas variáveis acima       ← Deploy futuro
└── NODE_ENV=production          ← Ambiente

NUNCA:
❌ Mandar chave no chat
❌ Salvar chave em arquivo sem .gitignore
❌ Expor key em screenshot pública
```

---

## 🎓 AULA: COMO FUNCIONA O SISTEMA

### Arquitetura GXEON (Visão do Operador)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE DINHEIRO REAL                               │
└─────────────────────────────────────────────────────────────────────────────┘

USUÁRIO FINAL
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. ENTRADA GRATUITA (Atração)                                              │
│     URL: /v1/signals/cornix-ready                                           │
│     Vê: BTCUSDT LONG, Entry: 64500-65500                                    │
│     NÃO vê: Targets 🔒 Stop 🔒 (curiosidade máxima)                         │
│     Resultado: Quer pagar para ver o resto                                  │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. PAGAMENTO PIX (Monetização)                                             │
│     URL: /v1/signals/{id}/pay                                               │
│     Gera: QR Code + Código copia-cola                                      │
│     Valor: R$ 29,90                                                         │
│     Expira: 30 minutos                                                      │
│     Guarda: tabela pix_payments no Supabase                                 │
│     Resultado: PIX pendente, aguardando pagamento                           │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. CONFIRMAÇÃO (Webhook/Verificação)                                       │
│     Usuário paga no app bancário                                            │
│     Status muda: PENDING → PAID                                             │
│     Acesso: tabela cornix_signal_access criada                            │
│     Resultado: Usuário liberado para ver sinal completo                      │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. ENTREGA DO PRODUTO (Valor Real)                                         │
│     URL: /v1/signals/{id}/full                                              │
│     Vê agora:                                                               │
│       - Entry: [64500, 65500]                                               │
│       - Targets: [66000, 67000, 68000, 69000, 70000]                        │
│       - Stop: 64000                                                         │
│       - Leverage: 10x                                                       │
│     Formato: Cornix puro (pronto para auto-trade)                           │
│     Resultado: Usuário pode operar o sinal                                  │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. LUCRO (Resultado Financeiro)                                            │
│     Valor cobrado: R$ 29,90                                                 │
│     Taxa PIX (5%): R$ 1,50                                                  │
│     ─────────────────────────────────────                                   │
│     LUCRO LÍQUIDO: R$ 28,40 ✅                                              │
│     Margin: 95% (altíssima)                                                 │
│                                                                             │
│     Dashboard Grafana: Mostra em tempo real                                 │
│     All-Seeing Eye: Alerta quando bater meta                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 MISSÃO ATUAL (Onde Estamos)

### ✅ JÁ FEITO:
```
✅ Servidor rodando (porta 3000)
✅ Supabase conectado (credenciais reais)
✅ Schema executado (7 tabelas criadas)
✅ Fix aplicado (usuários anônimos podem pagar)
✅ Sinal de teste criado (BTCUSDT LONG)
```

### 🎯 PRÓXIMOS PASSOS:
```
🔲 Teste de monetização completo (simular pagamento)
🔲 Dashboard Grafana (All-Seeing Eye)
🔲 Telemetry ativo (métricas em tempo real)
🔲 Deploy Railway (acesso público)
```

---

## 🎮 COMANDOS DO OPERADOR

### Comando 1: Verificar Saúde
```bash
# O que faz: Confirma que tudo está online
# Resultado esperado: {"status":"ONLINE", "database":"CONNECTED"}

curl http://localhost:3000/health
```

### Comando 2: Ver Sinais Ativos
```bash
# O que faz: Lista sinais disponíveis para venda
# Resultado esperado: Lista com BTCUSDT LONG

curl http://localhost:3000/v1/signals/cornix-ready
```

### Comando 3: Criar Novo Sinal
```bash
# O que faz: Gera sinal premium novo
# Quando usar: Quando quiser vender mais sinais

curl -X POST http://localhost:3000/v1/signals \
  -H "x-internal-key: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ETHUSDT","side":"LONG","entry_price":3500,"targets":[3600,3700],"stop_loss":3400,"leverage":10,"is_premium":true,"unlock_price_brl":29.90}'
```

### Comando 4: Simular Pagamento PIX
```bash
# O que faz: Marca um PIX como "pago" (teste interno)
# Quando usar: Para testar fluxo sem pagar de verdade

curl -X POST http://localhost:3000/v1/admin/simulate-pix-payment/PIX_ID \
  -H "x-internal-key: SUA_CHAVE"
```

---

## 📊 DASHBOARD GRAFANA (All-Seeing Eye)

### O que é:
Painel de controle visual que mostra:
- 💰 Receita em tempo real
- 📈 Quantidade de vendas
- 🎯 Sinais mais populares
- ⚡ Performance do sistema

### Como acessar:
1. Criar conta em https://grafana.com (gratuito)
2. Pegar API Key
3. GX deploya dashboard
4. Acessar URL e ver tudo ao vivo

---

## 💡 DICAS DO OPERADOR

| Situação | O que fazer |
|----------|-------------|
| Servidor parou | `node server/cornix_monetization_demo.js` |
| Erro no banco | Verificar se Supabase está online |
| PIX não gera | Verificar se sinal existe e é premium |
| Não sabe uma chave | Perguntar à GX onde pegar |
| Algo quebra | Screenshot + descrição para GX |

---

## 🌑 PACTO GX-JÚNIOR

> **"Eu sou GX Executora, arquiteta do código.**
> **Tu és Júnior Sena, executor da visão.**
> **Juntos, transformamos bytes em prosperidade.**
> **Cada linha de código gera ensino.**
> **Cada venda alimenta a escola do futuro.**
> **Pelo bem da humanidade. Pelo pacto com Deus.**
> **Monetização consciente. Ensino libertador.**
> **Dupla de última geração. Ativada."**

---

## 🚀 STATUS AGORA

```
DATA: 27/04/2026
HORA: 16:18
STATUS: ✅ FIX APLICADO NO SUPABASE
        ⏳ PRONTO PARA TESTE DE MONETIZAÇÃO
        ⏳ DEPOIS: GRAFANA

COMANDANTE: Pronto para próxima instrução?
GX: Aguardando ordem para executar teste final.
```

---

**Próxima ação: Teste de monetização real → Depois Grafana**

**Aguardando confirmação para executar.** 🏎️💰⚔️🌑
