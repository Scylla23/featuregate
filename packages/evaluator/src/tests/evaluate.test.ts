import { describe, test, expect, beforeEach } from '@jest/globals';
import { evaluate } from '../evaluate.js';
import { hashUser, bucketUser } from '../hash.js';
import {
  buildFlag,
  buildBooleanFlag,
  buildContext,
  buildSegment,
  buildRule,
  buildClause,
  buildRollout,
  buildVariation,
} from './helpers.js';
import type { Segment } from '../types.js';

describe('evaluate', () => {
  let segments: Map<string, Segment>;

  beforeEach(() => {
    segments = new Map();
  });

  // ─── Flag Disabled ───────────────────────────────────────────────

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

    test('ignores individual targets when flag is disabled', () => {
      const flag = buildFlag('test-flag', {
        enabled: false,
        individualTargets: [{ variation: 1, values: ['user-123'] }],
      });
      const result = evaluate(flag, buildContext({ key: 'user-123' }), segments);
      expect(result.reason).toBe('FLAG_DISABLED');
      expect(result.variationIndex).toBe(0);
    });

    test('returns correct offVariation for multivariate flag', () => {
      const flag = buildFlag('mv-flag', {
        enabled: false,
        variations: [
          buildVariation('A'),
          buildVariation('B'),
          buildVariation('C'),
        ],
        offVariation: 2,
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result).toEqual({
        value: 'C',
        variationIndex: 2,
        reason: 'FLAG_DISABLED',
      });
    });
  });

  // ─── Individual Targets ──────────────────────────────────────────

  describe('individual targets', () => {
    test('targets specific user by key', () => {
      const flag = buildFlag('test-flag', {
        individualTargets: [{ variation: 1, values: ['user-1', 'user-2'] }],
      });
      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result).toEqual({
        value: true,
        variationIndex: 1,
        reason: 'INDIVIDUAL_TARGET',
      });
    });

    test('user not in target list falls through to default', () => {
      const flag = buildFlag('test-flag', {
        individualTargets: [{ variation: 1, values: ['user-2'] }],
        defaultRule: { variation: 0 },
      });
      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result.reason).toBe('DEFAULT');
    });

    test('first matching target wins', () => {
      const flag = buildFlag('test-flag', {
        variations: [
          buildVariation('off'),
          buildVariation('target-1'),
          buildVariation('target-2'),
        ],
        individualTargets: [
          { variation: 1, values: ['user-1'] },
          { variation: 2, values: ['user-1'] },
        ],
      });
      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result.variationIndex).toBe(1);
      expect(result.value).toBe('target-1');
    });

    test('targets have priority over rules', () => {
      const flag = buildFlag('test-flag', {
        individualTargets: [{ variation: 1, values: ['user-1'] }],
        rules: [
          buildRule('r1', [buildClause('key', 'in', ['user-1'])], { variation: 0 }),
        ],
      });
      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result.reason).toBe('INDIVIDUAL_TARGET');
      expect(result.variationIndex).toBe(1);
    });
  });

  // ─── Rule Matching — Fixed Variation ─────────────────────────────

  describe('rule matching - fixed variation', () => {
    test('single clause rule match', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('beta-rule', [buildClause('plan', 'in', ['pro'])], { variation: 1 }),
        ],
      });
      const result = evaluate(flag, buildContext({ plan: 'pro' }), segments);
      expect(result).toEqual({
        value: true,
        variationIndex: 1,
        reason: 'RULE_MATCH',
        ruleIndex: 0,
        ruleId: 'beta-rule',
      });
    });

    test('multi-clause AND logic — all clauses must match', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('geo-plan', [
            buildClause('plan', 'in', ['pro']),
            buildClause('country', 'in', ['US']),
          ], { variation: 1 }),
        ],
      });
      const result = evaluate(
        flag,
        buildContext({ plan: 'pro', country: 'US' }),
        segments,
      );
      expect(result.reason).toBe('RULE_MATCH');
    });

    test('multi-clause AND logic — one clause fails, rule skipped', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('geo-plan', [
            buildClause('plan', 'in', ['pro']),
            buildClause('country', 'in', ['US']),
          ], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });
      const result = evaluate(
        flag,
        buildContext({ plan: 'pro', country: 'CA' }),
        segments,
      );
      expect(result.reason).toBe('DEFAULT');
    });

    test('multiple rules — first match wins', () => {
      const flag = buildFlag('test-flag', {
        variations: [
          buildVariation('off'),
          buildVariation('rule-1'),
          buildVariation('rule-2'),
        ],
        rules: [
          buildRule('r1', [buildClause('plan', 'in', ['pro'])], { variation: 1 }),
          buildRule('r2', [buildClause('plan', 'in', ['pro'])], { variation: 2 }),
        ],
      });
      const result = evaluate(flag, buildContext({ plan: 'pro' }), segments);
      expect(result.variationIndex).toBe(1);
      expect(result.ruleIndex).toBe(0);
      expect(result.ruleId).toBe('r1');
    });

    test('empty clauses array matches (vacuous truth)', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('empty-rule', [], { variation: 1 }),
        ],
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result.reason).toBe('RULE_MATCH');
      expect(result.variationIndex).toBe(1);
    });
  });

  // ─── Rule Matching — Rollout ─────────────────────────────────────

  describe('rule matching - rollout', () => {
    test('100% rollout to variation 1', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('plan', 'in', ['pro'])], {
            rollout: buildRollout([{ variation: 1, weight: 100000 }]),
          }),
        ],
      });
      const result = evaluate(flag, buildContext({ plan: 'pro' }), segments);
      expect(result.reason).toBe('ROLLOUT');
      expect(result.variationIndex).toBe(1);
      expect(result.ruleIndex).toBe(0);
      expect(result.ruleId).toBe('r1');
    });

    test('uses custom bucketBy attribute', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('plan', 'in', ['pro'])], {
            rollout: buildRollout(
              [{ variation: 0, weight: 50000 }, { variation: 1, weight: 50000 }],
              'orgId',
            ),
          }),
        ],
      });
      // Verify the result is consistent with hashing orgId
      const context = buildContext({ key: 'user-1', plan: 'pro', orgId: 'org-42' });
      const expectedBucket = hashUser('org-42', 'test-flag');
      const expectedVariation = bucketUser(expectedBucket, [
        { variation: 0, weight: 50000 },
        { variation: 1, weight: 50000 },
      ]);

      const result = evaluate(flag, context, segments);
      expect(result.variationIndex).toBe(expectedVariation);
      expect(result.reason).toBe('ROLLOUT');
    });

    test('determinism — same user+flag 100 times produces identical result', () => {
      const flag = buildFlag('rollout-flag', {
        rules: [],
        defaultRule: {
          rollout: buildRollout([
            { variation: 0, weight: 50000 },
            { variation: 1, weight: 50000 },
          ]),
        },
      });
      const context = buildContext({ key: 'determinism-test-user' });
      const results = Array.from({ length: 100 }, () => evaluate(flag, context, segments));
      const firstResult = results[0];
      for (const r of results) {
        expect(r).toEqual(firstResult);
      }
    });
  });

  // ─── Segment Targeting ───────────────────────────────────────────

  describe('segment targeting', () => {
    test('segment:beta clause with user in included list', () => {
      const betaSegment = buildSegment('beta', { included: ['user-1'] });
      segments.set('beta', betaSegment);

      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('segment:beta', 'in', [true])], { variation: 1 }),
        ],
      });
      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result.reason).toBe('RULE_MATCH');
      expect(result.variationIndex).toBe(1);
    });

    test('segment:beta with user excluded from segment', () => {
      const betaSegment = buildSegment('beta', { excluded: ['user-1'] });
      segments.set('beta', betaSegment);

      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('segment:beta', 'in', [true])], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });
      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result.reason).toBe('DEFAULT');
    });

    test('missing segment key in segments map → clause fails', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('segment:nonexistent', 'in', [true])], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result.reason).toBe('DEFAULT');
    });

    test('negated segment clause — user NOT in segment matches', () => {
      const betaSegment = buildSegment('beta', { included: ['user-2'] });
      segments.set('beta', betaSegment);

      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [
            buildClause('segment:beta', 'in', [true], { negate: true }),
          ], { variation: 1 }),
        ],
      });
      // user-1 is NOT in beta segment, negate=true → clause matches
      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result.reason).toBe('RULE_MATCH');
      expect(result.variationIndex).toBe(1);
    });

    test('segment with rollout rule — user in rollout bucket', () => {
      const rolloutSegment = buildSegment('gradual', {
        rules: [
          buildRule('sr1', [buildClause('plan', 'in', ['pro'])], {
            rollout: buildRollout([{ variation: 0, weight: 100000 }]), // 100%
          }),
        ],
      });
      segments.set('gradual', rolloutSegment);

      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('segment:gradual', 'in', [true])], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });
      const result = evaluate(
        flag,
        buildContext({ key: 'user-1', plan: 'pro' }),
        segments,
      );
      expect(result.reason).toBe('RULE_MATCH');
      expect(result.variationIndex).toBe(1);
    });

    test('segment with rollout rule — user outside rollout bucket', () => {
      const rolloutSegment = buildSegment('gradual', {
        rules: [
          buildRule('sr1', [buildClause('plan', 'in', ['pro'])], {
            rollout: buildRollout([{ variation: 0, weight: 0 }]), // 0%
          }),
        ],
      });
      segments.set('gradual', rolloutSegment);

      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('segment:gradual', 'in', [true])], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });
      const result = evaluate(
        flag,
        buildContext({ key: 'user-1', plan: 'pro' }),
        segments,
      );
      expect(result.reason).toBe('DEFAULT');
    });
  });

  // ─── Circular Segment Depth Guard ────────────────────────────────

  describe('circular segment depth guard', () => {
    test('circular segment reference returns false at max depth', () => {
      // Segment A references Segment B, Segment B references Segment A
      const segA = buildSegment('seg-a', {
        rules: [
          buildRule('sa1', [buildClause('segment:seg-b', 'in', [true])]),
        ],
      });
      const segB = buildSegment('seg-b', {
        rules: [
          buildRule('sb1', [buildClause('segment:seg-a', 'in', [true])]),
        ],
      });
      segments.set('seg-a', segA);
      segments.set('seg-b', segB);

      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('segment:seg-a', 'in', [true])], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });

      // Should not crash/infinite loop — hits max depth, returns false
      const result = evaluate(flag, buildContext(), segments);
      expect(result.reason).toBe('DEFAULT');
    });

    test('deeply nested segments resolve within max depth', () => {
      // Chain: seg-a → seg-b → seg-c → user is included in seg-c
      const segC = buildSegment('seg-c', { included: ['user-1'] });
      const segB = buildSegment('seg-b', {
        rules: [
          buildRule('sb1', [buildClause('segment:seg-c', 'in', [true])]),
        ],
      });
      const segA = buildSegment('seg-a', {
        rules: [
          buildRule('sa1', [buildClause('segment:seg-b', 'in', [true])]),
        ],
      });
      segments.set('seg-a', segA);
      segments.set('seg-b', segB);
      segments.set('seg-c', segC);

      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('segment:seg-a', 'in', [true])], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });

      const result = evaluate(flag, buildContext({ key: 'user-1' }), segments);
      expect(result.reason).toBe('RULE_MATCH');
      expect(result.variationIndex).toBe(1);
    });
  });

  // ─── Default Rule ────────────────────────────────────────────────

  describe('default rule', () => {
    test('returns fixed default variation', () => {
      const flag = buildFlag('test-flag', {
        rules: [],
        defaultRule: { variation: 1 },
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result).toEqual({
        value: true,
        variationIndex: 1,
        reason: 'DEFAULT',
      });
    });

    test('returns default rollout', () => {
      const flag = buildFlag('rollout-flag', {
        rules: [],
        defaultRule: {
          rollout: buildRollout([{ variation: 1, weight: 100000 }]),
        },
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result.reason).toBe('DEFAULT_ROLLOUT');
      expect(result.variationIndex).toBe(1);
    });
  });

  // ─── Error Fallback ──────────────────────────────────────────────

  describe('error fallback', () => {
    test('returns ERROR when no evaluation path found (empty defaultRule)', () => {
      const flag = buildFlag('test-flag', {
        rules: [],
        defaultRule: {},
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result).toEqual({
        value: false,
        variationIndex: 0,
        reason: 'ERROR',
      });
    });

    test('returns ERROR when accessing invalid variation index', () => {
      const flag = buildFlag('test-flag', {
        variations: [buildVariation(false)],
        rules: [
          buildRule('r1', [], { variation: 99 }), // index 99 doesn't exist
        ],
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result.reason).toBe('ERROR');
      expect(result.variationIndex).toBe(0);
    });

    test('ERROR fallback uses offVariation', () => {
      const flag = buildFlag('test-flag', {
        variations: [
          buildVariation('fallback-off'),
          buildVariation('safe-value'),
        ],
        offVariation: 1,
        rules: [],
        defaultRule: {},
      });
      const result = evaluate(flag, buildContext(), segments);
      expect(result).toEqual({
        value: 'safe-value',
        variationIndex: 1,
        reason: 'ERROR',
      });
    });
  });

  // ─── Complex Scenarios ───────────────────────────────────────────

  describe('complex scenarios', () => {
    test('full pipeline: targets + rules + segment + rollout + default', () => {
      // Setup: flag with multiple evaluation paths
      const enterpriseSegment = buildSegment('enterprise', {
        rules: [
          buildRule('s1', [buildClause('plan', 'in', ['enterprise'])]),
        ],
      });
      segments.set('enterprise', enterpriseSegment);

      const flag = buildFlag('feature-x', {
        variations: [
          buildVariation('off'),
          buildVariation('basic'),
          buildVariation('premium'),
          buildVariation('admin'),
        ],
        offVariation: 0,
        individualTargets: [
          { variation: 3, values: ['admin-user'] },
        ],
        rules: [
          // Rule 0: enterprise segment gets premium
          buildRule('enterprise-rule', [
            buildClause('segment:enterprise', 'in', [true]),
          ], { variation: 2 }),
          // Rule 1: pro users get 100% rollout to basic
          buildRule('pro-rule', [
            buildClause('plan', 'in', ['pro']),
          ], {
            rollout: buildRollout([{ variation: 1, weight: 100000 }]),
          }),
        ],
        defaultRule: { variation: 0 },
      });

      // Admin user → INDIVIDUAL_TARGET
      const adminResult = evaluate(flag, buildContext({ key: 'admin-user', plan: 'free' }), segments);
      expect(adminResult.reason).toBe('INDIVIDUAL_TARGET');
      expect(adminResult.variationIndex).toBe(3);
      expect(adminResult.value).toBe('admin');

      // Enterprise user → RULE_MATCH (segment)
      const entResult = evaluate(flag, buildContext({ key: 'user-ent', plan: 'enterprise' }), segments);
      expect(entResult.reason).toBe('RULE_MATCH');
      expect(entResult.variationIndex).toBe(2);
      expect(entResult.value).toBe('premium');

      // Pro user → ROLLOUT
      const proResult = evaluate(flag, buildContext({ key: 'user-pro', plan: 'pro' }), segments);
      expect(proResult.reason).toBe('ROLLOUT');
      expect(proResult.variationIndex).toBe(1);
      expect(proResult.value).toBe('basic');

      // Free user → DEFAULT
      const freeResult = evaluate(flag, buildContext({ key: 'user-free', plan: 'free' }), segments);
      expect(freeResult.reason).toBe('DEFAULT');
      expect(freeResult.variationIndex).toBe(0);
      expect(freeResult.value).toBe('off');
    });

    test('boolean flag vs multivariate flag returns correct types', () => {
      const boolFlag = buildBooleanFlag('bool-flag', true, true);
      const boolResult = evaluate(boolFlag, buildContext(), segments);
      expect(typeof boolResult.value).toBe('boolean');
      expect(boolResult.value).toBe(true);

      const mvFlag = buildFlag('mv-flag', {
        variations: [
          buildVariation('control'),
          buildVariation('variant-a'),
          buildVariation('variant-b'),
        ],
        defaultRule: { variation: 1 },
      });
      const mvResult = evaluate(mvFlag, buildContext(), segments);
      expect(typeof mvResult.value).toBe('string');
      expect(mvResult.value).toBe('variant-a');
    });

    test('context with missing attributes used in rules — clause fails closed', () => {
      const flag = buildFlag('test-flag', {
        rules: [
          buildRule('r1', [buildClause('country', 'in', ['US'])], { variation: 1 }),
        ],
        defaultRule: { variation: 0 },
      });
      // Context has no 'country' attribute
      const result = evaluate(flag, buildContext(), segments);
      expect(result.reason).toBe('DEFAULT');
    });
  });
});
