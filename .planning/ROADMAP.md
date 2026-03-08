# Roadmap: FeatureGate Completion Milestone

## Overview

FeatureGate is ~80% complete. This milestone delivers the remaining infrastructure, validation, and documentation to make it production-ready and launch-worthy. Three phases move from "code that works locally" to "platform teams can self-host with confidence": first a CI pipeline and health checks to gate quality and enable reliable deploys, then a demo app proving the SDK works end-to-end, and finally documentation describing the finished product.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: CI Pipeline and Health Checks** - Automated quality gates and production readiness endpoints
- [ ] **Phase 2: SDK Demo Application** - Working Express app proving the SDK works end-to-end
- [ ] **Phase 3: Documentation** - Root README with project overview, setup guide, and monorepo structure

## Phase Details

### Phase 1: CI Pipeline and Health Checks
**Goal**: Every pull request is automatically validated, and the server exposes health endpoints for container orchestration
**Depends on**: Nothing (first phase)
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05, HLTH-01, HLTH-02, HLTH-03, HLTH-04
**Success Criteria** (what must be TRUE):
  1. Opening a PR triggers a GitHub Actions workflow that runs lint, typecheck, build, and tests across all packages
  2. A PR with a failing lint or test cannot be merged (branch protection requires CI pass)
  3. GET /healthz returns 200 when the server process is running
  4. GET /readyz returns 200 when both MongoDB and Redis are connected, and 503 when either is down
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Health check endpoints (/healthz, /readyz) with integration tests
- [ ] 01-02-PLAN.md — GitHub Actions CI workflow and branch protection

### Phase 2: SDK Demo Application
**Goal**: Developers can see the FeatureGate SDK in action through a runnable example application
**Depends on**: Phase 1
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04
**Success Criteria** (what must be TRUE):
  1. An Express app in examples/ initializes the FeatureGate SDK and connects to a local FeatureGate instance
  2. The demo app evaluates boolean flags (isEnabled) and multivariate flags (variation) and displays results
  3. The demo app includes a README with clear instructions for running it against a local FeatureGate instance
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Documentation
**Goal**: A developer landing on the GitHub repo can understand what FeatureGate is, how to set it up, and how the codebase is organized
**Depends on**: Phase 2
**Requirements**: DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. Root README describes what FeatureGate is, its core features, and how it compares to alternatives
  2. Root README contains step-by-step setup instructions covering prerequisites, install, Docker, seed data, and dev server
  3. Root README includes a monorepo structure overview showing all packages and their purposes
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CI Pipeline and Health Checks | 1/2 | In progress | - |
| 2. SDK Demo Application | 0/TBD | Not started | - |
| 3. Documentation | 0/TBD | Not started | - |
