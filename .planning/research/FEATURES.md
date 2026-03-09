# Feature Landscape

**Domain:** Self-hosted feature flag platform (completion milestone)
**Researched:** 2026-03-08
**Confidence:** MEDIUM (based on training data analysis of LaunchDarkly, Unleash, Flipt, Flagsmith; web verification unavailable)

## Current State

The platform is ~80% complete. Core evaluation engine, server API, dashboard (flags list, flag detail, segments, audit log), and Node.js SDK with SSE+polling transport are built. A Cloud Run deploy workflow exists. What remains is the "last mile" for production readiness.

---

## Table Stakes

Features users expect from any self-hosted feature flag tool. Missing any of these and teams will choose Unleash or Flagsmith instead.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **CI pipeline (lint + typecheck + test)** | Every credible OSS project gates PRs with CI. Without it, contributors and evaluators assume low quality. | Low | `ci.yml` on PR: checkout, pnpm install, lint, typecheck, build, test |
| **Health check endpoints (/healthz, /readyz)** | Required for Cloud Run traffic routing. Without readiness checks, deploys send traffic to unready instances. | Low | `/healthz` = process alive. `/readyz` = MongoDB + Redis ping. Extend existing `/health`. |
| **README with quickstart** | First thing every evaluator reads. No README = no adoption. | Medium | Architecture diagram, 5-minute quickstart, SDK usage snippet, comparison table |
| **SDK demo application** | Users need proof the SDK works. Every feature flag SDK ships with a runnable example. | Low | Simple Express app: 3-4 routes showing `isEnabled`, `variation`, `variationDetail` |
| **Context tester in dashboard** | Every flag management UI (LaunchDarkly, Unleash, Flagsmith) has a "test this flag" panel. Without it, debugging targeting is guesswork. | Medium | JSON context input, call evaluate endpoint, display value + reason + matched rule |
| **SDK publish workflow** | SDK is useless if not on npm. Auto-publish on version bump. | Low | GitHub Actions with `JS-DevTools/npm-publish@v3` |

## Differentiators

Features that set FeatureGate apart. Not expected, but make users choose this over competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Single docker-compose production deploy** | Unleash requires Postgres setup. A single `docker-compose up` is a strong differentiator for small teams. Already partially built. | Low | Polish existing `docker-compose.prod.yml` |
| **SDK connection status indicator** | Show which environments have active SDK connections. LaunchDarkly has this; most OSS tools do not. | Medium | Track SSE connections server-side, add API endpoint + dashboard widget |
| **OpenFeature provider** | CNCF standard for feature flags. Makes FeatureGate a drop-in replacement in OpenFeature-instrumented apps. | Medium | Separate `@featuregate/openfeature-provider` package |
| **Flag lifecycle management** | Flags accumulate as tech debt. Archive support already in schema (`archived` field). | Low | Add archive/restore UI buttons + filter |
| **Reconnection jitter in SDK** | Prevents thundering herd when server restarts. | Low | Add random 0-30% jitter to backoff delays |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Documentation site (Docusaurus/VitePress)** | Adds build/deploy complexity, overkill for v1 | Comprehensive README.md with Mermaid diagrams |
| **Terraform modules** | Massive scope per cloud provider, Docker Compose covers 90% of self-hosted users | Document Docker Compose deploy thoroughly |
| **Client-side / browser SDK** | Different security model, requires proxy architecture, doubles maintenance | Mention on roadmap, keep evaluator modular |
| **A/B testing / experiment analytics** | Feature flags and experiments have different needs (statistical significance, metric tracking) | Keep evaluation engine focused on flag delivery |
| **Flag scheduling** | Requires reliable job scheduler, timezone handling, failure modes | Users can use CI/CD or cron to call the API |
| **CONTRIBUTING.md + good first issues** | PROJECT.md explicitly defers to post-launch | Brief "Contributing" section in README |
| **Evaluation metrics dashboard** | Requires time-series DB, separate system | Users can use their own observability stack |
| **WebSocket transport** | SSE + polling fallback covers all cases | Keep SSE as primary transport |
| **Mobile/other language SDKs** | Each platform is a separate project | Focus on Node.js SDK quality |

## Feature Dependencies

```
CI Pipeline ──────────────────> Deploy Workflow (deploy should depend on CI passing)
Health Checks (/healthz, /readyz) ──> Deploy Workflow (Cloud Run needs probes)
SDK Publish Workflow ──────────> CI Pipeline (tests must pass before publish)
Context Tester ────────────────> Flag Detail Page (already built)
Demo App ─────────────────────> SDK (already built)
README ───────────────────────> All above (documents final state)
```

Critical path:
```
1. CI pipeline    (no dependencies, unblocks quality gate)
2. Health checks  (no dependencies, unblocks deploy reliability)
3. Context tester (depends on existing flag detail page)
4. Demo app       (depends on existing SDK)
5. SDK publish    (depends on CI)
6. README         (depends on all above being complete)
```

## MVP Recommendation

### Must ship (table stakes):
1. **CI pipeline** - Every PR runs lint + typecheck + build + test. ~2-3 hours.
2. **Health check endpoints** - `/healthz` + `/readyz`. ~1-2 hours.
3. **Context tester UI** - Panel on flag detail page. ~4-6 hours.
4. **Demo app** - Simple Express app proving SDK works. ~2-3 hours.
5. **README** - Architecture diagram, quickstart, SDK usage, comparison table. ~3-4 hours.
6. **SDK publish workflow** - Auto-publish to npm. ~1-2 hours.

### Defer:
- OpenFeature provider - Medium complexity, low urgency for launch
- SDK connection status indicator - Nice to have, not blocking
- Webhook notifications - Post-launch feature
- Archive/restore UI - Schema ready, build when needed

## Competitive Context

| Feature | LaunchDarkly | Unleash (OSS) | Flagsmith (OSS) | FeatureGate (after milestone) |
|---------|-------------|---------------|-----------------|------------------------------|
| CI/CD pipeline | N/A (SaaS) | Yes | Yes | Yes |
| Health checks | N/A (SaaS) | Yes | Yes | Yes |
| Context tester | Yes | Yes | Yes | Yes |
| SDK demo app | Yes | Yes | Yes | Yes |
| OpenFeature | Yes | Yes | Yes | Deferred |

## Sources

- LaunchDarkly, Unleash, Flipt, Flagsmith feature sets (training data, HIGH confidence for feature expectations)
- Existing FeatureGate codebase analysis (direct inspection, HIGH confidence)
