# GXEON Agent Economy Integration Radar P0

Agent Economy Integration Radar P0 is a private, manual-first intelligence layer for open-source agent, MCP, model hub, connector framework and automation-tool candidates. Operators paste candidate metadata; GXEON scores the candidate and creates previews only.

## Source registry

The registry is static and includes Anthropic MCP, OpenRouter, Hugging Face, GitHub open-source agents, LangChain/LangGraph, LlamaIndex, CrewAI, AutoGen, Ollama and manual imports. It performs no network calls, scraping or API-key use.

## Scoring engine

Manual imports receive integration value, security risk, license confidence, monetization potential, implementation complexity and final GXEON fit scores. The engine detects MCP, model routing, connectors, RAG, browser automation, GitHub, database, deployment and security categories from operator-provided text only.

## API contracts

- `GET /api/agent-economy/status`
- `GET /api/agent-economy/sources`
- `GET /api/agent-economy/candidates`
- `GET /api/agent-economy/candidates/:id`
- `POST /api/agent-economy/manual-import`
- `POST /api/agent-economy/candidates/:id/create-connector-preview`
- `POST /api/agent-economy/candidates/:id/create-task-preview`

There are no install, execute, clone or credential routes.

## Next stage

Connector Preview to Task Queue Linking P0 should copy safe candidate previews into the existing Task Queue pipeline without external mutation.
