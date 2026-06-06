# GXEON Operating Model

The GXEON operating model defines how repository work should be planned, reviewed, evidenced, and advanced without accidentally activating systems or overstating status.

## Operating principles

1. **Presentation is not activation.** Documentation and visual polish must not change runtime behavior.
2. **Evidence before claims.** Screenshots, build logs, and activation reports should support public statements.
3. **Secrets stay out.** Never commit credentials, tokens, private URLs, or production environment values.
4. **Database safety first.** Do not run migrations or production database commands during presentation work.
5. **Reviewable structure.** Organize docs so investors, partners, and engineers can each navigate quickly.

## Work intake

Every meaningful change should identify:

- Mission and scope.
- Files changed.
- Runtime impact.
- Test/check commands.
- Security and secret exposure risk.
- Database/integration impact.

The pull request template is designed to enforce this review structure.

## Demo operations

Before an investor or partner demo:

1. Confirm dashboard build and typecheck results.
2. Confirm demo data is safe and accurately described.
3. Capture fresh visual evidence.
4. Confirm external APIs are not represented as live unless separately activated and documented.
5. Confirm the demo link points to the approved deployment.

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
| Runtime regression | Avoid production logic changes during presentation work; run requested checks. |
| Review confusion | Keep the repository index current. |

## Review cadence

| Cadence | Review focus |
| --- | --- |
| Every PR | Scope, status honesty, tests, secret safety, runtime impact. |
| Before demo | Build status, evidence, demo limitations, deployment link. |
| Before integration activation | Security, database, environment variables, rollback plan, owner approval. |
| Before investor update | Claims, roadmap, status document, visual evidence. |
