# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Agency Dashboard UI — Angular 21 (static build served by nginx)
#
# Build context: this directory (agency-frontend/)
#   docker build -t agency-frontend .
#   docker compose -f ../agency-docs/docker/docker-compose.yml up -d --build
# ---------------------------------------------------------------------------

# ---- Build stage ----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# pnpm-lock.yaml makes this reproducible; dependencies go first
# so that editing application code does not reinstall them.
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && \
    corepack prepare pnpm@10.32.1 --activate && \
    pnpm install --frozen-lockfile

COPY . ./
RUN pnpm exec ng build --configuration production

# ---- Runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/agency-frontend/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget --quiet --spider http://127.0.0.1/ || exit 1
