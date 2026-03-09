# Domain Pitfalls

**Domain:** Feature flag platform completion (CI/CD, health checks, ContextTester, SDK resilience, demo app, documentation)
**Researched:** 2026-03-08
**Confidence:** MEDIUM (based on training data + codebase analysis; no web search available)

## Critical Pitfalls

Mistakes that cause rewrites, deployment failures, or broken production systems.

---

### Pitfall 1: Cloud Run Health Check Timing Kills Containers During Bootstrap

**What goes wrong:** The current `/health` endpoint returns `{ status: 'ok' }` immediately -- it does not check whether MongoDB or Redis are actually connected. Cloud Run uses startup and liveness probes to decide when to route traffic. If `/healthz` (liveness) responds 200 before `connectDatabase()` and Redis are ready, Cloud Run routes traffic to a container that cannot serve requests. Conversely, if the readiness probe timeout is too short for MongoDB Atlas cold connection (which can take 3-8 seconds on a cold M0 free-tier cluster), Cloud Run kills the container before it finishes booting.

**Why it happens:** The deploy Dockerfile runs `node dist/index.js`, which calls `bootstrap()` before `app.listen()`. But if you add `/healthz` as a simple "process alive" check and `/readyz` as a "dependencies connected" check, you need Cloud Run's startup probe to allow enough time for the bootstrap phase. Developers often set aggressive timeouts (5s) that work locally but fail against MongoDB Atlas across regions (the project uses `asia-south1` but Atlas M0 servers may be in different regions).

**Consequences:** Containers enter a crash loop. Cloud Run keeps restarting them, you see "unhealthy" in logs, and the service never becomes available. This is the #1 production deployment failure for Node.js on Cloud Run.

**Prevention:**
1. Keep `/healthz` (liveness) as a simple "process is running" check -- it should succeed even before DB connects
2. Create `/readyz` (readiness) that checks `mongoose.connection.readyState === 1` and a Redis `PING`
3. Configure Cloud Run's startup probe with `initialDelaySeconds: 10` and `timeoutSeconds: 5` for Atlas cold starts
4. Use the readiness endpoint for Cloud Run's traffic-routing probe, not liveness
5. Add a `failureThreshold: 3` so transient Atlas slowness does not immediately kill the container

**Detection:** Container restarts in Cloud Run logs, "Connection refused" errors from downstream clients, health check failures in the deploy step output.

**Phase:** Health Checks phase. Must be validated with actual Cloud Run deployment before CI/CD auto-deploys.

---

### Pitfall 2: CI Pipeline Runs Tests Requiring MongoDB but Has No Database

**What goes wrong:** The server integration test (`evaluation-flow.test.ts`) uses `mongodb-memory-server`, which downloads a MongoDB binary at runtime. In GitHub Actions, this download can take 30-60 seconds on the first run (no cache), and the binary is architecture-specific. If the CI job does not cache `~/.cache/mongodb-binaries/`, every PR check downloads ~100MB. Worse, `mongodb-memory-server` sometimes fails to download in constrained CI environments, causing flaky test failures.

**Why it happens:** `mongodb-memory-server` works transparently in local dev but has specific CI requirements: the binary must match the runner OS/arch, it needs write access to the cache directory, and it needs enough memory (the default `ubuntu-latest` runner has 7GB RAM, which is fine, but you must not run too many parallel instances).

**Consequences:** CI takes 3-5 minutes instead of 30 seconds. Flaky failures erode trust in CI. Developers start ignoring failing checks.

**Prevention:**
1. Add a `actions/cache` step for `~/.cache/mongodb-binaries/` keyed on `mongodb-memory-server` version in `pnpm-lock.yaml`
2. Pin `mongodb-memory-server` version in `package.json` to avoid surprise binary downloads on lockfile updates
3. Set `MONGOMS_VERSION` environment variable in CI to match the version used locally (MongoDB 7.0)
4. Run `pnpm install` with `--frozen-lockfile` (already done in the website workflow -- replicate for CI)

**Detection:** CI jobs taking >3 minutes on the test step. Intermittent test failures with "MongoMemoryServer failed to start" errors.

**Phase:** CI/CD pipeline phase.

---

### Pitfall 3: The Deploy Workflow Has No CI Checks -- Broken Code Ships Directly

**What goes wrong:** The existing `deploy-cloud-run.yml` triggers on push to `main` and immediately builds + deploys. There is no separate CI job that runs lint, typecheck, or tests. A merged PR with a type error or failing test goes straight to production.

**Why it happens:** The deploy workflow was likely written as a quick prototype. The `deploy-website.yml` also lacks CI checks. There is no `ci.yml` workflow at all yet.

**Consequences:** Production outages from broken builds. The Docker build step may catch compilation errors (TypeScript build fails), but it will not catch runtime bugs that tests would find. Logic errors in the evaluator silently reach production.

**Prevention:**
1. Create a `ci.yml` workflow that runs on PRs to `main`: install, lint, typecheck, build, test
2. Make `deploy-cloud-run.yml` require the CI job to pass (use `needs: ci` or branch protection rules)
3. Add branch protection on `main`: require CI status check to pass before merge
4. Use Turborepo's `turbo run lint typecheck build test` in CI for proper dependency ordering (already configured in `turbo.json`)

**Detection:** No `ci.yml` exists. The deploy workflow has no `needs:` dependencies on a check job.

**Phase:** CI/CD pipeline phase. This is the very first thing to build.

---

### Pitfall 4: SSE Stream Breaks Behind Cloud Run's 60-Minute Request Timeout

**What goes wrong:** Cloud Run has a maximum request timeout (default 300s, configurable up to 3600s). SSE connections are long-lived HTTP requests. If the timeout is not explicitly configured, Cloud Run terminates SSE connections after 5 minutes. Even at the max (60 minutes), connections will be severed periodically. If the SDK does not handle this gracefully, clients experience "stuck" flag states.

**Why it happens:** Cloud Run is designed for request-response workloads, not persistent connections. SSE is supported but requires explicit timeout configuration. The SDK's `SseTransport` does handle reconnection with exponential backoff (good), but the server's SSE heartbeat is every 30 seconds -- if Cloud Run's load balancer or an intermediary proxy has a shorter idle timeout than 30s, the connection may drop between heartbeats.

**Consequences:** SDK clients lose real-time updates and rely on the polling fallback. If the SSE retry logic triggers `onError` callbacks rapidly, it can cause noise in application logs and unnecessary CPU churn.

**Prevention:**
1. Set Cloud Run `--timeout=3600` (max) for the service in the deploy workflow
2. Reduce the SSE heartbeat interval from 30s to 15s to stay well under common proxy idle timeouts
3. Document that Cloud Run SSE connections will be recycled every 60 minutes -- the SDK handles this automatically via `TransportManager` fallback
4. Verify the SDK's `SseTransport.scheduleReconnect()` correctly reconnects after a clean server-side close (it does -- the stream end triggers reconnection)

**Detection:** SDK clients emitting `transport:fallback` events in production. Cloud Run logs showing request timeouts on the `/api/v1/sdk/stream` endpoint.

**Phase:** Health Checks / SDK phase. Must be configured in the deploy workflow.

---

## Moderate Pitfalls

---

### Pitfall 5: ContextTester Calls the Evaluate API With JWT Auth, Not SDK Key Auth

**What goes wrong:** The dashboard ContextTester panel needs to evaluate a flag with an arbitrary user context. The existing evaluate endpoint (`POST /api/v1/sdk/evaluate`) requires SDK key auth (`X-API-Key` header), not JWT auth. If the dashboard calls this endpoint with its JWT token, it gets a 401. Developers then either (a) add JWT auth to the SDK route (bad -- breaks the auth boundary), or (b) create a duplicate evaluate endpoint under the flags routes (duplicates logic).

**Why it happens:** The SDK routes are designed for SDK clients, not the dashboard. The auth middleware on `/api/v1/sdk/*` specifically calls `authenticateSDK`, which looks for `X-API-Key`.

**Consequences:** Auth model pollution if you try to make SDK routes accept both JWT and SDK keys. Or code duplication if you create a parallel evaluate endpoint.

**Prevention:**
1. Create a dedicated `POST /api/v1/flags/:key/evaluate` endpoint under the flags routes (JWT-authed) that reuses the same `loadEnvData()` + `evaluate()` logic
2. This endpoint receives `{ context }` in the body and returns `{ value, variationIndex, reason }` -- same response shape as the SDK evaluate route
3. The dashboard ContextTester calls this JWT-authed endpoint, keeping SDK auth and dashboard auth cleanly separated
4. Share the `loadEnvData()`, `buildSegmentsMap()`, and `toEvalFlag()` helpers (they are already in the sdk route file -- extract to a shared utility)

**Detection:** Dashboard evaluate calls returning 401 during ContextTester development.

**Phase:** ContextTester phase.

---

### Pitfall 6: ContextTester Shows Stale Results Due to Redis Cache

**What goes wrong:** The ContextTester is meant for live testing -- "I just changed a rule, let me test it." But the SDK payload is cached in Redis for 60 seconds (`setCachedSdkPayload`). If the evaluate endpoint uses cached data, the ContextTester shows results based on the pre-change flag state for up to a minute.

**Why it happens:** Caching is correct for SDK clients (they get eventual consistency via SSE). But the ContextTester is a debugging tool where users expect immediate results.

**Consequences:** Users change a targeting rule, test in ContextTester, see the old result, think the rule is broken, and waste time debugging a non-issue.

**Prevention:**
1. The dashboard evaluate endpoint should bypass the Redis cache and read directly from MongoDB
2. Since the flag detail page already has the flag data loaded client-side, consider doing client-side evaluation using the `@featuregate/evaluator` package compiled for the browser (same shared engine) -- this gives instant results with zero API calls
3. If going server-side: use `loadEnvData()` directly (which queries MongoDB) rather than `getCachedSdkPayload()`

**Detection:** ContextTester results not matching what was just saved. Reproducible by changing a rule and immediately testing.

**Phase:** ContextTester phase.

---

### Pitfall 7: Demo App Hardcodes Connection Details That Break in Docker

**What goes wrong:** The demo Express app connects to FeatureGate with `baseUrl: 'http://localhost:4000'`. This works when running both locally, but breaks in Docker Compose (where the server hostname is `api-server` or similar) and breaks in any deployment where the server is behind a reverse proxy.

**Why it happens:** Demo apps are written and tested locally first, and localhost is the path of least resistance.

**Consequences:** New users following the quickstart guide can run the demo locally but immediately hit connection errors when they try Docker Compose or Cloud Run. First impressions suffer.

**Prevention:**
1. Use environment variables: `const baseUrl = process.env.FEATUREGATE_URL || 'http://localhost:4000'`
2. Provide a `.env.example` in the demo directory with clear comments
3. In the README quickstart, show both local and Docker Compose instructions with the correct URLs
4. Add the demo app to the local dev `docker-compose.yaml` as an optional service (commented out or in a separate `docker-compose.demo.yml`)

**Detection:** Demo app fails with `ECONNREFUSED` when started inside Docker.

**Phase:** Demo App phase.

---

### Pitfall 8: Pnpm Workspace Dependencies Not Copied Correctly in Docker Build

**What goes wrong:** The deploy Dockerfile already has a workaround for this (`cp -r /tmp/evaluator-dist ...`), but it is fragile. When new workspace packages are added (like the SDK), the `pnpm deploy --legacy` command may not include their `dist/` outputs. The `--legacy` flag itself is an indicator that `pnpm deploy` does not handle workspace dependencies cleanly for production builds.

**Why it happens:** `pnpm deploy` is designed to create a standalone deployment folder, but it strips workspace protocol references and may not copy build artifacts from dependencies. The workaround of manually copying `dist/` folders is brittle -- if the evaluator adds new output files (like source maps or type declarations), the copy step may miss them.

**Consequences:** Runtime `MODULE_NOT_FOUND` errors in production for `@featuregate/evaluator` imports.

**Prevention:**
1. After the `pnpm deploy` step, verify that `@featuregate/evaluator` resolves correctly: add a `RUN node -e "require('@featuregate/evaluator')"` check in the Dockerfile
2. Copy the entire evaluator package (not just `dist/`) if size is acceptable: `cp -r packages/evaluator /prod/server/node_modules/@featuregate/evaluator`
3. Include the evaluator's `package.json` in the copy (needed for module resolution): currently only `dist/` is copied, which may break if the evaluator uses `exports` map in its `package.json`
4. Consider adding a smoke test step in CI that builds the Docker image and runs a simple health check against it

**Detection:** Docker image builds successfully but crashes on startup with `Cannot find module '@featuregate/evaluator'`.

**Phase:** CI/CD pipeline phase (Docker build verification step).

---

### Pitfall 9: README Architecture Diagram Gets Outdated Immediately

**What goes wrong:** An architecture diagram in the README (especially if it is a Mermaid diagram or ASCII art) becomes stale as soon as a new component is added. Contributors update code but not the diagram. Within weeks, the diagram shows a different architecture than reality.

**Why it happens:** Diagrams have no automated validation. They are invisible to linters and tests.

**Consequences:** New contributors get confused. The README actively misleads instead of helping.

**Prevention:**
1. Keep the diagram simple -- show only the high-level components (Dashboard, API, MongoDB, Redis, SDK). Do not diagram internal module structure
2. Use Mermaid in the README (GitHub renders it natively) -- it is easier to update than image files or ASCII art
3. Reference the existing CLAUDE.md architecture section as the source of truth for detailed structure; the README diagram should be the simplified version
4. Add a comment near the diagram: `<!-- Update this if you add or remove a top-level service -->`

**Detection:** PR reviews where diagram does not match the changes being made.

**Phase:** Documentation phase.

---

## Minor Pitfalls

---

### Pitfall 10: CI Workflow Caching Misses Turborepo Remote Cache

**What goes wrong:** The CI workflow installs dependencies and runs `turbo build/test/lint` but does not persist Turborepo's local cache between runs. Every PR re-builds all packages from scratch, even if only one package changed.

**Prevention:**
1. Cache `.turbo/` directory in GitHub Actions alongside the pnpm store
2. Alternatively, enable Turborepo Remote Cache (free for open source via Vercel) for cross-run cache sharing
3. Use `actions/cache` with a key based on the hash of source files that changed

**Phase:** CI/CD pipeline phase.

---

### Pitfall 11: ContextTester JSON Input Rejects Valid Contexts

**What goes wrong:** The ContextTester UI expects users to type a JSON context like `{ "key": "user-123", "email": "test@example.com" }`. If the JSON input uses a simple textarea with `JSON.parse()` validation, users get cryptic errors for common mistakes (trailing commas, single quotes, unquoted keys). Worse, if the input is validated on every keystroke, every partial edit shows an error.

**Prevention:**
1. Validate JSON only on blur or on explicit "Evaluate" button click, not on every keystroke
2. Provide a pre-populated template: `{ "key": "", "email": "", "country": "" }` showing common attributes
3. Show a friendly error message: "Invalid JSON. Check for trailing commas or missing quotes." rather than the raw `SyntaxError` message
4. Consider a form-based input (key-value pairs) as an alternative to raw JSON -- lower friction for simple contexts

**Phase:** ContextTester phase.

---

### Pitfall 12: Demo App Missing Graceful Shutdown of SDK Client

**What goes wrong:** If the demo app does not call `client.close()` on `SIGTERM`/`SIGINT`, the SSE connection and polling timers keep the Node.js process alive after the user tries to stop it. The timers are `.unref()`ed (good -- the SDK does this), so this may not block exit, but it can cause "connection reset" errors on the server side and noisy logs.

**Prevention:**
1. Show proper lifecycle management in the demo:
   ```typescript
   process.on('SIGTERM', async () => {
     await client.close();
     process.exit(0);
   });
   ```
2. This is also a documentation opportunity -- the README should show the full lifecycle (init, use, close)

**Phase:** Demo App phase.

---

### Pitfall 13: SDK Publish Workflow Publishes Without Version Bump

**What goes wrong:** A CI workflow that auto-publishes the SDK on push to `main` (when `packages/sdk-node/package.json` changes) will fail if the version was not bumped -- npm rejects duplicate version publishes. Worse, if someone changes the package.json for a non-version reason (updating a dependency), the publish step runs and fails, blocking the pipeline.

**Prevention:**
1. Only trigger the publish workflow when `version` field in `package.json` actually changes (use a diff check in the workflow)
2. Or use a manual `workflow_dispatch` trigger for SDK publishing, rather than automatic
3. Use `npm publish --provenance` for supply chain security (requires GitHub OIDC)
4. Add a `--dry-run` step before the actual publish to catch errors early

**Phase:** CI/CD pipeline phase (SDK publish workflow).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| CI/CD Pipeline | No CI checks before deploy (Pitfall 3) | Create `ci.yml` first, then make deploy depend on it |
| CI/CD Pipeline | mongodb-memory-server download in CI (Pitfall 2) | Cache the binary directory |
| CI/CD Pipeline | Docker build breaks on workspace deps (Pitfall 8) | Add `RUN node -e "require(...)"` verification step |
| CI/CD Pipeline | SDK publish without version bump (Pitfall 13) | Diff-check version field before publishing |
| Health Checks | Cloud Run kills containers during bootstrap (Pitfall 1) | Separate liveness from readiness; tune startup probe |
| Health Checks | SSE timeout on Cloud Run (Pitfall 4) | Set `--timeout=3600`, reduce heartbeat to 15s |
| ContextTester | Auth mismatch on evaluate endpoint (Pitfall 5) | New JWT-authed evaluate route under `/flags/:key/evaluate` |
| ContextTester | Stale cached data in test results (Pitfall 6) | Bypass Redis cache for dashboard evaluate calls |
| ContextTester | JSON input UX friction (Pitfall 11) | Validate on submit, provide template, friendly errors |
| Demo App | Hardcoded localhost URL (Pitfall 7) | Use environment variables with sensible defaults |
| Demo App | Missing SDK close on shutdown (Pitfall 12) | Show SIGTERM handler in demo code |
| Documentation | Architecture diagram staleness (Pitfall 9) | Keep diagram high-level, use Mermaid |
| CI Optimization | No Turborepo cache in CI (Pitfall 10) | Cache `.turbo/` directory in GitHub Actions |

## Sources

- Direct codebase analysis of:
  - `deploy/Dockerfile` (multi-stage build with manual evaluator dist copy)
  - `.github/workflows/deploy-cloud-run.yml` (no CI checks before deploy)
  - `packages/server/src/app.ts` (basic health check without dependency checks)
  - `packages/server/src/config/database.ts` and `redis.ts` (connection patterns)
  - `packages/sdk-node/src/transports/` (SSE, polling, transport manager with fallback)
  - `packages/server/src/routes/sdk.ts` (evaluate endpoint uses SDK key auth, Redis cache)
- Cloud Run documentation knowledge: startup probes, request timeouts, SSE support
- GitHub Actions / pnpm / Turborepo CI patterns (training data, MEDIUM confidence)
- `mongodb-memory-server` CI behavior (training data, HIGH confidence -- well-documented issue)
