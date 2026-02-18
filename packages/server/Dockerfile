FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm -F @featuregate/evaluator build && \
    pnpm -F @featuregate/server build

# Deploy server with production deps, then inject build artifacts
RUN cp -r packages/evaluator/dist /tmp/evaluator-dist && \
    cp -r packages/server/dist /tmp/server-dist && \
    pnpm --filter=@featuregate/server --prod deploy --legacy /prod/server && \
    cp -r /tmp/server-dist /prod/server/dist && \
    mkdir -p /prod/server/node_modules/@featuregate/evaluator && \
    cp -r /tmp/evaluator-dist /prod/server/node_modules/@featuregate/evaluator/dist

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the prepared production build
COPY --from=builder /prod/server .

EXPOSE 4000
CMD ["node", "dist/index.js"]
