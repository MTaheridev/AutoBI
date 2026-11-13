# Multi-target Dockerfile: api | worker | web
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages ./packages

# --- API ---
FROM manifests AS deps-api
RUN pnpm install --frozen-lockfile --filter @autobi/api... --filter @autobi/database...

FROM deps-api AS build-api
COPY . .
RUN pnpm --filter @autobi/database generate \
  && pnpm -r --filter './packages/*' build \
  && pnpm --filter @autobi/api build

FROM node:22-bookworm-slim AS api
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
  && groupadd -r autobi && useradd -r -g autobi autobi
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build-api /app /app
USER autobi
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@autobi/api", "start"]

# --- Worker ---
FROM manifests AS deps-worker
RUN pnpm install --frozen-lockfile --filter @autobi/worker... --filter @autobi/database...

FROM deps-worker AS build-worker
COPY . .
RUN pnpm --filter @autobi/database generate \
  && pnpm -r --filter './packages/*' build \
  && pnpm --filter @autobi/worker build

FROM node:22-bookworm-slim AS worker
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
  && groupadd -r autobi && useradd -r -g autobi autobi
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build-worker /app /app
USER autobi
CMD ["pnpm", "--filter", "@autobi/worker", "start"]

# --- Web ---
FROM manifests AS deps-web
RUN pnpm install --frozen-lockfile --filter @autobi/web...

FROM deps-web AS build-web
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:3101
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm -r --filter './packages/*' build \
  && pnpm --filter @autobi/web build

FROM node:22-bookworm-slim AS web
RUN groupadd -r autobi && useradd -r -g autobi autobi
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build-web /app/apps/web/public ./apps/web/public
COPY --from=build-web /app/apps/web/.next/standalone ./
COPY --from=build-web /app/apps/web/.next/static ./apps/web/.next/static
USER autobi
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
