# Public Showcase Module

Status: static component, safe to integrate when routing is approved.

Files:

- `PublicShowcasePage.tsx` — public-facing static showcase component.
- `showcaseContent.ts` — content model with honest status labels.

Integration note: route the component to a public path such as `/public-showcase` only after confirming whether the dashboard should expose public pages outside the authenticated/operator layout. The component does not include analytics keys, private URLs, customer data, or production SaaS claims.
