-- GXEON Phase 5 Activation Schema
-- Supports swarm persistence, monetization ledger, runtime metrics, deployment reports, and recovery reports.

create table if not exists public.swarm_tasks (
  id bigserial primary key,
  idempotency_key text unique not null,
  source text not null default 'gxeon-runtime',
  status text not null default 'recorded',
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.swarm_agents (like public.swarm_tasks including all);
create table if not exists public.swarm_events (like public.swarm_tasks including all);
create table if not exists public.swarm_memory (like public.swarm_tasks including all);
create table if not exists public.monetization_ledger (like public.swarm_tasks including all);
create table if not exists public.runtime_metrics (like public.swarm_tasks including all);
create table if not exists public.deployment_reports (like public.swarm_tasks including all);
create table if not exists public.recovery_reports (like public.swarm_tasks including all);

create index if not exists idx_swarm_tasks_created_at on public.swarm_tasks (created_at desc);
create index if not exists idx_swarm_agents_created_at on public.swarm_agents (created_at desc);
create index if not exists idx_swarm_events_created_at on public.swarm_events (created_at desc);
create index if not exists idx_swarm_memory_created_at on public.swarm_memory (created_at desc);
create index if not exists idx_monetization_ledger_created_at on public.monetization_ledger (created_at desc);
create index if not exists idx_runtime_metrics_created_at on public.runtime_metrics (created_at desc);
create index if not exists idx_deployment_reports_created_at on public.deployment_reports (created_at desc);
create index if not exists idx_recovery_reports_created_at on public.recovery_reports (created_at desc);
