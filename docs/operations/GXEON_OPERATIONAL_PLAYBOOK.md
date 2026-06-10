# GXEON Operational Playbook

## Operator workflow

1. Capturar sinal no Radar X.
2. Classificar impacto, urgência, risco e fonte.
3. Converter em task com dono, objetivo, critério de aceite e evidência esperada.
4. Escolher agente ou operador responsável.
5. Executar somente dentro do escopo aprovado.
6. Validar com comandos, screenshots redigidos ou logs seguros.
7. Registrar decisão, rollback e próxima ação.

## Audit-before-JSON pattern

Antes de emitir JSON operacional, auditar contexto, estado atual, riscos, permissões e evidências necessárias. JSON sem auditoria vira automação cega.

## Codex execution pattern

- Criar branch de trabalho.
- Ler instruções locais.
- Alterar apenas escopo solicitado.
- Rodar validações relevantes.
- Fazer commit com mensagem clara.
- Abrir PR com impacto, segurança, runtime e rollback.

## PR review pattern

Cada PR deve explicar summary, scope, security boundary, connector impact, runtime impact, validation commands, screenshots/evidence e rollback plan.

## Deploy validation pattern

Deploy exige build limpo, env aprovado, provider correto, rollback definido, evidência sem segredo e owner humano.

## Connector validation checklist

- Provider e status confirmados.
- Escopos mínimos documentados.
- Credenciais ausentes do repositório.
- Read-only validado antes de escrita.
- Falha sem env deve bloquear com segurança.
- Evidência anexada sem dado sensível.

## Incident handling

1. Parar automação afetada.
2. Preservar logs seguros.
3. Classificar severidade.
4. Revogar credenciais se houver suspeita.
5. Registrar timeline e ação corretiva.
6. Atualizar playbook e templates.
