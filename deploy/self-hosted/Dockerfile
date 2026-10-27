FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS build
WORKDIR /build
RUN npm install -g pnpm@10.28.1 --ignore-scripts --no-audit --no-fund
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig*.json ./
COPY patches ./patches
COPY lib ./lib
COPY packages ./packages
COPY artifacts/api-server ./artifacts/api-server
COPY artifacts/gxeon-dashboard ./artifacts/gxeon-dashboard
COPY scripts/package.json ./scripts/package.json
RUN pnpm install --frozen-lockfile --filter @workspace/api-server... --filter @workspace/gxeon-dashboard...
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN pnpm run build:libs && GXEON_AUDIT_BUILD_ONLY=true pnpm --filter @workspace/api-server run build && PORT=8080 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build

FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /build/artifacts/api-server/dist/audit-pilot.mjs ./audit-pilot.mjs
COPY --from=build --chown=node:node /build/artifacts/gxeon-dashboard/dist/public ./public
COPY --chown=node:node deploy/self-hosted/health.mjs ./health.mjs
USER node
EXPOSE 8080
CMD ["node", "audit-pilot.mjs"]
