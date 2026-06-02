# GXEON Dependency Graph

Generated: 2026-06-02T02:46:51.624Z

| Workspace | Internal Dependencies | External Risk Notes |
| --- | --- | --- |
| `workspace` | None | Standard frontend/tooling dependency |
| `@workspace/api-server` | `@workspace/api-zod`<br>`@workspace/db` | Contains infrastructure/runtime dependency |
| `@workspace/gxeon-dashboard` | `@workspace/api-client-react` | Contains infrastructure/runtime dependency |
| `@workspace/gxeon-dashboard-mobile` | None | Contains infrastructure/runtime dependency |
| `@workspace/mockup-sandbox` | None | Standard frontend/tooling dependency |
| `@workspace/api-client-react` | None | Standard frontend/tooling dependency |
| `@workspace/api-spec` | None | Standard frontend/tooling dependency |
| `@workspace/api-zod` | None | Standard frontend/tooling dependency |
| `@workspace/db` | None | Contains infrastructure/runtime dependency |
| `@workspace/scripts` | None | Standard frontend/tooling dependency |

## Dependency Controls

- pnpm catalog centralizes shared frontend/runtime dependency versions in `pnpm-workspace.yaml`.
- `minimumReleaseAge: 1440` remains enabled to reduce npm supply-chain exposure.
