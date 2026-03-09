# Technology Stack

**Project:** FeatureGate - Completion Milestone
**Researched:** 2026-03-08

## Context

This is NOT a greenfield stack selection. FeatureGate already has an established stack (Express, React 18, MongoDB, Redis, Turborepo). This document covers **additional** technologies needed for the completion milestone: CI/CD, health checks, dashboard ContextTester, SDK resilience, demo app, and documentation.

**Key discovery:** The ContextTester panel and SDK polling fallback are already implemented. The milestone work for these areas is verification and testing, not building from scratch.

## Recommended Stack Additions

### CI/CD Pipeline (GitHub Actions)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `actions/checkout` | v4 | Repo checkout | Standard, already used in deploy workflows | HIGH |
| `pnpm/action-setup` | v4 | pnpm installation | Already used in deploy-website.yml, matches pnpm@10.7.0 | HIGH |
| `actions/setup-node` | v4 | Node.js setup with pnpm cache | Already used, cache: 'pnpm' for fast installs | HIGH |
| `actions/cache` | v4 | Cache mongodb-memory-server binaries | Prevents 30-60s download per CI run | HIGH |
| `google-github-actions/auth` | v2 | GCP authentication | Already used in deploy-cloud-run.yml with credentials_json | HIGH |
| `google-github-actions/deploy-cloudrun` | v2 | Cloud Run deployment | Already used, proven pattern in existing workflow | HIGH |
| `JS-DevTools/npm-publish` | v3 | npm publish with version detection | Handles version check, skips if already published, supports provenance | MEDIUM |

**Key decisions:**

1. **CI workflow (`ci.yml`) is missing.** The project has deploy workflows but no PR check pipeline. Add `ci.yml` triggered on PRs to `main` that runs: `pnpm install --frozen-lockfile` -> `pnpm lint` -> `pnpm typecheck` -> `pnpm build` -> `pnpm test`. This is table stakes.

2. **Keep `credentials_json` auth, not Workload Identity Federation.** The existing `deploy-cloud-run.yml` uses `credentials_json: ${{ secrets.GCP_CREDENTIALS }}`. While Workload Identity Federation (keyless OIDC) is best practice, it requires GCP-side setup. Since the existing approach works, keep it. Migration to WIF is a separate operational concern.

3. **SDK publish workflow (`publish-sdk.yml`).** Use `JS-DevTools/npm-publish@v3` for publishing `@featuregate/node-sdk` to npm. Triggered on pushes to `main` when `packages/sdk-node/package.json` version changes. This action handles version detection, skips if version already published.

4. **Cache mongodb-memory-server binaries.** The server integration tests use `mongodb-memory-server` which downloads a ~100MB MongoDB binary. Without caching, this adds 30-60s to every CI run. Cache `~/.cache/mongodb-binaries/` keyed on the `mongodb-memory-server` version.

5. **No separate staging vs production deploys.** The existing `deploy-cloud-run.yml` deploys on push to `main`. Staging/prod split requires Terraform (out of scope).

### Health Check Endpoints

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Mongoose `connection.readyState` | (built-in) | MongoDB readiness check | `readyState === 1` means connected. Standard Mongoose API, no library needed. | HIGH |
| ioredis `.status` property | (built-in) | Redis readiness check | ioredis exposes `.status` as `'ready'` when connected. Lighter than `.ping()` (no network call). | HIGH |

**No additional libraries needed.** Health checks are just Express routes. The existing `/health` returns `{ status: 'ok' }` without checking dependencies. Add:

- `GET /healthz` (liveness): Returns 200 if the process is running. No dependency checks. Cloud Run uses this to decide if the container is alive.
- `GET /readyz` (readiness): Returns 200 only if both MongoDB and Redis are connected. Cloud Run uses this to decide if the service can accept traffic.

**Pattern:**
```typescript
import mongoose from 'mongoose';
import { getRedisClient } from './config/redis.js';

// Liveness - process is alive
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness - dependencies are healthy
app.get('/readyz', (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = getRedisClient().status === 'ready';
  const healthy = mongoOk && redisOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks: { mongodb: mongoOk, redis: redisOk },
    timestamp: new Date().toISOString(),
  });
});
```

**Nginx proxy:** Add `/healthz` and `/readyz` to the existing Nginx config alongside the current `/health` proxy rule.

**Cloud Run probes:** Configure in `deploy-cloud-run.yml`:
```yaml
flags:
  - --startup-cpu-boost
  - --liveness-probe-path=/healthz
  - --startup-probe-path=/readyz
```

### Dashboard ContextTester Component

**Already implemented.** The codebase has a ContextTester panel at `packages/dashboard/src/pages/flags/components/context-tester-panel.tsx` with:
- Context key input with dynamic attribute management
- Quick-add buttons for common attributes (email, country, plan, device, version)
- Preset saving/loading via localStorage
- Evaluation result display with variation coloring and reason badges
- Full evaluation trace visualization

**No new dependencies needed.** It uses existing TanStack Query (`useMutation`) for API calls, React Hook Form for inputs, and shadcn/ui components for layout. The component calls `POST /api/v1/flags/:key/evaluate` with JWT auth (correct for dashboard context).

### SDK Resilience (Polling Fallback)

**Already implemented.** The SDK has a complete transport layer:

- `TransportManager` with SSE-to-polling fallback (3 consecutive failures triggers switch)
- `PollingTransport` with interval-based polling and djb2 hash-based change detection
- `SseTransport` with exponential backoff reconnection (1s -> 30s max)
- SSE recovery probing every 60s while in polling fallback
- Client events: `transport:fallback` and `transport:restored`

**Remaining work (no new libraries):**
1. **Unit tests** for TransportManager fallback/recovery logic
2. **Jitter** - Add random 0-30% jitter to reconnection delays to prevent thundering herd
3. **Configurable thresholds** - Optionally expose `sseFailureThreshold` and `sseRetryIntervalMs` in client options

### Demo Application

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Express | ^4.19 (already in monorepo) | Demo app framework | Same framework as the server, demonstrates SDK in its natural environment | HIGH |
| `@featuregate/node-sdk` | workspace:^ | SDK under demo | Direct workspace dependency for development | HIGH |

**Keep it minimal.** A single `examples/demo-app/` Express app with 2-3 routes. No React, no build step, no complexity. Use `tsx` (already a dev dependency in the monorepo) for running TypeScript directly.

**Key pattern -- use environment variables:**
```typescript
const fg = new FeatureGateClient({
  sdkKey: process.env.FEATUREGATE_SDK_KEY!,
  baseUrl: process.env.FEATUREGATE_URL || 'http://localhost:4000',
});
```

**Do NOT add to pnpm workspace.** Place in `examples/` outside the workspace to avoid circular dependency issues. Reference SDK by published npm version or `file:../../packages/sdk-node`.

### Documentation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Mermaid diagrams | (GitHub native) | Architecture diagrams in README | GitHub renders Mermaid natively, no build step, version-controlled | HIGH |

**No documentation framework needed.** README.md with: project overview, Mermaid architecture diagram, quickstart, API summary, SDK usage, comparison table vs LaunchDarkly/Unleash.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| CI/CD auth | `credentials_json` (existing) | Workload Identity Federation | Requires GCP infra setup, existing approach works |
| JSON editor | Existing form-based input | `@monaco-editor/react` | ContextTester already built with form inputs, no need to add |
| Demo app | Express (plain) | Next.js / Remix | Demo should be dead simple, not a framework showcase |
| Docs | README.md | Docusaurus / VitePress | Overkill for v1, adds build/deploy complexity |
| npm publish | `JS-DevTools/npm-publish@v3` | Manual `npm publish` | No version detection, no idempotency |
| Health check lib | None (plain Express) | `@godaddy/terminus` | Adds dependency for 10 lines of code |
| SSE library | Native fetch + ReadableStream (existing) | `eventsource` npm package | SDK already uses modern approach, no polyfill needed on Node 18+ |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| `@godaddy/terminus` | Wraps graceful shutdown + health checks. You need 2 routes, not a framework. Express routes are clearer. |
| `lightship` | Another health check framework. Same reasoning -- unnecessary abstraction for this scope. |
| `eventsource` npm | SDK already uses native `fetch()` + `ReadableStream` for SSE. Modern approach, no polyfill needed. |
| `reconnecting-eventsource` | SDK already has custom reconnection with exponential backoff in `SseTransport`. |
| `express-actuator` | Spring-style health/info/metrics. Too opinionated, too many endpoints not needed. |
| Docusaurus / VitePress | Documentation framework overkill for v1. README is sufficient. |

## Installation

```bash
# CI/CD - no app dependencies, just GitHub Actions YAML files

# Health checks - no new dependencies (mongoose + ioredis built-ins)

# ContextTester - already implemented, no new dependencies

# SDK resilience - already implemented, no new dependencies

# Demo app (outside workspace):
# examples/demo-app/package.json with:
#   express, @featuregate/node-sdk (file:../../packages/sdk-node), tsx

# Documentation - no dependencies (Mermaid renders natively on GitHub)
```

## Version Pinning Notes

All existing dependencies use `^` (compatible range). For this milestone:

- Node.js 20 LTS (used in Dockerfile, matches `actions/setup-node`)
- pnpm 10.7.0 (pinned in `packageManager` field)
- TypeScript ~5.4.5 (across all packages)

No version bumps needed.

## Sources

- Existing project files: `deploy-cloud-run.yml`, `deploy-website.yml`, `deploy/Dockerfile` (direct inspection, HIGH confidence)
- Existing SDK source: `packages/sdk-node/src/transports/` -- transport-manager, sse-transport, polling-transport (direct inspection, HIGH confidence)
- Existing server source: `packages/server/src/app.ts`, `packages/server/src/config/database.ts`, `packages/server/src/config/redis.ts` (direct inspection, HIGH confidence)
- Mongoose `connection.readyState` API (training data, HIGH confidence -- stable API since Mongoose 5)
- ioredis `.status` property (training data, HIGH confidence -- documented in ioredis README)
- GitHub Actions: `JS-DevTools/npm-publish@v3`, `actions/cache@v4` (training data, MEDIUM confidence -- verify current version before use)
- Cloud Run startup/liveness probe flags (training data, MEDIUM confidence -- verify exact flag names in GCP docs before implementation)
