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

# The nginx config is a template: docker-entrypoint.d/40-api-host.sh renders it with
# $API_HOST at container start, so the API host is configuration instead of a rebuild.
COPY nginx.conf.template /etc/agency/nginx.conf.template
COPY docker-entrypoint.d/40-api-host.sh /docker-entrypoint.d/40-api-host.sh
RUN chmod +x /docker-entrypoint.d/40-api-host.sh
COPY --from=build /app/dist/agency-web/browser /usr/share/nginx/html

# Default keeps `docker compose up` working; override it for any other backend:
#   docker run -e API_HOST=https://api.example.com ...
ENV API_HOST=http://api:8080

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget --quiet --spider http://127.0.0.1/ || exit 1
