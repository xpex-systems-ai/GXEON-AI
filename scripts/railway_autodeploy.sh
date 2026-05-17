#!/bin/bash
set -euo pipefail

BRANCH="${1:-work}"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[AUTO-DEPLOY] origin remote is not configured. Aborting."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "[AUTO-DEPLOY] Working tree is dirty. Commit or stash changes first."
  exit 1
fi

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "$BRANCH" ]; then
  git checkout "$BRANCH"
fi

echo "[AUTO-DEPLOY] Running predeploy validation..."
npm run predeploy:validate

echo "[AUTO-DEPLOY] Pushing branch $BRANCH to origin..."
git push -u origin "$BRANCH"

echo "[AUTO-DEPLOY] Done. Railway should auto-deploy from GitHub integration."
