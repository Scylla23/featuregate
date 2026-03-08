---
phase: 1
slug: ci-pipeline-and-health-checks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 with ts-jest ESM preset |
| **Config file** | `packages/server/jest.integration.config.mjs` (server), `packages/evaluator/jest.config.js` (evaluator) |
| **Quick run command** | `pnpm -F @featuregate/server test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm -F @featuregate/server test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | HLTH-01 | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - W0 | pending |
| 1-01-02 | 01 | 1 | HLTH-02 | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - W0 | pending |
| 1-01-03 | 01 | 1 | HLTH-03 | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - W0 | pending |
| 1-01-04 | 01 | 1 | HLTH-04 | integration | `pnpm -F @featuregate/server test -- --testPathPattern health` | No - W0 | pending |
| 1-02-01 | 02 | 1 | CICD-01 | manual-only | Verify by opening a test PR | N/A | pending |
| 1-02-02 | 02 | 1 | CICD-02 | manual-only | Verify by opening a test PR | N/A | pending |
| 1-02-03 | 02 | 1 | CICD-03 | manual-only | Verify by opening a test PR | N/A | pending |
| 1-02-04 | 02 | 1 | CICD-04 | manual-only | Verify by opening a test PR | N/A | pending |
| 1-02-05 | 02 | 1 | CICD-05 | manual-only | Verify branch protection settings | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `packages/server/tests/integration/health.test.ts` — stubs for HLTH-01 through HLTH-04
- [ ] Server `package.json` needs `"test"` script added (currently only has `"test:integration"`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI runs lint on PRs | CICD-01 | GitHub Actions workflow must run in GitHub environment | Open a test PR, verify lint step runs |
| CI runs typecheck on PRs | CICD-02 | GitHub Actions workflow must run in GitHub environment | Open a test PR, verify typecheck step runs |
| CI runs build on PRs | CICD-03 | GitHub Actions workflow must run in GitHub environment | Open a test PR, verify build step runs |
| CI runs tests on PRs | CICD-04 | GitHub Actions workflow must run in GitHub environment | Open a test PR, verify test step runs |
| PRs require CI pass to merge | CICD-05 | Branch protection is a GitHub repo setting | Verify branch protection settings in GitHub UI |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
