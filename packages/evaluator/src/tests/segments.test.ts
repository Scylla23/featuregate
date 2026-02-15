import { describe, test, expect } from '@jest/globals';
import { isUserInSegment } from '../segments.js';
import { buildContext, buildSegment, buildRule, buildClause, buildRollout } from './helpers.js';
import { hashUser } from '../hash.js';

describe('isUserInSegment', () => {
  test('excluded user returns false even if also in included list', () => {
    const segment = buildSegment('beta', {
      included: ['user-1'],
      excluded: ['user-1'],
    });
    expect(isUserInSegment(buildContext({ key: 'user-1' }), segment)).toBe(false);
  });

  test('included user returns true even if rules would not match', () => {
    const segment = buildSegment('beta', {
      included: ['user-1'],
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['enterprise'])]),
      ],
    });
    // user-1 has no 'plan' attribute, but is in included list
    expect(isUserInSegment(buildContext({ key: 'user-1' }), segment)).toBe(true);
  });

  test('user matching one rule returns true', () => {
    const segment = buildSegment('pro-users', {
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['pro'])]),
      ],
    });
    expect(isUserInSegment(buildContext({ key: 'user-1', plan: 'pro' }), segment)).toBe(true);
  });

  test('user matching no rules returns false', () => {
    const segment = buildSegment('pro-users', {
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['enterprise'])]),
      ],
    });
    expect(isUserInSegment(buildContext({ key: 'user-1', plan: 'free' }), segment)).toBe(false);
  });

  test('multiple clauses in rule use AND logic', () => {
    const segment = buildSegment('premium-us', {
      rules: [
        buildRule('r1', [
          buildClause('plan', 'in', ['pro']),
          buildClause('country', 'in', ['US']),
        ]),
      ],
    });
    // Both match
    expect(isUserInSegment(
      buildContext({ key: 'user-1', plan: 'pro', country: 'US' }),
      segment,
    )).toBe(true);

    // Only one matches
    expect(isUserInSegment(
      buildContext({ key: 'user-1', plan: 'pro', country: 'CA' }),
      segment,
    )).toBe(false);
  });

  test('multiple rules use OR logic', () => {
    const segment = buildSegment('eligible', {
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['enterprise'])]),
        buildRule('r2', [buildClause('plan', 'in', ['pro'])]),
      ],
    });
    // Matches second rule
    expect(isUserInSegment(buildContext({ key: 'user-1', plan: 'pro' }), segment)).toBe(true);
  });

  test('empty rules and empty included list → not in segment', () => {
    const segment = buildSegment('empty');
    expect(isUserInSegment(buildContext({ key: 'user-1' }), segment)).toBe(false);
  });

  test('segment rule with rollout — user in bucket', () => {
    const segment = buildSegment('gradual', {
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['pro'])], {
          rollout: buildRollout([{ variation: 0, weight: 100000 }]), // 100% rollout
        }),
      ],
    });
    expect(isUserInSegment(buildContext({ key: 'user-1', plan: 'pro' }), segment)).toBe(true);
  });

  test('segment rule with rollout — user outside bucket (0% rollout)', () => {
    const segment = buildSegment('gradual', {
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['pro'])], {
          rollout: buildRollout([{ variation: 0, weight: 0 }]), // 0% rollout
        }),
      ],
    });
    expect(isUserInSegment(buildContext({ key: 'user-1', plan: 'pro' }), segment)).toBe(false);
  });

  test('segment rule rollout uses segment key as salt', () => {
    // Verify that the hash uses segment.key as salt by checking a known hash value
    const context = buildContext({ key: 'user-1' });
    const segmentKey = 'rollout-test';
    const expectedBucket = hashUser('user-1', segmentKey);

    // Create a rollout where weight is exactly expectedBucket + 1 (user should be in)
    const segment = buildSegment(segmentKey, {
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['pro'])], {
          rollout: buildRollout([{ variation: 0, weight: expectedBucket + 1 }]),
        }),
      ],
    });
    expect(isUserInSegment(
      buildContext({ key: 'user-1', plan: 'pro' }),
      segment,
    )).toBe(true);

    // Weight exactly at bucket → user should NOT be in (bucket < weight, not <=)
    const segmentExact = buildSegment(segmentKey, {
      rules: [
        buildRule('r1', [buildClause('plan', 'in', ['pro'])], {
          rollout: buildRollout([{ variation: 0, weight: expectedBucket }]),
        }),
      ],
    });
    expect(isUserInSegment(
      buildContext({ key: 'user-1', plan: 'pro' }),
      segmentExact,
    )).toBe(false);
  });
});
