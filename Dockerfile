# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Agency Dashboard UI — Angular 21 (static build served by nginx)
#
# Build context: this directory (agency-web/)
#   docker build -t agency-web .
#   docker compose -f ../agency-docs/docker/docker-compose.yml up -d --build
# ---------------------------------------------------------------------------

# ---- Build stage ----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# pnpm version is pinned in package.json ("packageManager"), so corepack picks
# the same one developers use. Dependencies go first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate \
    && pnpm install --frozen-lockfile

COPY . ./
RUN pnpm build

# ---- Runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/agency-web/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget --quiet --spider http://127.0.0.1/ || exit 1
