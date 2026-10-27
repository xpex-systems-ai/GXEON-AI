# OMNIX — runtime portátil privado

O Audit OS pode operar em um host controlado pela XPeX com **Node24 + PostgreSQL17**, sem conta Railway, Vercel, Supabase ou chave de provedor. Portal e API usam a mesma origem e o mesmo processo. O motor, contratos, autorização e evidências existentes são reutilizados. A instalação inicial ainda usa software aberto e imagens oficiais; depois de guardar o pacote/imagens e os segredos locais, não precisa de um serviço de controle hospedado para executar a auditoria.

Esta entrega é uma **prévia sintética**. Não libera clientes reais, certificação, réplica global de dados ou execução de alvos externos. Os dois checks continuam estáticos e limitados a um vercel.json. Outros produtos e integrações legados do monorepo não foram migrados por este pacote.

## Com Docker Compose

Pré-requisitos: Docker Engine/Compose v2, Node24 e OpenSSL para preparar o perfil. Imagens Node24 e PG17 estão fixadas por digest nos Dockerfiles; podem ser espelhadas/exportadas para um registro ou armazenamento da XPeX. Nenhum segredo entra no build. Não é necessário instalar dependências npm no host para gerar o perfil ou executar o verificador Compose.

Na raiz do repositório:

```sh
node deploy/self-hosted/init.mjs compose
docker compose -f deploy/self-hosted/compose.yaml config --quiet
docker compose -f deploy/self-hosted/compose.yaml up --build -d --wait --wait-timeout 120
node deploy/self-hosted/verify.mjs compose
```

Endereço local: `https://localhost:8443/omnix`. O inicializador gera uma CA local de teste, certificados separados, senhas distintas e três identidades sintéticas em `.gx-selfhost/compose/`. **Não instala a CA no navegador/SO.** Use o verificador HTTPS com CA explícita ou seu certificado HTTPS confiável. Não ignore alertas de certificado nem desative verificação TLS para obter uma aprovação de teste.

```sh
curl --cacert .gx-selfhost/compose/ca.crt https://localhost:8443/api/healthz
docker compose -f deploy/self-hosted/compose.yaml restart
docker compose -f deploy/self-hosted/compose.yaml up -d --wait --wait-timeout 120
node deploy/self-hosted/verify-restart.mjs compose
docker compose -f deploy/self-hosted/compose.yaml stop
```

`stop` preserva o volume. Não use remoção de volume como rotina de atualização. O inicializador recusa sobrescrever um perfil existente; não gira credenciais nem apaga dados para corrigir uma falha. Leia os códigos somente no arquivo privado `access.json`; nunca os publique em commits, issues, logs ou relatórios. Para repetir a aceitação a partir do mesmo perfil, preserve os recibos anteriores em local privado e crie um perfil novo revisado; o verificador escreve evidências com exclusividade, sem substituir provas anteriores.

O verificador usa **cliente Node HTTPS**, não download de navegador: cria caso, verifica dono/organização, executa checks, revisa com identidade distinta, fecha e recebe o JSON. Testa CA/hostname inválidos, assets compilados, API 404 em JSON, cookie Secure, TLS real do banco e restauração em **um banco novo**, comparando hashes das cinco tabelas e confirmando fonte intacta. Dump e segredos ficam privados; só `evidence/` contém os recibos publicáveis. A revisão sintética não é parecer humano independente.

## Limites e segredos

- App rootless, filesystem somente leitura, sem capabilities, HTTPS e porta do host vinculada apenas a `127.0.0.1`.
- PG17 em rede interna, sem porta pública, recusando conexões de rede sem TLS. Papel da aplicação sem superuser, criação, exclusão, trigger ou alteração de evidência/relatório.
- Conexão aprova um hostname explícito, resolve apenas endereços RFC1918/ULA/loopback, fixa o IP escolhido e mantém a validação do certificado contra o hostname original. Resposta DNS pública/mista e endpoints link-local/metadata são recusados.
- A API recebe apenas seus arquivos de segredo. A chave da CA e senha do dono do DB não são montadas na API. Arquivos `_FILE` têm tamanho limitado; configuração inline conflitante é recusada.
- Perfis ficam em diretório privado `0700`. Os arquivos destinados a bind mounts são legíveis pelos usuários dos containers (`0444`) dentro desse diretório protegido; a chave da CA fica `0400`. Compose local não é um cofre criptografado. Proteja ACLs do host, backups e acesso do administrador; em Windows, valide as ACLs da pasta.
- CPU/memória limitadas no Compose; armazenamento é volume do host e precisa de quota/monitoramento do operador. Nenhum limite de gasto de terceiros é presumido.
- Sessão sintética reside em memória de um processo. Reinício invalida sessões e conserva casos no PG. Não multiplicar réplicas sem projetar sessão compartilhada, revogação e controle distribuído de consumo.

## Pacote sem Docker

Depois de compilar API e dashboard e registrar as fontes em commit:

```sh
node deploy/self-hosted/release.mjs
```

O diretório `.gx-selfhost/releases/<commit>/` contém o bundle dedicado, frontend compilado, schema/grants e manifesto SHA256; não contém node_modules, segredos ou runtime financeiro. Para executar em outro host, instale Node24, prepare um PG17 privado e vazio, aplique o schema por seu dono, crie o papel restrito e aplique grants. Configure os arquivos privados conforme `runtime.env.example`, usando certificados válidos para os hosts escolhidos:

```sh
node --env-file=/caminho/privado/runtime.env audit-pilot.mjs
```

`GXEON_AUDIT_DEPLOYMENT_MODE=private` exige host explícito, CA do DB e chave/certificado HTTPS. `GXEON_AUDIT_FRONTEND_ROOT` aponta para a pasta `public` do pacote. Origem HTTPS exata, tokens técnicos distintos e identidades de teste são obrigatórios para o fluxo configurado. Nenhum segredo deve usar prefixo VITE. O modo legado Railway permanece compatível como opção; não é requisito do modo privado.

## Prova nativa sem Docker no host

Com dependências congeladas e API/dashboard compilados, defina `GXEON_STAGING_PG_BIN` para os binários oficiais PG17 e, se necessário, `GXEON_OPENSSL_BIN` para o OpenSSL instalado:

```sh
node deploy/self-hosted/native-proof.mjs native
```

Cria cluster **novo** em `.gx-selfhost/native`, portas loopback 55439/8449, executa o entrypoint de produção com TLS, faz a mesma aceitação HTTPS, restaura em DB novo e reinicia app+PG. Ao terminar, encerra somente seus processos e preserva os arquivos. Recusa portas ocupadas e perfil existente. Não modifica `.gx012`, o cluster anterior ou qualquer provedor.

## Exposição global e operação

Para acesso público é preciso um servidor autorizado, DNS e certificado HTTPS confiável do operador. O padrão local não abre a máquina na internet. Decidir ingresso, firewall, quotas, backup criptografado/restore, retenção, resposta a incidentes e rollback antes de publicar. O rollback conserva banco/backup e retorna à imagem/pacote anterior; não exclui volume automaticamente. Não há deploy produtivo, compra de infraestrutura ou criação de domínio neste pacote.

Ao fornecer um certificado web de CA pública, ajuste `GXEON_AUDIT_ALLOWED_ORIGINS` para seu domínio e remova a CA local de `GXEON_AUDIT_HTTPS_CA_FILE` (ou forneça a CA web correta). A CA do banco permanece configurada separadamente. O healthcheck conecta em loopback e verifica o nome do domínio aprovado; não usa bypass de identidade.

Abertura a dados reais continua condicionada a identidade empresarial/recuperação, privacidade, revogação, isolamento e aceite operacional. A auditoria global de dependências do monorepo continua com riscos registrados; digest fixo e teste de transporte não certificam ausência de vulnerabilidades Node/OS/imagem.
