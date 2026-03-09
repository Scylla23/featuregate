# Requirements: FeatureGate Completion Milestone

**Defined:** 2026-03-08
**Core Value:** Ship a complete, deployable feature flag platform that teams can self-host with confidence

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### CI/CD Pipeline

- [ ] **CICD-01**: CI workflow runs lint on all packages for every pull request
- [ ] **CICD-02**: CI workflow runs typecheck on all packages for every pull request
- [ ] **CICD-03**: CI workflow runs build on all packages for every pull request
- [ ] **CICD-04**: CI workflow runs tests on all packages for every pull request
- [ ] **CICD-05**: PRs cannot merge without passing CI checks

### Health Checks

- [x] **HLTH-01**: GET /healthz returns 200 when the server process is running (liveness probe)
- [x] **HLTH-02**: GET /readyz returns 200 only when MongoDB and Redis connections are healthy (readiness probe)
- [x] **HLTH-03**: GET /readyz returns 503 when MongoDB is disconnected
- [x] **HLTH-04**: GET /readyz returns 503 when Redis is disconnected

### SDK Demo Application

- [ ] **DEMO-01**: Express demo app initializes the FeatureGate SDK with an SDK key and base URL
- [ ] **DEMO-02**: Demo app demonstrates boolean flag evaluation with isEnabled()
- [ ] **DEMO-03**: Demo app demonstrates multivariate flag evaluation with variation()
- [ ] **DEMO-04**: Demo app has a README explaining how to run it against a local FeatureGate instance

### Documentation

- [ ] **DOCS-01**: Root README has accurate project description and feature overview
- [ ] **DOCS-02**: Root README has setup instructions (prerequisites, install, docker, seed, dev)
- [ ] **DOCS-03**: Root README has monorepo structure overview

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### CI/CD Pipeline

- **CICD-06**: SDK publish workflow auto-publishes to npm on version bump
- **CICD-07**: Docker build verification in CI (build images, start compose, verify health)
- **CICD-08**: Staging deploy workflow triggered on push to main

### Health Checks

- **HLTH-05**: Nginx proxy configuration for health check routes
- **HLTH-06**: Cloud Run startup/liveness probe configuration in deploy workflow

### Documentation

- **DOCS-04**: Architecture diagram (Mermaid/ASCII) in README
- **DOCS-05**: Feature comparison table vs LaunchDarkly, Unleash, Flagsmith
- **DOCS-06**: SDK quickstart code examples in README

## Out of Scope

| Feature | Reason |
|---------|--------|
| Terraform infrastructure | Deferred — Docker Compose sufficient for initial users |
| CONTRIBUTING.md | Deferred to post-launch |
| Loom demo recording | Marketing, not engineering |
| Good first issues | Post-launch community building |
| Mobile SDKs | Node.js only for v1 |
| OpenFeature provider | Post-launch differentiator |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CICD-01 | Phase 1 | Pending |
| CICD-02 | Phase 1 | Pending |
| CICD-03 | Phase 1 | Pending |
| CICD-04 | Phase 1 | Pending |
| CICD-05 | Phase 1 | Pending |
| HLTH-01 | Phase 1 | Complete |
| HLTH-02 | Phase 1 | Complete |
| HLTH-03 | Phase 1 | Complete |
| HLTH-04 | Phase 1 | Complete |
| DEMO-01 | Phase 2 | Pending |
| DEMO-02 | Phase 2 | Pending |
| DEMO-03 | Phase 2 | Pending |
| DEMO-04 | Phase 2 | Pending |
| DOCS-01 | Phase 3 | Pending |
| DOCS-02 | Phase 3 | Pending |
| DOCS-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after 01-01 plan completion*
