# GXEON Runtime Blueprint
- Central runtime control should live in `/runtime` and `/workflows`, while existing code remains source-of-truth during migration.
- Current orchestrators (`core/task_engine.js`, `core/swarm_orchestrator.js`, `server/routes/task_engine.js`) must be wrapped behind deterministic runtime boundaries.
- Queue/event/retry/recovery responsibilities are separated as target domains: `/queues`, `/events`, `/recovery`.
