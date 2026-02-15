import murmurhash from 'murmurhash';
import { Rollout } from './types.js';

/**
 * Generates a deterministic hash for a user/flag combination.
 * @returns A number between 0 and 99999 (0% to 99.999%)
 */
export function hashUser(userKey: string, salt: string): number {
  // We use a dot separator to prevent hash collisions between
  // similar keys (e.g., user "1" + flag "23" vs user "12" + flag "3")
  const hash = murmurhash.v3(`${userKey}.${salt}`);
  return hash % 100000;
}

/**
 * Determines which variation index a hashed value falls into.
 */
export function bucketUser(bucket: number, weightedVariations: Rollout['variations']): number {
  let cumulativeWeight = 0;

  for (const { variation, weight } of weightedVariations) {
    cumulativeWeight += weight;
    if (bucket < cumulativeWeight) {
      return variation;
    }
  }

  // Fallback to the last variation if weights don't sum to 100,000
  return weightedVariations[weightedVariations.length - 1].variation;
}
