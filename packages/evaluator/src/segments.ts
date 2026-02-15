import { EvaluationContext, Segment } from './types.js';
import { matchClause } from './clauses.js';
import { hashUser } from './hash.js';

export function isUserInSegment(context: EvaluationContext, segment: Segment): boolean {
  // 1. Check Excluded (Top Priority)
  if (segment.excluded.includes(context.key)) return false;

  // 2. Check Included
  if (segment.included.includes(context.key)) return true;

  // 3. Evaluate Rules (OR logic: any match = IN)
  return segment.rules.some((rule) => {
    // Each rule's clauses must ALL match (AND logic)
    const clausesMatch = rule.clauses.every((clause) => matchClause(clause, context));

    if (!clausesMatch) return false;

    // Optional: Percentage rollouts within a segment [cite: 100]
    if (rule.rollout) {
      const bucketBy = rule.rollout.bucketBy || 'key';
      const bucket = hashUser(String(context[bucketBy]), segment.key);

      // Check if the user falls into the "included" part of the rollout
      // (This is simplified for Step 3.4)
      return bucket < (rule.rollout.variations[0]?.weight || 0);
    }

    return true;
  });
}
