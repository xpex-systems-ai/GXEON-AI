# GXEON Operating Model

The GXEON operating model defines how repository work should be planned, reviewed, evidenced, and advanced without accidentally activating systems, exposing secrets, or overstating status.

## Operating principles

1. **Documentation is not activation.** Documentation and visual polish must not change runtime behavior.
2. **Evidence before claims.** Screenshots, build logs, ledger entries, and activation reports should support operator statements.
3. **Secrets stay out.** Never commit credentials, tokens, private URLs, or production environment values.
4. **Database safety first.** Do not run migrations or production database commands during documentation-only work.
5. **Reviewable structure.** Organize docs so the operator and trusted technical reviewers can navigate quickly.

## Work intake

Every meaningful change should identify:

- Mission and scope.
- Files changed.
- Runtime impact.
- Test/check commands.
- Security and secret exposure risk.
- Database/integration impact.

The pull request template is designed to enforce this review structure.

## Private workflow operations

Before an operator walkthrough, client handoff, or controlled review:

1. Confirm dashboard build and typecheck results.
2. Confirm sample or client data is safe, redacted when needed, and accurately described.
3. Capture fresh visual evidence.
4. Confirm external APIs are not represented as live unless separately activated and documented.
5. Confirm any deployment link points to an approved environment with safe variables.

## Execution reporting

Use the execution report issue template for Codex/Copilot or agent-assisted work. Reports should include:

- Objective.
- Summary of actions.
- Files changed or inspected.
- Commands run.
- Follow-ups.
- Confirmation that no secrets or database mutations occurred when applicable.

## Risk controls

| Risk | Control |
| --- | --- |
| Accidental secret exposure | Review diffs before commit; never paste environment values into docs. |
| Accidental database mutation | Avoid migrations and push commands unless explicitly approved. |
| Overstated product status | Use the repository status document as the source of truth. |
| Runtime regression | Avoid production logic changes during documentation-only work; run requested checks. |
| Review confusion | Keep the repository index current. |

## Review cadence

| Cadence | Review focus |
| --- | --- |
| Every PR | Scope, status honesty, tests, secret safety, runtime impact. |
| Before walkthrough or handoff | Build status, evidence, workflow limitations, deployment link. |
| Before integration activation | Security, database, environment variables, rollback plan, owner approval. |
| Before monetization update | Claims, roadmap, status document, validation evidence, ledger state. |
