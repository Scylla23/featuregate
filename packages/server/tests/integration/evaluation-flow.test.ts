import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import http from 'http';
import request from 'supertest';
import type { Express } from 'express';

// ---------------------------------------------------------------------------
// Shared test state
// ---------------------------------------------------------------------------

let mongod: MongoMemoryServer;
let app: Express;
let server: http.Server;
let serverPort: number;

let authToken: string;
let sdkKey: string;
let projectId: string;
let environmentKey: string;

// Unique key counter to avoid collisions between tests
let keyCounter = 0;
function uniqueKey(prefix: string): string {
  return `${prefix}-${++keyCounter}`;
}

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // 1. Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();
  await mongoose.connect(mongoUri);

  // 2. Import models and helpers after connection is established
  const { User } = await import('../../src/models/User.js');
  const { Project } = await import('../../src/models/Project.js');
  const { Environment } = await import('../../src/models/Environment.js');
  const { signJwt } = await import('../../src/middleware/auth.js');

  // 3. Create test user and generate JWT
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash('testpassword', 4);
  const user = await User.create({
    email: 'test@featuregate.dev',
    hashedPassword,
    name: 'Test User',
    role: 'admin',
  });

  authToken = signJwt({
    userId: user._id.toString(),
    email: user.email,
    role: 'admin',
  });

  // 4. Create test project and environment
  const project = await Project.create({ key: 'test-project', name: 'Test Project' });
  projectId = project._id.toString();

  sdkKey = 'test-sdk-key-integration';
  environmentKey = 'test-env';

  await Environment.create({
    key: environmentKey,
    name: 'Test Environment',
    projectId: project._id,
    sdkKey,
  });

  // 5. Import app and start server (needed for SSE tests)
  const appModule = await import('../../src/app.js');
  app = appModule.default;
  server = app.listen(0);
  const addr = server.address() as { port: number };
  serverPort = addr.port;
}, 60_000);

afterAll(async () => {
  // Close server
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Close Redis connections
  try {
    const { closeRedis } = await import('../../src/config/redis.js');
    const { closePublisher } = await import('../../src/sse/publisher.js');
    await closePublisher();
    await closeRedis();
  } catch {
    // Redis may not have been initialized
  }

  // Disconnect MongoDB and stop in-memory server
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  const { Flag } = await import('../../src/models/Flag.js');
  const { FlagConfig } = await import('../../src/models/FlagConfig.js');
  const { Segment } = await import('../../src/models/Segment.js');
  const { SegmentConfig } = await import('../../src/models/SegmentConfig.js');
  await Flag.deleteMany({});
  await FlagConfig.deleteMany({});
  await Segment.deleteMany({});
  await SegmentConfig.deleteMany({});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** POST to dashboard API with JWT auth */
function dashboardPost(path: string) {
  return request(app).post(path).set('Authorization', `Bearer ${authToken}`);
}

/** PATCH to dashboard API with JWT auth */
function dashboardPatch(path: string) {
  return request(app).patch(path).set('Authorization', `Bearer ${authToken}`);
}

/** DELETE to dashboard API with JWT auth */
function dashboardDelete(path: string) {
  return request(app).delete(path).set('Authorization', `Bearer ${authToken}`);
}

/** POST to SDK API with SDK key auth */
function sdkPost(path: string) {
  return request(app).post(path).set('X-API-Key', sdkKey);
}

/**
 * Create a boolean flag via the dashboard API and optionally configure its
 * per-environment targeting (enabled, rules, targets, fallthrough).
 */
async function createFlag(overrides: Record<string, unknown> = {}) {
  const key = (overrides.key as string) || uniqueKey('flag');

  // Separate project-level fields from config-level fields
  const {
    enabled,
    targets,
    rules,
    ...rest
  } = overrides;

  const flagBody = {
    key,
    name: `Flag ${key}`,
    projectId,
    variations: [{ value: true }, { value: false }],
    offVariation: 1,
    fallthrough: rest.fallthrough ?? { variation: 0 },
    ...rest,
  };
  // Remove config-only fields that leaked into flag body
  delete flagBody.included;
  delete flagBody.excluded;

  const res = await dashboardPost('/api/v1/flags').send(flagBody).expect(201);
  const flag = res.body;

  // If targeting config was provided, update the FlagConfig for the test environment
  const configUpdate: Record<string, unknown> = {};
  if (enabled !== undefined) configUpdate.enabled = enabled;
  if (targets !== undefined) configUpdate.targets = targets;
  if (rules !== undefined) configUpdate.rules = rules;
  if (overrides.fallthrough !== undefined) configUpdate.fallthrough = overrides.fallthrough;

  if (Object.keys(configUpdate).length > 0) {
    await dashboardPatch(`/api/v1/flags/${key}/config/${environmentKey}`)
      .send(configUpdate)
      .expect(200);
  }

  return flag;
}

/**
 * Create a segment via the dashboard API and optionally configure its
 * per-environment settings (included, excluded, rules).
 */
async function createSegment(overrides: Record<string, unknown> = {}) {
  const key = (overrides.key as string) || uniqueKey('segment');

  // Separate project-level fields from config-level fields
  const {
    included,
    excluded,
    rules,
    ...rest
  } = overrides;

  const segmentBody = {
    key,
    name: `Segment ${key}`,
    projectId,
    ...rest,
  };
  // Remove config-only fields
  delete segmentBody.included;
  delete segmentBody.excluded;
  delete segmentBody.rules;

  const res = await dashboardPost('/api/v1/segments').send(segmentBody).expect(201);
  const segment = res.body;

  // If config was provided, update the SegmentConfig for the test environment
  const configUpdate: Record<string, unknown> = {};
  if (included !== undefined) configUpdate.included = included;
  if (excluded !== undefined) configUpdate.excluded = excluded;
  if (rules !== undefined) configUpdate.rules = rules;

  if (Object.keys(configUpdate).length > 0) {
    await dashboardPatch(`/api/v1/segments/${key}/config/${environmentKey}`)
      .send(configUpdate)
      .expect(200);
  }

  return segment;
}

/** Evaluate a flag via the SDK API */
async function evaluateFlag(flagKey: string, context: Record<string, unknown>) {
  const res = await sdkPost('/api/v1/sdk/evaluate').send({ flagKey, context }).expect(200);
  return res.body;
}

// ==========================================================================
// TEST GROUPS
// ==========================================================================

describe('Evaluation Flow Integration', () => {
  // -----------------------------------------------------------------------
  // Group 1: Basic Flag Evaluation
  // -----------------------------------------------------------------------

  describe('Basic Flag Evaluation', () => {
    it('should return offVariation when flag is disabled', async () => {
      const flag = await createFlag({ enabled: false });

      const result = await evaluateFlag(flag.key, { key: 'user-1' });

      expect(result.value).toBe(false);
      expect(result.reason.kind).toBe('FLAG_DISABLED');
    });

    it('should return fallthrough variation when flag is enabled with no rules', async () => {
      const flag = await createFlag({
        enabled: true,
        fallthrough: { variation: 0 },
      });

      const result = await evaluateFlag(flag.key, { key: 'user-1' });

      expect(result.value).toBe(true);
      expect(result.reason.kind).toBe('DEFAULT');
    });

    it('should match individual target', async () => {
      const flag = await createFlag({
        enabled: true,
        targets: [{ variation: 0, values: ['user-42'] }],
        fallthrough: { variation: 1 },
      });

      // user-42 should match the target
      const match = await evaluateFlag(flag.key, { key: 'user-42' });
      expect(match.value).toBe(true);
      expect(match.reason.kind).toBe('INDIVIDUAL_TARGET');

      // user-999 should fall through
      const miss = await evaluateFlag(flag.key, { key: 'user-999' });
      expect(miss.value).toBe(false);
      expect(miss.reason.kind).toBe('DEFAULT');
    });
  });

  // -----------------------------------------------------------------------
  // Group 2: Targeting Rules
  // -----------------------------------------------------------------------

  describe('Targeting Rules', () => {
    it("should match a targeting rule with 'in' operator", async () => {
      const flag = await createFlag({
        enabled: true,
        rules: [
          {
            id: 'rule-1',
            clauses: [{ attribute: 'plan', operator: 'in', values: ['enterprise'] }],
            rollout: { variation: 0 },
          },
        ],
        fallthrough: { variation: 1 },
      });

      // Enterprise user matches rule
      const match = await evaluateFlag(flag.key, { key: 'user-1', plan: 'enterprise' });
      expect(match.value).toBe(true);
      expect(match.reason.kind).toBe('RULE_MATCH');
      expect(match.reason.ruleIndex).toBe(0);

      // Free user falls through
      const miss = await evaluateFlag(flag.key, { key: 'user-2', plan: 'free' });
      expect(miss.value).toBe(false);
      expect(miss.reason.kind).toBe('DEFAULT');
    });

    it('should evaluate rules top-to-bottom and return first match', async () => {
      const flag = await createFlag({
        enabled: true,
        variations: [{ value: 'enterprise-val' }, { value: 'us-val' }, { value: 'default' }],
        offVariation: 2,
        rules: [
          {
            id: 'rule-enterprise',
            clauses: [{ attribute: 'plan', operator: 'in', values: ['enterprise'] }],
            rollout: { variation: 0 },
          },
          {
            id: 'rule-us',
            clauses: [{ attribute: 'country', operator: 'in', values: ['US'] }],
            rollout: { variation: 1 },
          },
        ],
        fallthrough: { variation: 2 },
      });

      // User matches BOTH rules, but rule 0 should win
      const result = await evaluateFlag(flag.key, {
        key: 'user-1',
        plan: 'enterprise',
        country: 'US',
      });
      expect(result.value).toBe('enterprise-val');
      expect(result.reason.ruleIndex).toBe(0);
    });

    it('should support negated clauses', async () => {
      const flag = await createFlag({
        enabled: true,
        rules: [
          {
            id: 'rule-not-cn',
            clauses: [{ attribute: 'country', operator: 'in', values: ['CN'], negate: true }],
            rollout: { variation: 0 },
          },
        ],
        fallthrough: { variation: 1 },
      });

      // US user matches (NOT in CN)
      const match = await evaluateFlag(flag.key, { key: 'user-1', country: 'US' });
      expect(match.value).toBe(true);
      expect(match.reason.kind).toBe('RULE_MATCH');

      // CN user does NOT match
      const miss = await evaluateFlag(flag.key, { key: 'user-2', country: 'CN' });
      expect(miss.value).toBe(false);
      expect(miss.reason.kind).toBe('DEFAULT');
    });
  });

  // -----------------------------------------------------------------------
  // Group 3: Segments + Flag Targeting (E2E)
  // -----------------------------------------------------------------------

  describe('Segments + Flag Targeting', () => {
    it('should evaluate flag with segment-based targeting rule (full flow)', async () => {
      // 1. Create segment with rules requiring plan=enterprise AND betaOptIn=true
      const segment = await createSegment({
        key: uniqueKey('beta-testers'),
        name: 'Beta Testers',
        rules: [
          {
            id: 'seg-rule-1',
            clauses: [
              { attribute: 'plan', operator: 'in', values: ['enterprise'] },
              { attribute: 'betaOptIn', operator: 'in', values: [true] },
            ],
          },
        ],
      });

      // 2. Create flag targeting the segment (using ObjectId for full E2E transformer coverage)
      const flag = await createFlag({
        key: uniqueKey('new-checkout'),
        enabled: true,
        rules: [
          {
            id: 'rule-segment',
            clauses: [
              {
                attribute: 'segmentMatch',
                operator: 'in',
                values: [segment._id],
              },
            ],
            rollout: { variation: 0 },
          },
        ],
        fallthrough: { variation: 1 },
      });

      // 3. Evaluate: matching context
      const match = await evaluateFlag(flag.key, {
        key: 'user-1',
        plan: 'enterprise',
        betaOptIn: true,
      });
      expect(match.value).toBe(true);
      expect(match.reason.kind).toBe('RULE_MATCH');

      // 4. Evaluate: non-matching context
      const miss = await evaluateFlag(flag.key, {
        key: 'user-2',
        plan: 'free',
        betaOptIn: false,
      });
      expect(miss.value).toBe(false);
      expect(miss.reason.kind).toBe('DEFAULT');
    });

    it('should respect segment excluded list', async () => {
      // Create segment that would match enterprise+betaOptIn, but excludes user-blocked
      const segment = await createSegment({
        key: uniqueKey('beta-seg'),
        name: 'Beta Segment',
        excluded: ['user-blocked'],
        rules: [
          {
            id: 'seg-rule-1',
            clauses: [
              { attribute: 'plan', operator: 'in', values: ['enterprise'] },
              { attribute: 'betaOptIn', operator: 'in', values: [true] },
            ],
          },
        ],
      });

      const flag = await createFlag({
        key: uniqueKey('excluded-test'),
        enabled: true,
        rules: [
          {
            id: 'rule-segment',
            clauses: [{ attribute: 'segmentMatch', operator: 'in', values: [segment._id] }],
            rollout: { variation: 0 },
          },
        ],
        fallthrough: { variation: 1 },
      });

      // user-blocked should NOT match (excluded takes priority)
      const result = await evaluateFlag(flag.key, {
        key: 'user-blocked',
        plan: 'enterprise',
        betaOptIn: true,
      });
      expect(result.value).toBe(false);
      expect(result.reason.kind).toBe('DEFAULT');
    });

    it('should respect segment included list', async () => {
      // Create segment with included list; rules that user-vip does NOT match
      const segment = await createSegment({
        key: uniqueKey('vip-seg'),
        name: 'VIP Segment',
        included: ['user-vip'],
        rules: [
          {
            id: 'seg-rule-1',
            clauses: [{ attribute: 'plan', operator: 'in', values: ['enterprise'] }],
          },
        ],
      });

      const flag = await createFlag({
        key: uniqueKey('included-test'),
        enabled: true,
        rules: [
          {
            id: 'rule-segment',
            clauses: [{ attribute: 'segmentMatch', operator: 'in', values: [segment._id] }],
            rollout: { variation: 0 },
          },
        ],
        fallthrough: { variation: 1 },
      });

      // user-vip is on included list despite plan=free (doesn't match rules)
      const result = await evaluateFlag(flag.key, {
        key: 'user-vip',
        plan: 'free',
      });
      expect(result.value).toBe(true);
      expect(result.reason.kind).toBe('RULE_MATCH');
    });
  });

  // -----------------------------------------------------------------------
  // Group 4: Percentage Rollouts
  // -----------------------------------------------------------------------

  describe('Percentage Rollouts', () => {
    it('should produce deterministic results for percentage rollouts', async () => {
      const flag = await createFlag({
        enabled: true,
        fallthrough: {
          rollout: {
            variations: [
              { variation: 0, weight: 50000 },
              { variation: 1, weight: 50000 },
            ],
          },
        },
      });

      const userKey = 'deterministic-user-123';
      const results: unknown[] = [];

      for (let i = 0; i < 10; i++) {
        const result = await evaluateFlag(flag.key, { key: userKey });
        results.push(result.value);
      }

      // All 10 evaluations should produce the same result (deterministic hashing)
      expect(new Set(results).size).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Group 5: SSE Real-Time Updates
  // -----------------------------------------------------------------------

  describe('SSE Real-Time Updates', () => {
    it('should receive flag update event via SSE when a flag is modified', async () => {
      // 1. Create a flag to modify later
      const flag = await createFlag({ enabled: false });

      // 2. Open SSE connection
      const events = await collectSSEEvents(async () => {
        // 3. Toggle the flag (triggers publish) — now requires environmentKey
        await dashboardPatch(`/api/v1/flags/${flag.key}/toggle?environmentKey=${environmentKey}`).expect(200);
      });

      // 4. Assert we received a flag.updated event
      const flagEvent = events.find((e) => e.event === 'flag.updated');
      expect(flagEvent).toBeDefined();
      expect(JSON.parse(flagEvent!.data).key).toBe(flag.key);
    });

    it('should receive segment update event via SSE when a segment config is modified', async () => {
      // 1. Create a segment to modify later
      const segment = await createSegment();

      // 2. Open SSE connection and patch segment config
      const events = await collectSSEEvents(async () => {
        await dashboardPatch(`/api/v1/segments/${segment.key}/config/${environmentKey}`)
          .send({ included: ['user-test'] })
          .expect(200);
      });

      // 3. Assert we received a segment.updated event
      const segEvent = events.find((e) => e.event === 'segment.updated');
      expect(segEvent).toBeDefined();
      expect(JSON.parse(segEvent!.data).key).toBe(segment.key);
    });
  });
});

// ---------------------------------------------------------------------------
// SSE Helper
// ---------------------------------------------------------------------------

interface SSEEvent {
  event: string;
  data: string;
}

/**
 * Opens an SSE connection, waits for the initial heartbeat,
 * runs the provided action, then collects events for up to 2 seconds.
 */
function collectSSEEvents(action: () => Promise<void>): Promise<SSEEvent[]> {
  return new Promise((resolve, reject) => {
    const events: SSEEvent[] = [];
    let buffer = '';
    let heartbeatReceived = false;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: serverPort,
        path: '/api/v1/sdk/stream',
        method: 'GET',
        headers: { 'X-API-Key': sdkKey },
      },
      (res) => {
        res.setEncoding('utf8');

        res.on('data', (chunk: string) => {
          buffer += chunk;
          const messages = buffer.split('\n\n');
          // Keep the last (possibly incomplete) chunk in the buffer
          buffer = messages.pop() || '';

          for (const msg of messages) {
            if (!msg.trim()) continue;
            const parsed = parseSSEMessage(msg);
            if (!parsed) continue;

            if (parsed.event === 'heartbeat' && !heartbeatReceived) {
              heartbeatReceived = true;
              // Heartbeat received — run the mutation action
              action().catch(reject);
            } else {
              events.push(parsed);
            }
          }
        });

        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.end();

    // Wait up to 3 seconds for events, then close
    setTimeout(() => {
      req.destroy();
      resolve(events);
    }, 3000);
  });
}

function parseSSEMessage(raw: string): SSEEvent | null {
  let event = '';
  let data = '';

  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) {
      event = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      data = line.slice(6).trim();
    }
  }

  if (!event) return null;
  return { event, data };
}
