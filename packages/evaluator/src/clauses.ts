import semver from 'semver';
import { Clause, EvaluationContext } from './types.js';

export function matchClause(clause: Clause, context: EvaluationContext): boolean {
  const { attribute, operator, values, negate } = clause;

  // 1. Get the value from the user context
  const userValue = context[attribute];

  // 2. Handle missing attributes (Fail Closed)
  // If the rule asks for "country" but the context doesn't have it, the clause fails.
  if (userValue === undefined || userValue === null) {
    return false;
  }

  let result;
  const stringUserValue = String(userValue);

  // 3. Operator Logic
  switch (operator) {
    case 'in':
      result = values.includes(userValue);
      break;
    case 'contains':
      result = values.some((v) => stringUserValue.includes(String(v)));
      break;
    case 'greaterThan':
      result = Number(userValue) > Number(values[0]);
      break;
    case 'semverGreaterThan':
      result = semver.gt(stringUserValue, String(values[0]));
      break;
    // ... we will implement the rest of the operators here
    default:
      result = false;
  }

  // 4. Handle Negation (e.g., "NOT in US")
  return negate ? !result : result;
}
