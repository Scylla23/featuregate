FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm -F @featuregate/evaluator build
RUN pnpm -F @featuregate/server build

# Deploy server (creates isolated production build)
RUN pnpm --filter=@featuregate/server --prod deploy /prod/server

# Manually ensure dist folders are present in the deployed location
# pnpm deploy might skip dist folders if they are ignored by .npmignore
RUN cp -r packages/evaluator/dist /prod/server/node_modules/@featuregate/evaluator/dist
RUN cp -r packages/server/dist /prod/server/dist

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the prepared production build
COPY --from=builder /prod/server .

EXPOSE 4000
CMD ["node", "dist/index.js"]
