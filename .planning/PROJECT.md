# FeatureGate — Completion Milestone

## What This Is

FeatureGate is a self-hosted, open-source feature flag platform — an alternative to LaunchDarkly for Node.js teams. It provides a management dashboard, flag evaluation API, user segments with rule-based targeting, percentage rollouts, and a published Node.js SDK. This milestone completes the remaining 20% of the project to make it production-ready and launch-worthy.

## Core Value

Ship a complete, deployable feature flag platform that teams can self-host with confidence — CI/CD pipeline, health checks, polished dashboard, working SDK demo, and clear documentation.

## Requirements

### Validated

- ✓ Shared evaluation engine with 22+ operators, segment evaluation, consistent hashing — existing
- ✓ Express API server with all CRUD routes (auth, flags, segments, SDK, audit, projects) — existing
- ✓ 6 Mongoose models (Flag, Segment, Project, Environment, User, AuditLog) — existing
- ✓ JWT + SDK key authentication middleware — existing
- ✓ Redis caching with TTLs and Pub/Sub for real-time SSE updates — existing
- ✓ Dashboard login/register with JWT auth flow — existing
- ✓ Dashboard flags list with search, pagination, sorting, tag filter, create/toggle/delete — existing
- ✓ Dashboard layout with sidebar nav, top bar, project/environment switcher — existing
- ✓ Dashboard flag detail page with targeting rules, variations, and rule builder — existing
- ✓ Dashboard segments list and detail pages — existing
- ✓ Dashboard audit log page — existing
- ✓ Node.js SDK with client, flag store, segment store, SSE transport — existing
- ✓ Evaluator and server integration test suites — existing
- ✓ Docker Compose for local dev (MongoDB + Redis) — existing
- ✓ Production Docker Compose and Dockerfiles — existing

### Active

- [ ] CI/CD pipeline (GitHub Actions) for PR checks, staging deploy, prod deploy, SDK publish
- [ ] Server health check endpoints (/healthz liveness, /readyz readiness)
- [ ] Dashboard ContextTester panel for live flag evaluation testing
- [ ] SDK polling fallback when SSE disconnects
- [ ] Simple Express demo application showcasing the SDK
- [ ] README with architecture diagram, quickstart guide, and comparison table

### Out of Scope

- Cloud infrastructure (Terraform) — deferred, using Docker Compose for now
- Mobile SDKs — Node.js only for v1
- Real-time chat or video features — not relevant to feature flags
- Full launch kit (CONTRIBUTING.md, Loom demo, good first issues) — deferred to post-launch

## Context

- Brownfield project ~80% complete across evaluator, server, dashboard, and SDK
- Monorepo managed by Turborepo with pnpm workspaces
- Targeting GCP Cloud Run for CI/CD deployment pipeline
- Existing codebase map at `.planning/codebase/`
- React 18 requires `React.forwardRef` for all shadcn/ui components receiving refs

## Constraints

- **Platform**: GCP (Cloud Run + Memorystore + Artifact Registry + MongoDB Atlas)
- **Tech stack**: Must use established patterns (Express, Mongoose, React 18, shadcn/ui, TanStack Query)
- **Module system**: ESM with NodeNext resolution, `.js` extensions in imports
- **Auth**: JWT for dashboard, SDK key for SDK endpoints — no changes to auth model

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Skip Terraform for now | Docker Compose sufficient for initial users; infra can be added later | — Pending |
| GCP Cloud Run for CI/CD | User's preferred cloud platform | — Pending |
| Simple demo app over full example | Proves SDK works without over-investing in demo code | — Pending |
| README + quickstart over full launch kit | Get docs useful first, polish later | — Pending |

---
*Last updated: 2026-03-08 after initialization*
