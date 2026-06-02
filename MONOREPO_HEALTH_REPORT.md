# GXEON Monorepo Health Report

Generated: 2026-06-02T02:46:51.624Z

## Executive Status

- Build: GREEN when validated with `pnpm run build`.
- Architecture: MAPPED through workspace, service, variable, port, and integration inventory.
- Deploy: READY for GitHub Pages frontend publication; Railway remains required for API/runtime services.
- Observability: ACTIVE through `npm run health:report` and the monorepo-health GitHub Actions workflow.

## Services

| Service | Hosting Target | Production Readiness |
| --- | --- | --- |
| GXEON Dashboard | GitHub Pages | READY for static frontend deployment |
| GXEON API Server | Railway / Node runtime | READY for build validation; not static-hostable |
| GXEON Mobile Dashboard | Expo/static bundle | Buildable; not GitHub Pages primary target |
| Runtime scripts | GitHub Actions / operator runtime | READY for diagnostics |

## Ports

- 3000
- 4010
- 8790

## Critical Variables

- `ALERT_WEBHOOK_URL`
- `ALLOW_UNSIGNED_MP_WEBHOOKS`
- `BASE_PATH`
- `DATABASE_BACKUP_VERIFIED`
- `DATABASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `EXPO_PUBLIC_HIGH_VALUE_THRESHOLD_BRL`
- `EXPO_PUBLIC_REPL_ID`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `FINANCIAL_API_SCOPES`
- `FINANCIAL_AUTH_SCOPES`
- `FINANCIAL_AUTH_TOKEN`
- `FINANCIAL_RATE_LIMIT_MAX_REQUESTS`
- `FINANCIAL_RATE_LIMIT_WINDOW_MS`
- `GXEON_ALLOW_REAL_PIX_VALIDATION`
- `GXEON_CONVERSION_API_PORT`
- `GXEON_DASHBOARD_API_PORT`
- `GXEON_OPERATOR_API_PORT`
- `GXEON_OPERATOR_CONFIRMED_REAL_PIX`
- `GXEON_REAL_PIX_PAYMENT_CONFIRMED`
- `GXEON_REAL_PIX_VALIDATION_AMOUNT`
- `GXEON_REAL_PIX_WEBHOOK_CONFIRMED`
- `GXEON_WS_PORT`
- `LOG_LEVEL`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_API_BASE`
- `MERCADO_PAGO_CLIENT_ID`
- `MERCADO_PAGO_CLIENT_SECRET`
- `MERCADO_PAGO_DEFAULT_PAYER_EMAIL`
- `MERCADO_PAGO_NOTIFICATION_URL`
- `MERCADO_PAGO_PIX_KEY`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_VALIDATION_PAYMENT_ID`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MONITORING_DSN`
- `NODE_ENV`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `PAGERDUTY_ROUTING_KEY`
- `PORT`
- `PRODUCTION_ACTIVATION_HTTP_TIMEOUT_MS`
- `PRODUCTION_BASE_URL`
- `RAILWAY_DEPLOYMENT_ID`
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_PUBLIC_DOMAIN`
- `RAILWAY_RESTART_POLICY`
- `RAILWAY_STATIC_URL`
- `REPLIT_DEV_DOMAIN`
- `REPLIT_INTERNAL_APP_DOMAIN`
- `REPL_ID`
- `SENTRY_DSN`
- `SLACK_WEBHOOK_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE`
- `VITE_API_BASE`
- `VITE_GOVERNANCE_TOKEN`
- `VITE_SUPABASE`

## Integrations

- Supabase
- Mercado Pago
- Railway
- Vercel
- Expo
- Replit
- GitHub Pages
