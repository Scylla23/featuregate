import { Flag, EvaluationContext, Segment, EvaluationResult } from './types.js';
import { isUserInSegment } from './segments.js';
import { matchClause } from './clauses.js';
import { hashUser, bucketUser } from './hash.js';

export function evaluate(
  flag: Flag,
  context: EvaluationContext,
  segments: Map<string, Segment>,
): EvaluationResult {
  try {
    // 1. Is the flag enabled?
    if (!flag.enabled) {
      return {
        value: flag.variations[flag.offVariation].value,
        variationIndex: flag.offVariation,
        reason: 'FLAG_DISABLED',
      };
    }

    // 2. Check individual targets (exact matches)
    if (flag.individualTargets) {
      for (const target of flag.individualTargets) {
        if (target.values.includes(context.key)) {
          return {
            value: flag.variations[target.variation].value,
            variationIndex: target.variation,
            reason: 'INDIVIDUAL_TARGET',
          };
        }
      }
    }

    // 3. Evaluate Targeting Rules
    for (let i = 0; i < flag.rules.length; i++) {
      const rule = flag.rules[i];

      // All clauses in a rule must match (AND logic)
      const matches = rule.clauses.every((clause) => {
        // Special Case: Segment Targeting
        if (clause.attribute.startsWith('segment:')) {
          const segmentKey = clause.attribute.replace('segment:', '');
          const segment = segments.get(segmentKey);
          if (!segment) return false;

          const inSegment = isUserInSegment(context, segment);
          return clause.negate ? !inSegment : inSegment;
        }

        return matchClause(clause, context);
      });

      if (matches) {
        // Handle fixed variation vs percentage rollout
        if (rule.variation !== undefined) {
          return {
            value: flag.variations[rule.variation].value,
            variationIndex: rule.variation,
            reason: 'RULE_MATCH',
            ruleIndex: i,
            ruleId: rule.id,
          };
        }

        if (rule.rollout) {
          const bucketBy = rule.rollout.bucketBy || 'key';
          const bucket = hashUser(String(context[bucketBy]), flag.key);
          const variationIndex = bucketUser(bucket, rule.rollout.variations);

          return {
            value: flag.variations[variationIndex].value,
            variationIndex,
            reason: 'ROLLOUT',
            ruleIndex: i,
            ruleId: rule.id,
          };
        }
      }
    }

    // 4. Default Rule (Fallthrough)
    if (flag.defaultRule.variation !== undefined) {
      return {
        value: flag.variations[flag.defaultRule.variation].value,
        variationIndex: flag.defaultRule.variation,
        reason: 'DEFAULT',
      };
    }

    if (flag.defaultRule.rollout) {
      const bucketBy = flag.defaultRule.rollout.bucketBy || 'key';
      const bucket = hashUser(String(context[bucketBy]), flag.key);
      const variationIndex = bucketUser(bucket, flag.defaultRule.rollout.variations);

      return {
        value: flag.variations[variationIndex].value,
        variationIndex,
        reason: 'DEFAULT_ROLLOUT',
      };
    }

    throw new Error('No evaluation path found');
  } catch (error) {
    // 5. Emergency Fallback
    return {
      value: flag.variations[flag.offVariation].value,
      variationIndex: flag.offVariation,
      reason: 'ERROR',
    };
  }
}
