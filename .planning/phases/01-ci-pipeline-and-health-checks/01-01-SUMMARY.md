---
phase: 01-ci-pipeline-and-health-checks
plan: 01
subsystem: api
tags: [express, health-check, kubernetes, docker, liveness, readiness, jest, supertest]

# Dependency graph
requires: []
provides:
  - "/healthz liveness probe endpoint"
  - "/readyz readiness probe endpoint with MongoDB + Redis checks"
  - "test script in server package.json for Turborepo discovery"
affects: [01-ci-pipeline-and-health-checks, docker, cloud-run]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Kubernetes-style health probes at /healthz and /readyz"
    - "ESM mocking with jest.unstable_mockModule for integration tests"

key-files:
  created:
    - packages/server/tests/integration/health.test.ts
  modified:
    - packages/server/src/app.ts
    - packages/server/package.json

key-decisions:
  - "Used jest.unstable_mockModule for ESM-compatible mongoose/redis mocking in health tests"
  - "Kept legacy /health endpoint for backward compatibility"

patterns-established:
  - "Health check tests use mocked dependencies (no real DB/Redis needed)"
  - "Liveness vs readiness probe separation for container orchestrators"

requirements-completed: [HLTH-01, HLTH-02, HLTH-03, HLTH-04]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 1 Plan 1: Health Check Endpoints Summary

**Kubernetes-style /healthz liveness and /readyz readiness probes with MongoDB + Redis connectivity checks**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T15:00:23Z
- **Completed:** 2026-03-08T15:03:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GET /healthz returns 200 with `{ status: 'ok' }` as a liveness probe
- GET /readyz returns 200 when both MongoDB and Redis are connected, 503 otherwise
- 4 integration tests covering all health check scenarios with mocked dependencies
- Added `test` script to server package.json so Turborepo can discover server tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Add test script and create health check integration tests** - `ef41f85` (test)
2. **Task 2: Implement /healthz and /readyz endpoints** - `70ba932` (feat)

## Files Created/Modified
- `packages/server/tests/integration/health.test.ts` - Integration tests for /healthz and /readyz with mocked mongoose and redis
- `packages/server/src/app.ts` - Added /healthz and /readyz endpoint handlers
- `packages/server/package.json` - Added "test" script for Turborepo discovery

## Decisions Made
- Used `jest.unstable_mockModule` for ESM-compatible mocking of mongoose and redis (required by ts-jest ESM preset)
- Kept existing `/health` endpoint for backward compatibility alongside new Kubernetes-style probes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed broken ts-jest symlinks**
- **Found during:** Task 1 (running tests)
- **Issue:** ts-jest had broken symlinks in node_modules, causing "Preset ts-jest/presets/default-esm not found"
- **Fix:** Cleaned and reinstalled all dependencies with `pnpm install`
- **Files modified:** node_modules (not committed)
- **Verification:** Tests run successfully after reinstall
- **Committed in:** N/A (node_modules not tracked)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock test execution. No scope creep.

## Issues Encountered
- Mongoose mock required comprehensive Schema/model/Types stubs because importing `app.ts` pulls in routes and models that use mongoose exports

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Health endpoints ready for Docker health checks and Cloud Run probes
- All 16 server tests pass (4 health + 12 existing evaluation-flow)
- Server test script available for CI pipeline configuration

## Self-Check: PASSED

All artifacts verified:
- health.test.ts: FOUND
- app.ts with healthz/readyz: FOUND
- test script in package.json: FOUND
- Commit ef41f85: FOUND
- Commit 70ba932: FOUND

---
*Phase: 01-ci-pipeline-and-health-checks*
*Completed: 2026-03-08*
