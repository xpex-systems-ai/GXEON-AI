# API Server Typecheck Blocker Map

Command: `pnpm --filter @workspace/api-server run typecheck`

## Result
Failed with pre-existing/non-Audit blockers across durable state, radar, revenue, route return typing, and generated library declaration freshness. No broad refactor was attempted under this mission.

## Categories
- `legacy/generated-lib-freshness`: TS6305 for `lib/db/dist/index.d.ts` and `lib/api-zod/dist/index.d.ts` being considered stale when typechecking the api-server package directly.
- `durable-state`: `src/durableState/r100DatabaseMirror*` key typing, implicit `any`, and metadata shape mismatches.
- `radar`: `src/radar/githubDemandClient.ts` category narrowing and duplicate identifiers in `src/radar/githubOpportunityTypes.ts`.
- `revenue`: `src/revenueWarRoom/r100WarRoomBuilder.ts`, `src/ledger/ledgerStore.ts`, and R100 route/service duplicate property issues.
- `route-return`: multiple Express route files have `TS7030: Not all code paths return a value`.
- `financial-runtime`: financial services/tests also report generated declaration freshness and implicit `any` blockers.

## Audit OS-specific note
`src/routes/auditV1.ts` only appears under the generated declaration freshness bucket (`TS6305`) and did not require an Audit OS code fix.
