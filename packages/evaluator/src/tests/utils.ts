import { hashUser, bucketUser } from '../hash.js';
import type { Rollout } from '../types.js';

export function generateUserKeys(count: number, prefix = 'user'): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

export function getDistribution(
  userKeys: string[],
  salt: string,
  rollout: Rollout,
): Record<number, number> {
  const distribution: Record<number, number> = {};
  for (const key of userKeys) {
    const bucket = hashUser(key, salt);
    const variation = bucketUser(bucket, rollout.variations);
    distribution[variation] = (distribution[variation] || 0) + 1;
  }
  return distribution;
}
