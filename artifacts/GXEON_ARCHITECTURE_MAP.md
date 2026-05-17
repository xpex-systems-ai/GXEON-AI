# GXEON Architecture Map

- Runtime flow: API routes in `artifacts/api-server` invoke modules in `server/runtime`.
- Operational flow: heartbeat/recovery/production/deployment modules feed governance and dashboard APIs.
- Monetization flow: paymentRuntime -> paymentOrchestrator -> mercadoWebhookRuntime -> revenueTelemetry -> monetizationAudit.
- Telemetry flow: runtimeMemory + runtimeSnapshot + signalEnrichment + operatorAlerts.
- Railway role: primary execution runtime surfaced via `railwayProduction.cjs`.
- Replit role: referenced in runtime heartbeat metadata for environment identity.
- GitHub role: runtime sync metadata and governance reporting scripts.
- Codex role: automation/audit artifact generation and runtime governance checks.
- Supabase role: environment-backed availability and synchronization signal.
- Conversion engine role: `conversionDNA.cjs` classification and conversion telemetry endpoints.
- Governance role: governance routes + runtime governance report script.
- Financial runtime role: PIX lifecycle, webhook ingestion, revenue and monetization audit modules.
