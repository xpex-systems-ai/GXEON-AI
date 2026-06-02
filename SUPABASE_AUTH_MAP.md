# SUPABASE_AUTH_MAP.md

**Mission:** 04 — Supabase Readiness Protocol  
**Generated at:** 2026-06-02  
**Method:** static repository audit only. No Supabase connection, no credentials, no migrations, no data changes.

## 1. Executive auth verdict

**Status:** YELLOW — Supabase Auth is configured at project metadata level, but application-level Supabase login/session flows are not yet implemented.

The repo currently uses three authentication patterns:

1. **Financial mutation token auth** in the API server.
2. **Governance token auth** for governance routes.
3. **Supabase anon-key clients** in web/mobile for direct table reads and one direct `api_keys` update.

No audited code path currently performs Supabase `signIn`, `signOut`, `getSession`, or JWT-to-backend verification.

## 2. Current auth architecture

| Layer | Current mechanism | Session/JWT model | Readiness |
|---|---|---|---|
| Supabase project | `supabase/config.toml` enables `[auth]`. | Supabase Auth available but not integrated into app login flows. | Partial. |
| Web dashboard Supabase reads | `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. | Anonymous key only unless Supabase client later receives a user session. | Risky without RLS. |
| Mobile Supabase reads | Shared mobile `createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)`. | Anonymous key only unless mobile auth is added. | Partial. |
| Financial API mutations | `Authorization: Bearer <FINANCIAL_AUTH_TOKEN>` or `x-financial-auth-token`; scopes from env/header. | Opaque server token, not Supabase JWT. | Strong for server-side guarded mutations, independent from Supabase Auth. |
| Governance API | `Authorization: Bearer <GOVERNANCE_TOKEN>` or `x-governance-token`. | Opaque governance token. | Strong for governance routes, independent from Supabase Auth. |

## 3. Login flow map

### Current state

No Supabase login UI or auth route was found. The dashboard and mobile apps instantiate Supabase clients from public env variables and query tables directly. That means user identity is currently not enforced by Supabase session claims.

### Required target flow

1. User opens web/mobile app.
2. App initializes Supabase client with public URL + anon key.
3. User signs in through Supabase Auth using approved provider(s): email OTP, magic link, or OAuth.
4. Client receives Supabase session and access token.
5. Direct Supabase reads rely on RLS policies using `auth.uid()` and role claims.
6. Any privileged write continues through the API server with server-side authorization, idempotency, and audit.
7. Backend service-role usage is restricted to server runtimes only and never shipped to clients.

## 4. User and role map

| Principal | Description | Recommended Supabase representation | Permissions |
|---|---|---|---|
| `anonymous` | Public unauthenticated user with anon key. | Supabase `anon` role. | Health/public catalog only; no financial/customer data. |
| `authenticated_operator` | Logged-in GXEON operator. | `auth.users` + `profiles`/`actors` row; optional custom claim `role=operator`. | Read own operational dashboards; no direct financial mutations. |
| `admin_operator` | Internal administrator. | `auth.users` + custom claim or server-managed role table. | Broader dashboard/admin reads; sensitive writes through API server. |
| `financial_service` | API server/service worker. | Service role key server-side only, or direct `DATABASE_URL` server connection. | Can write financial tables under code-level controls. |
| `governance_service` | Governance routes/operator. | Existing `GOVERNANCE_TOKEN` until Supabase JWT integration is intentionally designed. | Governance API only. |

## 5. Session strategy

| Topic | Decision |
|---|---|
| Client session storage | Let Supabase SDK manage web/mobile session storage after login is added. |
| Backend JWT verification | Required before any API endpoint accepts Supabase user tokens. Until then, financial/governance tokens stay separate. |
| Token scopes | Keep financial scopes (`financial:*` and narrower scopes) server-side. Do not expose them as Supabase client claims. |
| Refresh behavior | Client SDK handles refresh; backend must treat tokens as bearer credentials and validate issuer/audience/signature if adopted. |
| Service role | Backend only; never in Vite/Expo envs. |

## 6. JWT strategy

Recommended Mission 05+ JWT plan for Supabase integration:

1. Keep public clients on anon key only.
2. Add login and session retrieval in web/mobile.
3. Store app role metadata in a dedicated `actor_memberships`/`profiles` table or Supabase custom claims managed by backend/admin workflow.
4. RLS reads use `auth.uid()` plus role tables.
5. Backend APIs that accept user identity must verify Supabase JWTs against the Supabase JWKS/issuer before trusting claims.
6. Financial mutations remain fail-closed behind `FINANCIAL_AUTH_TOKEN`, scopes, rate limit, and idempotency unless a formal end-user payment authorization model is added.

## 7. Auth risks

| Risk | Severity | Mitigation |
|---|---:|---|
| Direct client reads with anon key before RLS exists. | Critical | Do not connect real Supabase until RLS is enabled and tested. |
| No user ownership columns on financial tables. | High | Add `owner_user_id`/membership mapping before user-scoped RLS. |
| API server does not validate Supabase JWTs. | Medium | Keep current token separation or implement JWT validation explicitly. |
| `api_keys` direct client update pattern. | High | Move status changes behind API server or strict RLS + audit trigger. |
| Service role accidental exposure. | Critical | Keep service role only in secret stores/server runtime. |

## 8. Auth readiness score

**Auth score:** 54 / 100

- +15 Supabase auth enabled in project config
- +15 clear existing API token controls for privileged mutations
- +10 governance auth separation
- +8 public env templates distinguish anon/service role
- +6 mobile/web clients fail soft when envs are missing
- -20 no Supabase login/session flow
- -15 no RLS/user ownership alignment
- -5 direct client write candidate (`api_keys`)

**Decision:** YELLOW — design is salvageable, but real Supabase Auth use requires login + RLS implementation first.
