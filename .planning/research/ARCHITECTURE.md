# Architecture Patterns

**Domain:** Feature flag platform completion (CI/CD, health checks, ContextTester, SDK resilience, demo app, docs)
**Researched:** 2026-03-08

## Current Architecture (As-Built)

The system runs as a single Docker container on Cloud Run combining Nginx (port 8080, public) and Express (port 4000, internal). Nginx reverse-proxies `/api/` and `/health` to Express and serves the React dashboard as static files. This is a critical architectural fact -- all new components must integrate within this single-container deployment model.

```
                      Cloud Run (single container)
                  ┌─────────────────────────────────────┐
                  │  Nginx (:8080)                      │
                  │  ├── /            → static SPA      │
                  │  ├── /api/        → Express (:4000) │
                  │  ├── /health      → Express (:4000) │
                  │  └── /assets/     → static (cached) │
                  │                                     │
                  │  Express (:4000)                     │
                  │  ├── /health          (liveness)     │
                  │  ├── /api/v1/flags    (JWT auth)     │
                  │  ├── /api/v1/sdk/*    (SDK key auth) │
                  │  └── /api/v1/sdk/stream (SSE)        │
                  └─────────────┬───────────┬───────────┘
                                │           │
                       MongoDB Atlas    Redis (Memorystore)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Nginx** (deploy/nginx.conf) | Reverse proxy, SPA fallback, static asset caching, SSE passthrough | Express (localhost:4000), client browsers |
| **Express API** (packages/server) | Flag/segment CRUD, evaluation, SSE broadcast, auth | MongoDB, Redis, SDK clients |
| **React Dashboard** (packages/dashboard) | Management UI, flag targeting, context testing | Express API via `/api/v1/*` |
| **Evaluator** (packages/evaluator) | Pure evaluation engine, shared by server + SDK | None (imported as library) |
| **Node SDK** (packages/sdk-node) | Client-side flag cache, SSE/polling transport, local evaluation | Express API (`/api/v1/sdk/*`) |
| **Redis** | Cache (TTL-based), Pub/Sub for flag change broadcasts | Express (ioredis client) |
| **MongoDB** | Persistent storage for flags, segments, projects, users, audit logs | Express (Mongoose ODM) |

### Data Flow

```
Flag Change Flow:
  Dashboard → POST /api/v1/flags/:key → MongoDB write → Audit log
                                       → Redis cache invalidation
                                       → Redis Pub/Sub publish
                                       → SSE broadcast to SDK clients

SDK Initialization Flow:
  SDK Client → GET /api/v1/sdk/flags → (Redis cache || MongoDB query)
             → Response: { flags: {...}, segments: {...} }
             → Open SSE stream at /api/v1/sdk/stream
             → Incremental updates via Redis Pub/Sub → SSE

Evaluation Flow (SDK - local):
  app.isEnabled('flag-key', context)
  → FlagStore.getFlag() → evaluate() → result (zero network latency)

Evaluation Flow (Dashboard ContextTester):
  Dashboard → POST /api/v1/flags/:key/evaluate → server-side evaluate()
            → Response: { value, variationIndex, reason }
```

## New Components and How They Integrate

### 1. Health Check Endpoints (/healthz, /readyz)

**What exists:** A basic `GET /health` returning `{ status: 'ok', timestamp }` with no dependency checks. Cloud Run currently hits `/health` through Nginx proxy.

**Architecture for new endpoints:**

```
Express app.ts:
  GET /healthz  → { status: 'ok' }              (liveness: process alive)
  GET /readyz   → check MongoDB + Redis          (readiness: can serve traffic)

Nginx nginx.conf:
  location = /healthz { proxy_pass http://127.0.0.1:4000; }
  location = /readyz  { proxy_pass http://127.0.0.1:4000; }
```

**Component boundary:** These go in `packages/server/src/app.ts` alongside the existing `/health` route. No auth required. The readiness check needs access to `mongoose.connection.readyState` and `getRedisClient().status`.

**Cloud Run integration:** Cloud Run supports separate liveness and startup probes. Configure in the `deploy-cloud-run.yml` workflow or Cloud Run service config:
- Startup probe: `/healthz` (wait for process to start)
- Liveness probe: `/healthz` (is process alive)
- The existing `/health` proxy in Nginx already works; add `/healthz` and `/readyz` the same way

**Data flow:** `/readyz` queries MongoDB connection state via `mongoose.connection.readyState === 1` and Redis state via `getRedisClient().status === 'ready'`. No data mutation.

### 2. CI/CD Pipeline (GitHub Actions)

**What exists:** `deploy-cloud-run.yml` handles build and deploy on push to main. `deploy-website.yml` handles docs site. No PR checks workflow exists.

**Architecture for CI pipeline:**

```
.github/workflows/
  ci.yml                    ← NEW: PR checks (lint, typecheck, build, test)
  deploy-cloud-run.yml      ← EXISTS: deploy on push to main
  deploy-website.yml        ← EXISTS: docs site deploy
  publish-sdk.yml           ← NEW: publish SDK to npm on version change
```

**ci.yml component structure:**

```yaml
Triggers: pull_request to main, push to main
Steps:
  1. Checkout
  2. Setup pnpm 10.7.0 + Node 20
  3. pnpm install --frozen-lockfile
  4. pnpm lint          (ESLint across all packages)
  5. pnpm typecheck     (tsc --noEmit across all packages)
  6. pnpm build         (Turborepo builds evaluator → server → dashboard)
  7. pnpm test          (Jest: evaluator unit tests + server integration tests)
```

Turborepo already handles build ordering via `turbo.json` (`build.dependsOn: ["^build"]`). The CI pipeline just runs `pnpm build` and Turbo resolves the dependency graph.

**publish-sdk.yml component structure:**

```yaml
Triggers: push to main, paths: packages/sdk-node/package.json
Steps:
  1. Checkout
  2. Setup pnpm + Node
  3. Install + build (evaluator first, then sdk-node)
  4. pnpm -F @featuregate/sdk-node test
  5. npm publish (with NPM_TOKEN secret)
```

**Key dependency:** The SDK build depends on evaluator being built first. Turborepo handles this via `^build` in `turbo.json`.

**Component boundary:** CI workflows are self-contained in `.github/workflows/`. They interact with the monorepo only through pnpm/turbo commands and Docker build context.

### 3. ContextTester Panel (Dashboard)

**What exists:** The ContextTester is already fully implemented at `packages/dashboard/src/pages/flags/components/context-tester-panel.tsx`. It includes:
- Context key input with dynamic attribute management
- Quick-add buttons for common attributes (email, country, plan, device, version)
- Preset saving/loading via localStorage
- Evaluation result display with variation coloring and reason badges
- Full evaluation trace visualization showing the decision path

**Data flow:**

```
ContextTesterPanel
  → useEvaluateFlag() mutation
    → POST /api/v1/flags/:key/evaluate { context, projectId, environmentKey }
      → Server loads flag + segments from DB
      → evaluate() from @featuregate/evaluator
      → Response: { value, variationIndex, reason: { kind, ruleIndex? } }
  → EvaluationResultDisplay renders result
  → EvaluationTrace shows step-by-step decision path
```

**Status:** This component appears complete. The research question was whether it needs building -- it does not. It calls the existing server-side evaluation endpoint using JWT auth (not SDK auth), which is correct for the dashboard context.

### 4. SDK Transport Resilience (SSE + Polling Fallback)

**What exists:** The SDK already has a complete transport resilience system:

- **TransportManager** (`packages/sdk-node/src/transports/transport-manager.ts`): Orchestrates SSE with automatic fallback
- **SseTransport** (`packages/sdk-node/src/transports/sse-transport.ts`): SSE with exponential backoff reconnection (1s to 30s)
- **PollingTransport** (`packages/sdk-node/src/transports/polling-transport.ts`): HTTP polling with djb2 hash-based change detection

**Fallback flow (already implemented):**

```
SSE Transport starts
  → SSE error #1: warn, retry with backoff
  → SSE error #2: warn, retry with backoff
  → SSE error #3 (threshold): FALLBACK
    → Stop SSE
    → Start PollingTransport (30s interval)
    → Emit 'transport:fallback' event
    → Schedule SSE recovery probe every 60s
      → If SSE probe succeeds:
        → Stop polling
        → Switch back to SSE
        → Emit 'transport:restored' event
```

**Status:** This is fully implemented. The transport manager handles SSE-first with automatic polling fallback, periodic SSE recovery probes, and client events for transport state changes.

### 5. Demo Application

**Architecture:** A standalone Express app in a new `examples/` or `packages/demo/` directory that demonstrates the SDK in a real application context.

**Recommended structure:**

```
examples/
  demo-app/
    src/
      index.ts          # Express app with feature-flagged routes
    package.json        # Dependencies: express, @featuregate/sdk-node
    README.md           # How to run the demo
```

**Component boundary:** The demo app is completely independent. It imports `@featuregate/sdk-node` as a dependency and connects to a running FeatureGate server. It should NOT be part of the Turborepo build pipeline -- it is an example, not a workspace package.

**Data flow:**

```
Demo App starts
  → new FeatureGateClient({ sdkKey, baseUrl })
  → client.init() → fetches flags from FeatureGate server
  → SSE stream for real-time updates
  → Express routes use client.isEnabled() / client.variation()
  → Feature-flagged responses to end users
```

**Key consideration:** The demo needs a running FeatureGate instance with seeded data. Reference `pnpm -F @featuregate/server run seed` for creating demo flags.

### 6. README / Documentation

**Component boundary:** Root-level `README.md` with architecture diagram, quickstart, and comparison table. No architectural integration needed -- purely documentation.

## Patterns to Follow

### Pattern 1: Health Check with Dependency Verification

**What:** Readiness probe checks all critical dependencies before reporting healthy.

**When:** `/readyz` endpoint implementation.

**Example:**

```typescript
app.get('/readyz', async (_req, res) => {
  const checks = {
    mongodb: mongoose.connection.readyState === 1,
    redis: getRedisClient().status === 'ready',
  };
  const healthy = Object.values(checks).every(Boolean);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

### Pattern 2: CI with Turborepo Cache

**What:** Use Turborepo's built-in caching in CI to skip unchanged packages.

**When:** GitHub Actions CI pipeline.

**Example:** Turborepo already has `inputs` configured in `turbo.json` for build and test tasks. CI just runs `pnpm build` and `pnpm test` -- Turbo determines what needs rebuilding. For CI, consider adding `TURBO_TOKEN` and `TURBO_TEAM` for remote caching to speed up repeat builds.

### Pattern 3: SDK npm Publish Guard

**What:** Only publish the SDK when its `package.json` version changes, not on every push.

**When:** `publish-sdk.yml` workflow.

**Why:** Prevents accidental re-publishes. Use `paths` filter on `packages/sdk-node/package.json` and compare current vs published version before running `npm publish`.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Multiple Container Deployment

**What:** Splitting Nginx and Express into separate Cloud Run services.

**Why bad:** Cloud Run charges per service. The current single-container model with Nginx + Express is correct for this scale. Splitting creates unnecessary inter-service networking complexity and cost.

**Instead:** Keep the `deploy/Dockerfile` single-container approach with `deploy/start.sh` managing both processes.

### Anti-Pattern 2: Health Checks That Call External Services

**What:** Having the liveness probe (`/healthz`) check MongoDB or Redis.

**Why bad:** If MongoDB is temporarily down, Cloud Run kills the container (liveness failure), which doesn't help -- restarting won't fix MongoDB. The container itself is fine; it just can't serve requests yet.

**Instead:** Liveness (`/healthz`) = process alive (always return 200). Readiness (`/readyz`) = dependencies available (check MongoDB + Redis). Cloud Run will stop routing traffic on readiness failure but won't kill the container.

### Anti-Pattern 3: Demo App as Workspace Package

**What:** Adding the demo to `pnpm-workspace.yaml` and making it part of the build pipeline.

**Why bad:** The demo is an example, not a product component. Including it in the workspace creates circular dependencies (demo depends on sdk-node which is a workspace package) and adds build overhead.

**Instead:** Place in `examples/demo-app/` outside the workspace. Reference `@featuregate/sdk-node` by published npm version or use a relative path `file:../../packages/sdk-node` for local development.

### Anti-Pattern 4: Duplicating Evaluation Logic for ContextTester

**What:** Building a separate client-side evaluation engine for the dashboard ContextTester.

**Why bad:** The ContextTester should call the server-side evaluation endpoint (which uses the shared `@featuregate/evaluator`). Client-side evaluation could drift from the real engine.

**Instead:** The current approach is correct -- ContextTester calls `POST /api/v1/flags/:key/evaluate` for authoritative server-side evaluation.

## Suggested Build Order

Based on dependency analysis:

```
Phase 1: Health Checks (/healthz, /readyz)
  Dependencies: None (uses existing mongoose + ioredis connections)
  Why first: Foundational for CI/CD deploy verification
  Effort: Small (~2 files: app.ts additions + nginx.conf additions)

Phase 2: CI/CD Pipeline (ci.yml, publish-sdk.yml)
  Dependencies: Health checks (for deploy verification in ci.yml)
  Why second: Enables automated quality gates for subsequent work
  Effort: Medium (~2 workflow files)

Phase 3: Demo Application
  Dependencies: Working SDK (already exists), seeded data
  Why third: Proves the SDK works end-to-end
  Effort: Small (~1 Express app file + README)

Phase 4: README / Documentation
  Dependencies: All features complete (so docs are accurate)
  Why last: Docs describe what exists; write after building
  Effort: Medium (architecture diagram, quickstart, comparison table)
```

Note: ContextTester and SDK polling fallback are already implemented. They should be verified/tested rather than built from scratch.

## Scalability Considerations

| Concern | Current (Cloud Run) | At Scale |
|---------|-------------------|----------|
| SSE connections | Single instance, ~1000 concurrent SSE via Redis Pub/Sub | Multiple Cloud Run instances; Redis Pub/Sub already handles multi-instance broadcast |
| Health check load | Minimal (Cloud Run probes every 10-30s) | No concern; health checks are lightweight |
| CI build time | ~2-5 min with Turborepo local cache | Add Turborepo remote cache (Vercel) for ~30s incremental builds |
| SDK npm publish | Manual trigger or path-based | No scalability concern |
| Container cold starts | Nginx + Node startup ~3-5s | Cloud Run min-instances=1 eliminates cold starts ($) |

## Sources

- Existing codebase analysis (primary source for all architectural decisions)
- GCP Cloud Run documentation for health check probe configuration (HIGH confidence)
- GitHub Actions documentation for workflow triggers and path filters (HIGH confidence)
