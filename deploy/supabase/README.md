# OMNIX AI — Supabase PostgreSQL synthetic sandbox (GX-06.1)

**Project:** `bdxqxunosdkdvnxuamid` · org `xpexsystems` · `sa-east-1` · PostgreSQL 17.11.
**Status (2026-10-29): DATABASE SANDBOX READY; REMOTE OMNIX RUNTIME NOT DEPLOYED; CUSTOMER SAFE: NO.**
The existing website, seven canonical systems, Railway projects and historical Supabase accounts are untouched.

## What exists (verified in Supabase)
- Applied migration `deploy/supabase/migrations/0001_omnix_private_synthetic_audit.sql`, adapted without changing the canonical `lib/db/drizzle/0002_audit_os_schema.sql`.
- Private `omnix_audit` schema with **14 tables**, all RLS enabled, separate from the exposed `public` schema.
- `anon` and `authenticated` cannot use the private schema; no client record or financial data was imported.
- `gx01_pilot_app` is a **NOLOGIN** PostgreSQL role with narrow INSERT/SELECT privileges; UPDATE only on `audit_cases`; evidence/report modification remains prohibited. There is **no usable password, no running backend**, and no permission to turn it into a LOGIN role without a reviewed secret-management flow.
- Synthetic-only `audit_cases_synthetic_only` constraint rejects `metadata.scope.testData=false`.
- Explicit RLS policies exist only for the five core pilot tables. Nine unused tables deliberately have **RLS enabled but no policies** (deny by default). Supabase security advisor reports these as INFO; do not remove RLS or add permissive policies just to hide the notice.
- SQL-only smoke: `audit_cases.id=73da5aa7-3a8c-4141-a6da-90e7bc58978e`, with one related finding, evidence and report, `status=DRAFT`, metadata `source=sql-smoke-not-audit-engine`. Successful readback; malformed non-test case rejected with SQLSTATE 23514. This **does not establish that the GXEON engine ran**.
- New table indexes are still unused immediately after creation; that is informational, not a performance incident.

## Code candidate (draft PR #462, based on PR #456)
- `auditDatabaseTrust.ts`: `supabase-direct-ca` network only with exact project ref and host, explicit sandbox flag and certified CA; no pooler or private-IP fallback.
- `auditPilotConfig.ts`: accepts the Supabase default `postgres` DB only with this profile, retaining Railway/private/Render `gx01_pilot`.
- `auditPilotConnection.ts`: resolves DNS, denies private/reserved addresses, pins the chosen public IP, keeps original hostname SNI and CA+hostname TLS verification; sets `search_path=omnix_audit,pg_catalog`.
- `auditPilotDatabase.ts` and `audit-pilot.ts`: startup attests real DB name, dedicated role and exact grants; all existing synthetic-only checks remain.
- Added negative tests to the same security suites; build/CI results must be checked at the HEAD SHA and may not be reported as PASS while incomplete.

## Do not deploy blindly
1. **Free direct connection is IPv6** by default. Verify the actual backend supports IPv6. If not, design and review a separate pinned **session pooler** connection with the right URL, user, port, CA and privileges; never rewrite the hostname/port by guess.
2. Obtain Supabase's actual database CA from the project's dashboard or approved system and store privately. Never use `rejectUnauthorized:false`, `sslmode=require` without validation, or disabled TLS.
3. A human reviewer must confirm DB ownership, RLS, minimum grants, protected egress/ingress, code diff, backups and restoration, IdP/MFA and the fail-closed customer-data gates. Do not treat successful SQL smoke or local synthetic CI as this approval.
4. Create an application-specific secret in the approved secret manager, enable `gx01_pilot_app LOGIN` through a reviewed private administrative process, verify role constraints and TLS handshake, then test full HTTP: synthetic intake -> checks -> persisted evidence -> distinct review -> final report -> restart -> backup/restore in a *new* database. No value should be checked into GitHub, sent to chat or shared in logs.
5. The Supabase account's **Free** tier may pause and lacks managed backups. Confirm independent encrypted offsite backup, retention and periodic restores before offering any client SLA; consider paid upgrade on business justification.
6. Keep OIDC enterprise, lead intake, production flags and customer upload **OFF**. Extension migrations `0003/0004/0005` were not applied and need their own security review in the private schema.
7. Do not merge or deploy PRs #456/#462 before their CI gates and independent reviewer approve the SHA; the full monorepo dependency audit remains a separate unresolved gate.

## Evidence queries (read-only)
```sql
select table_name from information_schema.tables
 where table_schema = 'omnix_audit' and table_type='BASE TABLE';
select has_schema_privilege('anon','omnix_audit','USAGE') as anon_access,
       has_schema_privilege('authenticated','omnix_audit','USAGE') as authenticated_access,
       (select rolcanlogin from pg_roles where rolname='gx01_pilot_app') as pilot_login;
select id, status, metadata->'scope'->>'testData' as synthetic
 from omnix_audit.audit_cases where id='73da5aa7-3a8c-4141-a6da-90e7bc58978e';
```

References: [PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456), [GX-06.1 PR #462](https://github.com/xpex-systems-ai/GXEON-AI/pull/462), [Issue #461](https://github.com/xpex-systems-ai/GXEON-AI/issues/461), [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres), [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement).
