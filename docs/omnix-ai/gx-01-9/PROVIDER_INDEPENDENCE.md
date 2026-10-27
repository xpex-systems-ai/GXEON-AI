# GX019 — independência operacional do Audit OS

Diretriz do fundador em 26/10/2026: seguir sem depender da Railway, usando infraestrutura controlada pela XPeX. Aprovação de orçamento anterior não é mais um gate para compilar ou executar o runtime privado. Não foram feitas novas tentativas de assinatura nem alterados os projetos legados.

Implementado: modo privado Node24/PG17, host de DB explícito, resolução limitada a rede privada com IP fixado por conexão e verificação TLS do hostname original, segredos em arquivos, HTTPS próprio e frontend/API no mesmo processo. A origem `/omnix` serve a aplicação; `/api` inexistente retorna JSON, sem fallback HTML. Raiz redireciona ao portal e rotas financeiras não são expostas. O modo Railway anterior é um adaptador compatível, não requisito do modo privado.

Entrega executável: [instruções e Compose](../../../../deploy/self-hosted/README.md), Dockerfiles com imagens oficiais por digest, inicializador sintético, verificação HTTPS, restauração em DB novo, teste de reinício e exportador de pacote standalone com manifesto SHA256. O runtime não contém credenciais de provedor, cliente financeiro, autorização de deploy remoto ou ativação automática de produção.

| Superfície | Estado |
|---|---|
| Núcleo Audit OS | Node/PG privados; nenhuma conta cloud requerida |
| Portal | compilado e servido com a API, cookies Secure e revisão sintética distinta |
| Persistência | PG17 com papel mínimo; DB não publicado, TLS obrigatório |
| Dependências abertas | Node, PG e bibliotecas npm continuam necessárias; builds congelados e imagens fixadas |
| Conta Railway | deixou de ser dependência de execução; histórico de bloqueio preservado |
| Site corporativo | Vite estático exportável; hospedagem atual é referência opcional; APIs institucionais exigem adaptador próprio quando migradas |
| Outros módulos/provedores do monorepo | não foram reescritos nem declarados independentes nesta entrega |
| Operação global pública | requer host/IP, domínio, acesso e TLS confiável da infraestrutura própria; não há URL nova inventada |
| Dados reais | permanecem bloqueados por IAM/recuperação, privacidade e aceite operacional |

Validações locais registradas fora do estado privado: tipos globais/testes, 24/24 testes PGlite, lint e build dedicados; prova nativa PG17/HTTPS com fluxo completo, CA/nome inválidos recusados, isolamento por dono, exportação, restore com cinco hashes e reinício preservando o relatório. As evidências finais e os resultados do job Docker são vinculados ao commit na descrição da PR, sem antecipar PASS de execução pendente.

Limites: não é independência de software aberto, hardware, rede ou DNS. Não é comprovação de múltiplas regiões, certificação ou novo deploy produtivo. O exportador inclui apenas o bundle dedicado, frontend e contratos de operação; arquivos privados, dumps e chaves são excluídos. O SBOM JS e o audit global têm escopos diferentes; os riscos de dependências registrados permanecem.
