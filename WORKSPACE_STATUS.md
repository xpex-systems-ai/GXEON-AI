# GXEON Workspace Status

Generated: 2026-06-02T02:46:51.624Z

| Workspace | Path | Typecheck | Build | Dependencies |
| --- | --- | --- | --- | --- |
| `workspace` | `.` | YES | YES | 2 |
| `@workspace/api-server` | `artifacts/api-server` | YES | YES | 16 |
| `@workspace/gxeon-dashboard` | `artifacts/gxeon-dashboard` | YES | YES | 64 |
| `@workspace/gxeon-dashboard-mobile` | `artifacts/gxeon-dashboard-mobile` | YES | YES | 44 |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | YES | YES | 60 |
| `@workspace/api-client-react` | `lib/api-client-react` | YES | YES | 2 |
| `@workspace/api-spec` | `lib/api-spec` | NO | NO | 1 |
| `@workspace/api-zod` | `lib/api-zod` | YES | YES | 1 |
| `@workspace/db` | `lib/db` | NO | NO | 7 |
| `@workspace/scripts` | `scripts` | YES | NO | 2 |

## Build Readiness

- Libraries: @workspace/api-zod and @workspace/api-client-react are buildable through `npm run build:libs`.
- Frontend: @workspace/gxeon-dashboard is buildable as a static Vite app for GitHub Pages through `npm run pages:build`.
- API runtime: @workspace/api-server is buildable, but requires Railway or equivalent Node hosting for runtime execution.
- Mobile: @workspace/gxeon-dashboard-mobile produces a static Expo Go bundle and is not a GitHub Pages replacement for the Vite dashboard.
