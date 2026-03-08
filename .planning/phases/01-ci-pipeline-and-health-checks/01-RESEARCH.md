# Phase 1: CI Pipeline and Health Checks - Research

**Researched:** 2026-03-08
**Domain:** GitHub Actions CI, Express health check endpoints
**Confidence:** HIGH

## Summary

This phase requires two independent deliverables: (1) a GitHub Actions CI workflow that validates PRs with lint, typecheck, build, and test steps, and (2) two health check endpoints (`/healthz` and `/readyz`) on the Express server.

The project already has Turborepo pipeline tasks defined for `build`, `lint`, `typecheck`, and `test`. The existing deploy workflows demonstrate pnpm/action-setup@v4 and actions/setup-node@v4 patterns. The server already has a `/health` endpoint; the new endpoints follow Kubernetes liveness/readiness probe conventions. Mongoose exposes `connection.readyState` and ioredis exposes `client.status` -- both are straightforward to check.

**Primary recommendation:** Create a single `ci.yml` workflow triggered on PRs to `main`, using Turborepo to run all checks. Add `/healthz` and `/readyz` routes directly in `app.ts` (no auth). Fix the missing `test` script in the server package so Turbo can discover it.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CICD-01 | CI workflow runs lint on all packages for every PR | Turborepo `pnpm lint` runs lint across all packages; CI workflow triggers on `pull_request` to `main` |
| CICD-02 | CI workflow runs typecheck on all packages for every PR | Turborepo `pnpm typecheck` with `dependsOn: ["^build"]` ensures evaluator builds first |
| CICD-03 | CI workflow runs build on all packages for every PR | Turborepo `pnpm build` with topological ordering handles cross-package deps |
| CICD-04 | CI workflow runs tests on all packages for every PR | Server needs a `test` script added; evaluator tests use mongodb-memory-server (no external DB needed); SDK has no tests (will be a no-op) |
| CICD-05 | PRs cannot merge without passing CI checks | GitHub branch protection rule on `main` requiring the CI job to pass |
| HLTH-01 | GET /healthz returns 200 when process is running | Simple endpoint in `app.ts` returning `{ status: 'ok' }` |
| HLTH-02 | GET /readyz returns 200 when MongoDB and Redis are healthy | Check `mongoose.connection.readyState === 1` and `redis.status === 'ready'` |
| HLTH-03 | GET /readyz returns 503 when MongoDB is disconnected | `mongoose.connection.readyState` will be 0 (disconnected) or 2 (connecting) |
| HLTH-04 | GET /readyz returns 503 when Redis is disconnected | `redis.status` will not be `'ready'` when disconnected |
</phase_requirements>

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| GitHub Actions | N/A | CI/CD platform | Already used in deploy workflows |
| actions/checkout | v4 | Repo checkout | Standard, already used |
| pnpm/action-setup | v4 | pnpm installation | Already used in deploy-website.yml |
| actions/setup-node | v4 | Node.js setup + caching | Already used, supports pnpm cache |
| Turborepo | 2.0 | Monorepo task runner | Already configured with lint/typecheck/build/test pipelines |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mongoose | 8.x | MongoDB readyState check | Health endpoint -- `mongoose.connection.readyState` |
| ioredis | 5.x | Redis status check | Health endpoint -- `redis.status` property |

### Alternatives Considered
None -- the stack is already established. No new libraries are needed for this phase.

## Architecture Patterns

### CI Workflow Structure
```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup pnpm (v4, version 10.7.0)
      - setup node (v20, cache pnpm)
      - pnpm install --frozen-lockfile
      - pnpm lint
      - pnpm typecheck
      - pnpm build
      - pnpm test
```

**Key design decisions:**
- **Single job, sequential steps:** Lint and typecheck are fast; splitting into parallel jobs adds matrix overhead and makes branch protection more complex (must require multiple status checks). A single job with sequential steps keeps it simple and the total runtime under 3 minutes.
- **Node 20 (not 23):** Match the existing deploy-website workflow. Node 20 is LTS. Local dev can use any version.
- **No services block needed:** Evaluator tests use `mongodb-memory-server` (in-process). Server integration tests also use `mongodb-memory-server`. No external MongoDB or Redis containers needed in CI.

### Health Check Endpoints
```
GET /healthz  -> liveness probe  (always 200 if process is up)
GET /readyz   -> readiness probe (200 only if MongoDB + Redis connected)
```

Both endpoints go in `app.ts` alongside the existing `/health` endpoint, before the API router. No authentication required (probes must be unauthenticated).

### Pattern: Mongoose Connection State Check
```typescript
import mongoose from 'mongoose';

// mongoose.connection.readyState values:
// 0 = disconnected
// 1 = connected
// 2 = connecting
// 3 = disconnecting
const isMongoReady = mongoose.connection.readyState === 1;
```

### Pattern: ioredis Connection State Check
```typescript
import { getRedisClient } from './config/redis.js';

// redis.status values: 'wait', 'reconnecting', 'connecting', 'connect', 'ready', 'close', 'end'
const redis = getRedisClient();
const isRedisReady = redis.status === 'ready';
```

### Pattern: Readiness Endpoint
```typescript
app.get('/readyz', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redis = getRedisClient();
  const redisReady = redis.status === 'ready';

  if (mongoReady && redisReady) {
    res.status(200).json({ status: 'ok', mongo: 'connected', redis: 'connected' });
  } else {
    res.status(503).json({
      status: 'unavailable',
      mongo: mongoReady ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'disconnected',
    });
  }
});
```

### Anti-Patterns to Avoid
- **Making health checks hit the database with a query:** Use connection state, not `db.admin().ping()`. The readyState check is instant and non-blocking. A ping query could timeout under load and cause cascading failures.
- **Putting health checks behind auth middleware:** Health probes must be unauthenticated. They are placed before `app.use('/api/v1', apiRouter)`.
- **Using `workflow_dispatch` on the CI workflow:** The CI workflow should ONLY run on PRs. Manual dispatch encourages running CI outside of the PR flow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| pnpm caching in CI | Manual cache setup | `actions/setup-node` with `cache: 'pnpm'` | setup-node v4 handles pnpm cache natively |
| Monorepo task orchestration | Custom scripts to run lint/test per-package | `pnpm lint` / `pnpm test` via Turborepo | Turbo handles dependency ordering, caching, parallelism |
| MongoDB in CI | Docker service containers | `mongodb-memory-server` (already a devDep) | In-process, zero config, already used by existing tests |

## Common Pitfalls

### Pitfall 1: Server Package Missing `test` Script
**What goes wrong:** The server package has `test:integration` but no `test` script. Turborepo's `test` task will silently skip the server package.
**Why it happens:** The package was set up with only a named integration test script.
**How to avoid:** Add `"test": "NODE_OPTIONS='--experimental-vm-modules' npx jest --config jest.integration.config.mjs"` to the server package.json scripts.
**Warning signs:** CI passes but server tests never ran.

### Pitfall 2: SDK Package Has No Test Script or Tests
**What goes wrong:** `pnpm test` via Turbo will fail or warn if sdk-node has no test script.
**Why it happens:** SDK is a stub with no implementation yet.
**How to avoid:** Either add a no-op `"test": "echo 'No tests yet'"` script, or ensure Turbo gracefully handles missing scripts (it does -- it skips packages without the task script). Verify Turbo behavior.

### Pitfall 3: pnpm Store Cache Miss
**What goes wrong:** CI is slow because pnpm reinstalls everything from network every run.
**Why it happens:** Forgetting to enable caching in `actions/setup-node`.
**How to avoid:** Use `cache: 'pnpm'` in the setup-node step. This caches the pnpm store between runs.

### Pitfall 4: Branch Protection Requires Manual Setup
**What goes wrong:** CI workflow exists but PRs can still merge without it passing.
**Why it happens:** Branch protection rules must be configured in GitHub settings, not just in the workflow file.
**How to avoid:** After the workflow runs at least once (so GitHub knows the check name), configure branch protection: Settings > Branches > Add rule for `main` > Require status checks > Select the CI job name.
**Note:** This is a manual GitHub settings step, not something that can be committed as code (without GitHub API/Terraform).

### Pitfall 5: `pnpm-lock.yaml` Not in Sync
**What goes wrong:** `pnpm install --frozen-lockfile` fails in CI because the lockfile is outdated.
**Why it happens:** Developer ran `pnpm install` but didn't commit the updated lockfile.
**How to avoid:** Always commit `pnpm-lock.yaml` changes. CI uses `--frozen-lockfile` which fails fast if lockfile is out of sync.

### Pitfall 6: typecheck Depends on Build
**What goes wrong:** `pnpm typecheck` fails because `@featuregate/evaluator` hasn't been built yet and its `.d.ts` files don't exist.
**Why it happens:** Server and SDK import from evaluator. TypeScript needs the built declaration files.
**How to avoid:** In turbo.json, `typecheck` already has `"dependsOn": ["^build"]` which builds dependencies first. In CI, running `pnpm build` before `pnpm typecheck` also solves this. The current CI step order (lint -> typecheck -> build -> test) may need adjustment: lint -> build -> typecheck -> test.

### Pitfall 7: Dashboard Package May Not Have All Turbo Tasks
**What goes wrong:** Dashboard has no `test` script. Turbo will skip it.
**Why it happens:** Dashboard is a Vite/React app with no tests yet.
**How to avoid:** This is fine -- Turbo skips packages that don't define the task. Just be aware that "all packages pass tests" means only packages with tests.

## Code Examples

### CI Workflow (complete)
```yaml
name: CI

on:
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.7.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Build
        run: pnpm build

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test
```

**Note on step order:** Build BEFORE typecheck. Turborepo's `typecheck` task has `"dependsOn": ["^build"]` but when run standalone, Turbo may not trigger the build if it wasn't already cached. Running build first as a separate step guarantees declaration files exist. Alternatively, keep the Turbo dependency chain and trust it -- but explicit ordering is safer in CI.

### Liveness Endpoint
```typescript
// In app.ts, alongside existing /health
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

### Readiness Endpoint
```typescript
// In app.ts
import mongoose from 'mongoose';
import { getRedisClient } from './config/redis.js';

app.get('/readyz', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redis = getRedisClient();
  const redisReady = redis.status === 'ready';

  const status = mongoReady && redisReady ? 200 : 503;
  res.status(status).json({
    status: status === 200 ? 'ok' : 'unavailable',
    checks: {
      mongo: mongoReady ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'disconnected',
    },
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|------------|------------------|--------------|--------|
| `actions/setup-node` without cache | `actions/setup-node@v4` with `cache: 'pnpm'` | 2023 | Native pnpm store caching, no manual cache step needed |
| `pnpm/action-setup@v3` | `pnpm/action-setup@v4` | 2024 | Auto-detects version from `packageManager` field in package.json |
| Manual concurrency handling | `concurrency` key in workflow | 2022 | Cancel in-progress CI runs for same PR |

## Open Questions

1. **CI step order: should typecheck come before or after build?**
   - What we know: turbo.json defines `typecheck.dependsOn: ["^build"]` so Turbo handles ordering when run individually. But running both as separate CI steps means build may need to go first.
   - Recommendation: Run build before typecheck in CI to be safe. Documented in code examples above.

2. **Branch protection setup (CICD-05)**
   - What we know: This requires manual GitHub settings configuration, not just code.
   - Recommendation: Document the steps in the plan. The CI job must run at least once before GitHub recognizes the check name for branch protection rules. Could also use `gh api` to configure programmatically.

3. **Should the existing `/health` endpoint be removed or kept?**
   - What we know: The existing `/health` endpoint is a simple status check. `/healthz` and `/readyz` are the Kubernetes-standard names.
   - Recommendation: Keep `/health` for backward compatibility (the deploy-cloud-run workflow may reference it). Add `/healthz` and `/readyz` as new endpoints.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 with ts-jest ESM preset |
| Config file | `packages/server/jest.integration.config.mjs` (server), `packages/evaluator/jest.config.js` (evaluator) |
| Quick run command | `pnpm -F @featuregate/server test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CICD-01 | CI runs lint on PRs | manual-only | Verify by opening a test PR | N/A |
| CICD-02 | CI runs typecheck on PRs | manual-only | Verify by opening a test PR | N/A |
| CICD-03 | CI runs build on PRs | manual-only | Verify by opening a test PR | N/A |
| CICD-04 | CI runs tests on PRs | manual-only | Verify by opening a test PR | N/A |
| CICD-05 | PRs require CI pass | manual-only | Verify branch protection settings | N/A |
| HLTH-01 | GET /healthz returns 200 | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - Wave 0 |
| HLTH-02 | GET /readyz returns 200 when connected | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - Wave 0 |
| HLTH-03 | GET /readyz returns 503 without Mongo | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - Wave 0 |
| HLTH-04 | GET /readyz returns 503 without Redis | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm -F @featuregate/server test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/server/tests/integration/health.test.ts` -- covers HLTH-01 through HLTH-04
- [ ] Server package.json needs `"test"` script added (currently only has `"test:integration"`)

## Sources

### Primary (HIGH confidence)
- Project codebase inspection: `app.ts`, `config/database.ts`, `config/redis.ts`, `turbo.json`, `package.json` files, existing workflow files
- Mongoose docs: `connection.readyState` returns 0-3 integer (well-established API, stable since Mongoose 5.x)
- ioredis: `client.status` property returns connection state string (documented in ioredis README)

### Secondary (MEDIUM confidence)
- GitHub Actions: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4` are current stable versions based on existing project usage and known release history

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools are already in use in the project
- Architecture: HIGH - patterns are simple and well-established (Express routes, GitHub Actions YAML)
- Pitfalls: HIGH - identified from direct codebase inspection (missing test scripts, build ordering)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable domain, no fast-moving dependencies)
