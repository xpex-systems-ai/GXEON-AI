# SUPABASE_STORAGE_MAP.md

**Mission:** 04 — Supabase Readiness Protocol  
**Generated at:** 2026-06-02  
**Method:** static repository audit only. No Supabase connection, no credentials, no migrations, no data changes.

## 1. Executive storage verdict

**Status:** YELLOW — Supabase Storage is enabled in project metadata, but no bucket architecture, upload path, or storage policy is committed.

The codebase currently references Supabase Storage only in readiness/prod-validation logic and CLI config. There are no application calls to `supabase.storage.from(...)` in the audited web/mobile/runtime paths.

## 2. Current storage evidence

| Evidence | Meaning |
|---|---|
| `supabase/config.toml` has `[storage] enabled = true`. | Supabase project binding expects Storage capability. |
| `scripts/production_activation_check.cjs` includes storage validation. | Production activation expects Storage to respond once real credentials are available. |
| No app-level `supabase.storage` usage found. | Upload/download behavior is not implemented yet. |

## 3. Required bucket architecture

Recommended buckets before real activation:

| Bucket | Access | Purpose | Owner model | Notes |
|---|---|---|---|---|
| `operator-avatars` | Private by default; signed reads. | Operator/user profile avatars. | `auth.uid()` or actor membership. | Low sensitivity but still user-owned. |
| `dataset-assets` | Private; controlled download. | Marketplace dataset files and previews. | Dataset owner + purchasers. | Must integrate with `marketplace_datasets` and `dataset_purchases`. |
| `runtime-artifacts` | Private service bucket. | Execution proofs, runtime snapshots, generated reports. | Service role/API server only. | Avoid client direct writes. |
| `public-brand-assets` | Public read, restricted write. | Non-sensitive logos/images. | Admin/service only writes. | Optional. |
| `webhook-raw-archives` | Private service bucket. | Optional raw webhook payload archive if DB row size becomes a concern. | Service role only. | Must avoid storing secrets unless encrypted/redacted. |

## 4. Upload map

| Upload flow | Current status | Target control |
|---|---|---|
| Avatar upload | Not implemented. | Client uploads to user-owned path after login; RLS/storage policy enforces `auth.uid()`. |
| Dataset upload | Not implemented. | API server creates dataset metadata, then grants signed upload or service upload. |
| Runtime artifact upload | Not implemented. | API server/service worker only. |
| Public asset upload | Not implemented. | Admin-only or CI/service-role only. |

## 5. Permission model

Storage policies should follow these rules:

1. Public buckets may allow read-only public access but never anonymous writes.
2. Private buckets require `authenticated` and path ownership checks or server-signed URLs.
3. Dataset assets must check purchase entitlement before download.
4. Runtime artifacts and webhook archives should be service-only.
5. Service role key must never be present in web/mobile bundles.

## 6. Consumption map

| Consumer | Expected future storage use | Current readiness |
|---|---|---|
| Web dashboard | Dataset previews, avatars, runtime artifact download links. | Not wired. |
| Mobile dashboard | Dataset previews, avatars. | Not wired. |
| API server | Signed URLs, service uploads for privileged artifacts. | Not wired. |
| Runtime workers | Optional artifact persistence. | Currently local JSON/event files only. |

## 7. Storage risks

| Risk | Severity | Mitigation |
|---|---:|---|
| Buckets created manually without versioned policy docs. | High | Add a storage policy design/migration before connection. |
| Dataset files exposed publicly. | Critical | Private bucket + entitlement checks. |
| Service role leaked to clients. | Critical | Keep service role server-only; scan bundles/envs. |
| No upload size/type constraints. | Medium | Define MIME/size validation at API and bucket policy layers. |
| No malware/content moderation strategy for uploads. | Medium | Gate uploads by admin/API validation where needed. |

## 8. Storage readiness score

**Storage score:** 42 / 100

- +10 project config enables Storage
- +10 production activation has storage probe concept
- +8 env templates separate service and anon keys
- +7 no unsafe storage client usage found
- +7 local runtime avoids accidental external writes
- -20 no bucket map in code/migrations
- -15 no storage policies
- -10 no implemented upload flows
- -5 no entitlement-backed dataset asset model

**Decision:** YELLOW — do not activate real Storage until buckets and policies are specified and versioned.
