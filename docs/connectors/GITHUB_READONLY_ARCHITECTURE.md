# GitHub Read-Only Connector Architecture — P1

## Objective

Prepare the first real GXEON connector integration for GitHub in **read-only mode**. This phase creates the operational surface, domain model, route, status vocabulary and future data boundaries without activating OAuth, calling GitHub APIs, writing repositories or persisting data.

## Route

- Dashboard route: `/ops/connectors/github`
- Parent gateway route: `/ops/connectors`
- Theme: `BLACK_GOLD_PRIVATE_QG`
- Runtime state: `FIRST_REAL_CONNECTOR_PREPARED`

## Connector status model

The GitHub connector uses the following explicit states:

1. `DISCONNECTED` — default prepared state before authorization.
2. `CONNECTING` — reserved for future backend-only authorization/read handshake.
3. `CONNECTED_READONLY` — future state when read-only metadata is available.
4. `FAILED` — future state when the backend read/sync operation fails safely.

## Read-only data domains

The P1 surface prepares these domains as zero-count placeholders until a backend-only runtime is approved:

- Repository metadata and repository status.
- Branches, including default branch and active branches.
- Pull requests with `OPEN`, `CLOSED` and `MERGED` states.
- Issues with `OPEN` and `CLOSED` states.
- Recent commits with SHA, author, branch and commit timestamp.
- Evidence timeline combining commit, PR, issue, branch and health events.
- Connector health with last sync and safety flags.

## Allowed read actions

- `read_repository_metadata`
- `read_branches`
- `read_pull_requests`
- `read_issues`
- `read_commits`
- `read_repository_status`

## Forbidden actions

- `create_issue`
- `create_pr`
- `merge_pr`
- `delete_branch`
- `push_commit`
- `write_repository`
- `modify_settings`
- `store_tokens_frontend`

## Future backend discovery layer

The repository discovery layer must run server-side only. The frontend can render approved metadata snapshots, but it must not own tokens, secrets, OAuth callbacks or direct GitHub SDK calls.

Future discovery flow:

1. Human approves GitHub App/OAuth app with least-privilege read-only scopes.
2. Backend stores credentials in an approved secret boundary outside the frontend bundle.
3. Backend reads authorized repositories and normalizes metadata into the connector snapshot model.
4. UI renders read-only snapshot counts, lists and evidence timeline.
5. Any failed read produces `FAILED` without retry storms or write attempts.

## P1 non-goals

- No OAuth activation.
- No GitHub API calls.
- No repository writes.
- No issue or PR creation.
- No branch deletion or merge execution.
- No database writes.
- No token collection in UI.
