# GX-06.0 — Official product surface

This increment reuses the existing OMNIX portal and Audit OS. It does not add a backend, enable customer intake, configure providers, change roles, publish a plugin, or authorize production deployment. PR #456 remains a draft; independent human acceptance remains pending.

## Interface and behavior

| Surface / action | Actual behavior | Maturity / limitation |
| --- | --- | --- |
| Command Center | Session-scoped case summary, findings and completed cases; unknown values stay unknown | Synthetic preview; no fabricated counts or integration health |
| Start audit | Opens the existing authenticated synthetic intake form | Existing operator authorization and confirmation required |
| Specialist catalog | Six declared product specialties | Vercel implemented/tested locally, release blocked; five planned |
| Vercel / prepare test | Opens existing intake; shows `vercel_api_routing` and `vercel_security_headers` | Static submitted configuration only; no live Vercel account or remote scan |
| Other specialists / requirements | Expands connector, permission and security requirements | No connection or execution |
| Audit Engineer | Eight-step explanation and entry into existing workflow | Only the bounded Vercel checks execute |
| Evidence / reports | Opens an authorized case and existing evidence/review/export workflow | Session required; reports list completed cases; list capped at eight and links to history |
| Example | Opens the existing separate synthetic report sample | Not a customer case or audit of the current session |
| Evidence Lab | One synthetic demonstration and seven canonical institutional system links | Own portfolio; curation pending; no newly verified runtime claims |
| Integrations | Shows method, permissions and requirements | No credential input or active account connection; health unverified |
| Agent Workforce | Explains roles and links to existing authenticated capability catalog/history | No autonomous external operations |
| Company | Actual session organization, institutional support/privacy links | Users, plans, contracts and environments are not inferred |

The public product catalog describes engineering maturity. The existing authenticated server catalog remains the source for session-authorized capabilities. Unknown history, API errors, login, organization changes and expired sessions retain the original handling.

## Visual scope

Dark navy surface, restrained gold lion identity and blue/purple controls. The supplied concept image informs composition only. Its metrics and ACTIVE labels are not imported. The isolated transparent lion asset was generated for this surface. Product styles are scoped to `.omnix` and `.of-*`; API and security files are unchanged.

Primary modules: `OmnixProductSurface.tsx`, `OmnixPortalPage.tsx`, `omnix-product.css`, `public/assets/omnix-lion.png`. The critical ESLint scope includes the new component.

## Verification and release gates

Local typecheck, lint and dashboard build passed during implementation. Follow-up browser proof must bind the committed source to a fresh isolated PostgreSQL/TLS fixture, verify image delivery and navigation at 375/768/1440 pixels, then exercise the retained authenticated catalog/report flow. The external execution receipt records exact commands, screenshots, source revisions and outcomes; this design document is not a test result or human approval.

No new environment variables. Deployment impact is a dashboard bundle and static PNG only. Existing preview pipelines may build the draft branch. Production, real IdP, customer-data acceptance and independent reviewer gates remain separate from visual readiness. Existing dependency and provider CI failures must remain visible in the PR.
