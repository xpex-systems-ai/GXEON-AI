# Grok Builder Agent Installation Plan

P0 creates the preparation layer for later Grok Builder installation. It does not install or activate autonomous agents.

## Entry conditions already modeled

- Radar X online.
- Opportunity Inbox online.
- Proposal Preview online.
- Task Preview online.
- Evidence Plan online.

## Future installation sequence

1. Operator reviews Home Center Agents registry and permission matrix.
2. Grok Builder receives the registry as installation metadata.
3. Operator selects one agent to install.
4. The selected agent is installed as disabled first (`INSTALLED_DISABLED`).
5. Operator validates connectors and approval gates.
6. Only manual-only activation can be considered later (`ACTIVE_MANUAL_ONLY`).

## Non-goals for P0

- No `/install` endpoint.
- No `/execute` endpoint.
- No provider calls.
- No credential collection.
- No GitHub, payment, email or deployment writes.

## Grok Builder readiness output

The readiness endpoint reports that registry, permission model and dashboard preparation are ready, while autonomous agents remain uncreated. `missingBeforeInstall` is empty for preparation only, not for production activation.
