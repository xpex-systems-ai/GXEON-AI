# Pull Request

## Mission

<!-- What mission, issue, or objective does this PR support? -->

## Scope

<!-- What changed? Keep this specific and reviewable. -->

## Files changed

<!-- List the main files/directories changed and why. -->

## Tests and checks

<!-- Include exact commands and results. -->

- [ ] `git diff --check`
- [ ] `pnpm --filter @workspace/gxeon-dashboard run typecheck`
- [ ] `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build`

## Risks and rollback

<!-- Describe runtime, documentation, security, integration, or deployment risks. Include rollback notes. -->

## Runtime and integration impact

- [ ] No production logic changed unless explicitly described above.
- [ ] No database migrations were run.
- [ ] No database mutations were performed.
- [ ] No external APIs were activated.
- [ ] Existing dashboard functionality was preserved.

## Security confirmation

- [ ] No secrets, tokens, credentials, or private environment values are included.
- [ ] Public status statements are honest and do not claim unverified revenue, users, customers, or active integrations.

## Visual evidence

<!-- Add screenshots, recordings, or Awesome Screenshot links when UI changes are visible. -->
