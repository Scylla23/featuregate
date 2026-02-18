# ===========================================================
# Stage 1: Base image with pnpm
# ===========================================================
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ===========================================================
# Stage 2: Build all packages
# ===========================================================
FROM base AS builder
WORKDIR /app

# Copy package manifests first for better Docker layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/evaluator/package.json packages/evaluator/
COPY packages/server/package.json packages/server/
COPY packages/dashboard/package.json packages/dashboard/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/evaluator/ packages/evaluator/
COPY packages/server/ packages/server/
COPY packages/dashboard/ packages/dashboard/
COPY tsconfig.base.json ./

# Build in dependency order: evaluator -> server -> dashboard
RUN pnpm -F @featuregate/evaluator build
RUN pnpm -F @featuregate/server build
RUN pnpm -F @featuregate/dashboard build

# Deploy server with production deps, then inject build artifacts
# pnpm deploy may not include dist/ folders, so we save them first
RUN cp -r packages/evaluator/dist /tmp/evaluator-dist && \
    cp -r packages/server/dist /tmp/server-dist && \
    pnpm --filter=@featuregate/server --prod deploy --legacy /prod/server && \
    cp -r /tmp/server-dist /prod/server/dist && \
    mkdir -p /prod/server/node_modules/@featuregate/evaluator && \
    cp -r /tmp/evaluator-dist /prod/server/node_modules/@featuregate/evaluator/dist

# ===========================================================
# Stage 3: Production image with Nginx + Node.js
# ===========================================================
FROM node:20-alpine AS runner

# Install nginx and envsubst (from gettext)
RUN apk add --no-cache nginx gettext

# Create non-root user
RUN adduser -D -s /bin/sh appuser

# Copy server production build
WORKDIR /app/server
COPY --from=builder /prod/server .

# Copy dashboard static build to Nginx html directory
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html

# Copy Nginx config template and startup script
COPY deploy/nginx.conf /etc/nginx/nginx.conf.template
COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create required Nginx directories writable by appuser
RUN mkdir -p /tmp/nginx /var/log/nginx /var/lib/nginx /run/nginx && \
    chown -R appuser:appuser /tmp/nginx /var/log/nginx /var/lib/nginx /run/nginx \
    /etc/nginx /usr/share/nginx/html

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

USER appuser
WORKDIR /app
CMD ["/app/start.sh"]
