import { describe, test, expect } from '@jest/globals';
import { hashUser, bucketUser } from '../hash.js';
import { generateUserKeys } from './utils.js';

describe('hashUser', () => {
  test('same inputs produce same output (determinism)', () => {
    const results = Array.from({ length: 100 }, () => hashUser('user-1', 'flag-key'));
    expect(new Set(results).size).toBe(1);
  });

  test('output is within [0, 99999]', () => {
    const keys = generateUserKeys(500);
    for (const key of keys) {
      const hash = hashUser(key, 'test-salt');
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(100000);
    }
  });

  test('different flag keys produce different hashes for same user', () => {
    const hash1 = hashUser('user-1', 'flag-a');
    const hash2 = hashUser('user-1', 'flag-b');
    expect(hash1).not.toBe(hash2);
  });

  test('different user keys produce different hashes for same salt', () => {
    const hash1 = hashUser('user-1', 'flag-key');
    const hash2 = hashUser('user-2', 'flag-key');
    expect(hash1).not.toBe(hash2);
  });

  test('roughly uniform distribution across 1000 users', () => {
    const keys = generateUserKeys(1000);
    const buckets = [0, 0, 0, 0, 0]; // 5 quintiles: 0-19999, 20000-39999, ...
    for (const key of keys) {
      const hash = hashUser(key, 'distribution-test');
      const quintile = Math.min(Math.floor(hash / 20000), 4);
      buckets[quintile]++;
    }
    // Each quintile should have roughly 200 users. Allow ±100 tolerance.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(100);
      expect(count).toBeLessThan(300);
    }
  });

  test('handles empty string key', () => {
    const hash = hashUser('', 'salt');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(100000);
  });

  test('handles very long keys (1000+ chars)', () => {
    const longKey = 'a'.repeat(1500);
    const hash = hashUser(longKey, 'salt');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(100000);
  });

  test('handles unicode characters', () => {
    const hash = hashUser('用户-日本語-émoji🎉', 'flag-key');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(100000);
  });
});

describe('bucketUser', () => {
  const twoWaySplit = [
    { variation: 0, weight: 50000 },
    { variation: 1, weight: 50000 },
  ];

  test('assigns to correct variation at boundaries', () => {
    // bucket 0 → first variation (0 < 50000)
    expect(bucketUser(0, twoWaySplit)).toBe(0);
    // bucket 49999 → first variation (49999 < 50000)
    expect(bucketUser(49999, twoWaySplit)).toBe(0);
    // bucket 50000 → second variation (50000 < 100000)
    expect(bucketUser(50000, twoWaySplit)).toBe(1);
    // bucket 99999 → second variation
    expect(bucketUser(99999, twoWaySplit)).toBe(1);
  });

  test('falls back to last variation when weights < 100000', () => {
    const partial = [{ variation: 0, weight: 30000 }];
    // bucket 50000 exceeds cumulative weight of 30000 → fallback to last
    expect(bucketUser(50000, partial)).toBe(0);
  });

  test('handles weights summing > 100000', () => {
    const over = [
      { variation: 0, weight: 60000 },
      { variation: 1, weight: 60000 },
    ];
    // bucket 50000 → still falls into first variation (50000 < 60000)
    expect(bucketUser(50000, over)).toBe(0);
    // bucket 60000 → second variation (60000 < 120000)
    expect(bucketUser(60000, over)).toBe(1);
  });
});
