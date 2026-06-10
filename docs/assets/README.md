# GXEON Visual Assets

Este diretório guarda placeholders e futuras referências visuais do GXEON OS. A política atual é criar apenas arquivos markdown placeholder, sem binários gerados e sem base64.

## Estrutura recomendada

| Categoria | Caminho futuro | Uso |
| --- | --- | --- |
| Logo placeholders | `docs/assets/logo-gxeon-placeholder.md` | Direção para logo e variações. |
| Architecture diagrams | `docs/assets/architecture-diagram-placeholder.md` | Referências para diagramas exportados futuramente. |
| Home Center Agents | `docs/assets/home-center-agents-placeholder.md` | Visual da casa dos agentes. |
| Mission Control screenshots | `docs/assets/mission-control-screenshot-placeholder.md` | Screenshots redigidos do dashboard. |
| Connector screenshots | `docs/assets/connectors-map-placeholder.md` | Mapa visual de conectores. |
| LinkedIn visuals | `docs/assets/linkedin/` | Arte institucional futura. |

## Naming conventions

- Use kebab-case.
- Inclua data somente quando o asset for snapshot: `mission-control-YYYY-MM-DD-redacted.png`.
- Marque screenshots como `redacted` quando houver risco de dado operacional.
- Não commitar imagem com credencial, token, email sensível, URL privada ou dados de cliente.

## Segurança

Antes de commitar qualquer screenshot, revisar zoom, tooltips, barra de endereço, headers, payloads, logs e metadados. Se houver dúvida, não commitar.
