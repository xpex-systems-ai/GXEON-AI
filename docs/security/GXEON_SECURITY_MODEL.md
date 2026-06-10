# GXEON Security Model

## Princípios

### No secrets in frontend

O frontend nunca deve conter token, chave privada, segredo OAuth, service role key, URL privada ou payload sensível. UI recebe apenas dados filtrados pelo backend.

### Backend-only credentials

Credenciais vivem em provedores de ambiente e rotas server-side. Documentação pode citar nomes conceituais de configuração, mas nunca valores reais.

### Read-only first

Todo conector começa em leitura. Escrita só entra depois de threat model, escopo mínimo, validação e aprovação humana.

### Fail closed

Se uma variável, scope, tenant ou provider não estiver configurado corretamente, a operação deve falhar bloqueada.

### OAuth approval

Fluxos OAuth exigem consentimento explícito, scopes mínimos e registro de ambiente.

### No destructive automation

Automação não deve deletar dados, revogar recursos, alterar billing, fazer deploy ou modificar permissões sem aprovação humana e rollback.

### Evidence and audit trail

Operações relevantes precisam gerar trilha: quem solicitou, qual agente atuou, qual conector foi usado, qual evidência foi produzida e como reverter.

## Forbidden actions

- Commitar credenciais, screenshots com segredos ou arquivos de ambiente reais.
- Declarar conector parcial como completo.
- Executar mutação externa fora de escopo.
- Ignorar falha de build ou validação.
- Registrar receita, cliente ou resultado sem evidência verificável.
