# Testing Patterns

**Analysis Date:** 2026-03-08

## Test Framework

**Runner:**
- Jest 29.7.0
- ESM support via `NODE_OPTIONS='--experimental-vm-modules'` and `ts-jest/presets/default-esm`

**Assertion Library:**
- Jest built-in (`expect`) with `@jest/globals` explicit imports

**Run Commands:**
```bash
pnpm test                                    # Run all tests via Turbo
pnpm -F @featuregate/evaluator test          # Evaluator unit tests
pnpm -F @featuregate/evaluator test:watch    # Watch mode
pnpm -F @featuregate/evaluator test:coverage # Coverage report
pnpm -F @featuregate/server test:integration # Server integration tests
```

## Test File Organization

**Location:**
- Evaluator unit tests: `packages/evaluator/src/tests/` (inside src, separate `tests` directory)
- Server integration tests: `packages/server/tests/integration/` (outside src, top-level `tests` directory)

**Naming:**
- Test files: `{module-name}.test.ts`
- Helper files: `helpers.ts`, `utils.ts` (no `.test` suffix)

**Structure:**
```
packages/evaluator/
  src/
    tests/
      evaluate.test.ts      # Main evaluation flow tests
      clauses.test.ts        # Clause matching operator tests
      segments.test.ts       # Segment membership tests
      hash.test.ts           # Hashing and bucketing tests
      helpers.ts             # Builder functions for test data
      utils.ts               # Distribution analysis utilities

packages/server/
  tests/
    integration/
      evaluation-flow.test.ts  # Full E2E evaluation flow
```

## Jest Configuration

**Evaluator (`packages/evaluator/jest.config.js`):**
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',    // Strip .js for ts-jest
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**',
    '!src/index.ts',
  ],
};
```

**Server (`packages/server/jest.integration.config.mjs`):**
```javascript
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  testTimeout: 15000,
};
export default config;
```

## Test Structure

**Evaluator Unit Test Pattern:**
```typescript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { evaluate } from '../evaluate.js';
import { buildFlag, buildContext, buildSegment } from './helpers.js';
import type { Segment } from '../types.js';

describe('evaluate', () => {
  let segments: Map<string, Segment>;

  beforeEach(() => {
    segments = new Map();
  });

  // ─── Section Header ───────────────────────────────────────────────
  describe('flag disabled', () => {
    test('returns offVariation when flag is disabled', () => {
      const flag = buildBooleanFlag('test-flag', false);
      const result = evaluate(flag, buildContext(), segments);
      expect(result).toEqual({
        value: false,
        variationIndex: 0,
        reason: 'FLAG_DISABLED',
      });
    });
  });
});
```

**Table-Driven Test Pattern (used extensively in `clauses.test.ts`):**
```typescript
describe('matchClause - in operator', () => {
  const cases: { name: string; clause: ...; context: ...; expected: boolean }[] = [
    {
      name: 'matches exact string value',
      clause: buildClause('plan', 'in', ['pro', 'enterprise']),
      context: buildContext({ plan: 'pro' }),
      expected: true,
    },
    // ... more cases
  ];

  cases.forEach(({ name, clause, context, expected }) => {
    test(name, () => {
      expect(matchClause(clause, context)).toBe(expected);
    });
  });
});
```

**Server Integration Test Pattern:**
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

let mongod: MongoMemoryServer;
let app: Express;
let authToken: string;
let sdkKey: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Create test user, project, environment
  // Import app and start server
}, 60_000);

afterAll(async () => {
  // Close server, Redis, MongoDB
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  // Clean collections between tests
  await Flag.deleteMany({});
  await Segment.deleteMany({});
});
```

## Test Helpers (Builders)

**Builder Functions (`packages/evaluator/src/tests/helpers.ts`):**
All test data uses builder functions with sensible defaults and override pattern.

```typescript
// Context builder - defaults to { key: 'user-123' }
export function buildContext(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return { key: 'user-123', ...overrides };
}

// Flag builder - defaults to enabled boolean flag
export function buildFlag(key: string, overrides: Partial<Omit<Flag, 'key'>> = {}): Flag {
  return {
    key,
    enabled: true,
    variations: [buildVariation(false), buildVariation(true)],
    offVariation: 0,
    rules: [],
    defaultRule: { variation: 0 },
    ...overrides,
  };
}

// Convenience builders
export function buildBooleanFlag(key: string, enabled = true, defaultOn = false): Flag
export function buildClause(attribute: string, operator: Operator, values: VariationValue[], overrides?): Clause
export function buildRule(id: string, clauses: Clause[], overrides?): Rule
export function buildSegment(key: string, overrides?): Segment
export function buildRollout(variations: ..., bucketBy?: string): Rollout
export function buildVariation(value: VariationValue, overrides?): Variation
```

**Server Integration Helpers (`packages/server/tests/integration/evaluation-flow.test.ts`):**
```typescript
// Unique key generator to avoid collisions
let keyCounter = 0;
function uniqueKey(prefix: string): string {
  return `${prefix}-${++keyCounter}`;
}

// Authenticated request helpers
function dashboardPost(path: string) {
  return request(app).post(path).set('Authorization', `Bearer ${authToken}`);
}
function sdkPost(path: string) {
  return request(app).post(path).set('X-API-Key', sdkKey);
}

// Higher-level helpers that create full resources via API
async function createFlag(overrides = {}): Promise<Flag> { ... }
async function createSegment(overrides = {}): Promise<Segment> { ... }
async function evaluateFlag(flagKey: string, context: Record<string, unknown>) { ... }
```

## Mocking

**Framework:** No dedicated mocking library. Tests use real implementations.

**Evaluator Tests - No Mocks:**
- Pure function tests with no external dependencies
- All data constructed via builder functions
- No mocking needed -- evaluator is a pure computation engine

**Server Integration Tests - In-Memory Infrastructure:**
- `mongodb-memory-server` for MongoDB (no mock, real MongoDB engine)
- Real Express app started on random port (`app.listen(0)`)
- Redis connections cleaned up in `afterAll`
- Dynamic imports used to control module initialization order

**What to Mock:**
- Currently no unit tests requiring mocks exist
- For future server unit tests: mock Redis client, mock Mongoose models

**What NOT to Mock:**
- Evaluation engine (pure functions, test directly)
- MongoDB in integration tests (use `mongodb-memory-server`)
- HTTP layer (use `supertest` against real Express app)

## SSE Testing

**Pattern (`packages/server/tests/integration/evaluation-flow.test.ts`):**
```typescript
interface SSEEvent { event: string; data: string; }

function collectSSEEvents(action: () => Promise<void>): Promise<SSEEvent[]> {
  return new Promise((resolve, reject) => {
    const events: SSEEvent[] = [];
    // 1. Open raw HTTP connection to SSE endpoint
    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/sdk/stream',
      headers: { 'X-API-Key': sdkKey },
    }, (res) => {
      // 2. Wait for heartbeat, then run mutation action
      // 3. Collect events for up to 3 seconds
    });
    setTimeout(() => { req.destroy(); resolve(events); }, 3000);
  });
}

// Usage:
it('should receive flag update event via SSE', async () => {
  const flag = await createFlag({ enabled: false });
  const events = await collectSSEEvents(async () => {
    await dashboardPatch(`/api/v1/flags/${flag.key}/toggle?environmentKey=${environmentKey}`).expect(200);
  });
  const flagEvent = events.find((e) => e.event === 'flag.updated');
  expect(flagEvent).toBeDefined();
});
```

## Coverage

**Requirements:** No enforced threshold

**View Coverage:**
```bash
pnpm -F @featuregate/evaluator test:coverage
```

**Coverage Configuration:**
- Collects from: `src/**/*.ts`
- Excludes: `src/tests/**`, `src/index.ts`

## Test Types

**Unit Tests (Evaluator):**
- Location: `packages/evaluator/src/tests/`
- Scope: Pure function testing of evaluation engine, clause matching, segment membership, hashing
- 4 test files covering all evaluation paths
- Tests: flag disabled, individual targets, rule matching (fixed + rollout), segment targeting, circular segment guards, default rules, error fallback, complex scenarios
- Clause tests cover: `in`, `contains`, `greaterThan`, `semverGreaterThan` operators, fail-closed behavior, negation, unimplemented operators, ReDoS safety

**Integration Tests (Server):**
- Location: `packages/server/tests/integration/`
- Scope: Full API flow from HTTP request through to evaluation result
- 1 test file with 5 test groups:
  1. Basic Flag Evaluation (disabled, fallthrough, individual targets)
  2. Targeting Rules (in operator, top-to-bottom ordering, negated clauses)
  3. Segments + Flag Targeting (full E2E with segments, excluded/included lists)
  4. Percentage Rollouts (deterministic results)
  5. SSE Real-Time Updates (flag and segment update events)

**E2E Tests:**
- Not used. No browser-level testing framework (Playwright, Cypress) configured.

**Dashboard Tests:**
- Not present. No test files exist in `packages/dashboard/`.

**SDK Tests:**
- Not present. SDK package (`packages/sdk-node/`) is a stub.

## Common Patterns

**Async Testing:**
```typescript
// Server integration - async route testing with supertest
it('should return offVariation when flag is disabled', async () => {
  const flag = await createFlag({ enabled: false });
  const result = await evaluateFlag(flag.key, { key: 'user-1' });
  expect(result.value).toBe(false);
  expect(result.reason.kind).toBe('FLAG_DISABLED');
});
```

**Error Testing:**
```typescript
// Testing that invalid input returns error reason
test('returns ERROR when accessing invalid variation index', () => {
  const flag = buildFlag('test-flag', {
    variations: [buildVariation(false)],
    rules: [buildRule('r1', [], { variation: 99 })],
  });
  const result = evaluate(flag, buildContext(), segments);
  expect(result.reason).toBe('ERROR');
  expect(result.variationIndex).toBe(0);
});

// Testing exception behavior
test('invalid semver throws TypeError', () => {
  expect(() => matchClause(
    buildClause('appVersion', 'semverGreaterThan', ['1.0.0']),
    buildContext({ appVersion: 'invalid' }),
  )).toThrow(TypeError);
});
```

**Determinism Testing:**
```typescript
test('same user+flag 100 times produces identical result', () => {
  const results = Array.from({ length: 100 }, () => evaluate(flag, context, segments));
  const firstResult = results[0];
  for (const r of results) {
    expect(r).toEqual(firstResult);
  }
});
```

**Distribution Testing:**
```typescript
test('roughly uniform distribution across 1000 users', () => {
  const keys = generateUserKeys(1000);
  const buckets = [0, 0, 0, 0, 0];
  for (const key of keys) {
    const hash = hashUser(key, 'distribution-test');
    const quintile = Math.min(Math.floor(hash / 20000), 4);
    buckets[quintile]++;
  }
  for (const count of buckets) {
    expect(count).toBeGreaterThan(100);
    expect(count).toBeLessThan(300);
  }
});
```

## Test Data Conventions

**User Keys:** Use descriptive keys: `'user-1'`, `'user-123'`, `'admin-user'`, `'deterministic-user-123'`
**Flag Keys:** Use descriptive keys: `'test-flag'`, `'rollout-flag'`, `'feature-x'`
**Rule IDs:** Use prefixed descriptive IDs: `'r1'`, `'beta-rule'`, `'enterprise-rule'`
**Segment Keys:** Use descriptive keys: `'beta'`, `'enterprise'`, `'gradual'`

## Adding New Tests

**New evaluator unit test:**
1. Create or add to existing file in `packages/evaluator/src/tests/`
2. Import from `@jest/globals` (not global Jest)
3. Import builders from `./helpers.js`
4. Use `describe`/`test` (not `it`) for evaluator tests
5. Use builder functions for all test data

**New server integration test:**
1. Add to `packages/server/tests/integration/` or create new `.test.ts` file
2. Reuse the shared `beforeAll`/`afterAll` setup pattern
3. Use `it` (not `test`) for server integration tests (existing convention)
4. Use `createFlag()`, `createSegment()`, `evaluateFlag()` helpers
5. Use `uniqueKey()` for resource keys to avoid collisions

---

*Testing analysis: 2026-03-08*
