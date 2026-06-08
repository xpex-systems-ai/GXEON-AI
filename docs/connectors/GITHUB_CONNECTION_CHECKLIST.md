# GitHub Read-Only Connection Checklist

Use this checklist before moving the GitHub connector from prepared state into a real read-only backend connection.

## Gate 1 — Scope approval

- [ ] Confirm repositories that GXEON is allowed to read.
- [ ] Confirm default branch names for each authorized repository.
- [ ] Confirm allowed metadata: repository status, branches, pull requests, issues and commits.
- [ ] Confirm no write scopes are requested.
- [ ] Confirm no automation, merge, push, issue creation or branch deletion is enabled.

## Gate 2 — Secret boundary

- [ ] Confirm credentials are configured only in backend secret storage.
- [ ] Confirm no token input exists in the frontend.
- [ ] Confirm no token is written to localStorage, sessionStorage or browser cookies.
- [ ] Confirm logs redact authorization headers and secrets.
- [ ] Confirm generated bundles do not include GitHub secrets.

## Gate 3 — Backend read worker

- [ ] Implement backend-only GitHub reader.
- [ ] Use least-privilege read-only scopes.
- [ ] Add timeout, rate-limit and failure handling.
- [ ] Normalize repository, branch, PR, issue and commit data into the approved snapshot model.
- [ ] Return `FAILED` safely when reads fail.

## Gate 4 — Storage review

- [ ] Approve schema for connector snapshots.
- [ ] Approve RLS and service role separation.
- [ ] Confirm database writes remain backend-only.
- [ ] Confirm evidence timeline retention policy.
- [ ] Confirm no sensitive payload fields are stored.

## Gate 5 — UI validation

- [ ] Validate `/ops/connectors/github` renders without external calls.
- [ ] Validate zero-count prepared state.
- [ ] Validate status flow: `DISCONNECTED`, `CONNECTING`, `CONNECTED_READONLY`, `FAILED`.
- [ ] Validate allowed read actions are visible.
- [ ] Validate forbidden mutation actions are visible.
- [ ] Validate connector health flags remain false for all unsafe capabilities.

## P1 expected result

- Connector gateway: `READY`
- GitHub connector: `READY_FOR_CONNECTION`
- Next activation: `VERCEL_P2`
- System state: `FIRST_REAL_CONNECTOR_PREPARED`
