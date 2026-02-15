import { describe, test, expect } from '@jest/globals';
import { matchClause } from '../clauses.js';
import { buildClause, buildContext } from './helpers.js';

// ─── Implemented Operators ───────────────────────────────────────────

describe('matchClause - in operator', () => {
  const cases: { name: string; clause: ReturnType<typeof buildClause>; context: ReturnType<typeof buildContext>; expected: boolean }[] = [
    {
      name: 'matches exact string value',
      clause: buildClause('plan', 'in', ['pro', 'enterprise']),
      context: buildContext({ plan: 'pro' }),
      expected: true,
    },
    {
      name: 'matches exact number value',
      clause: buildClause('age', 'in', [25, 30]),
      context: buildContext({ age: 25 }),
      expected: true,
    },
    {
      name: 'matches exact boolean value',
      clause: buildClause('active', 'in', [true]),
      context: buildContext({ active: true }),
      expected: true,
    },
    {
      name: 'does not match when value absent from list',
      clause: buildClause('plan', 'in', ['pro']),
      context: buildContext({ plan: 'free' }),
      expected: false,
    },
    {
      name: 'type coercion: string "25" does not match number 25',
      clause: buildClause('age', 'in', ['25']),
      context: buildContext({ age: 25 }),
      expected: false,
    },
    {
      name: 'type coercion: number 123 does not match string "123"',
      clause: buildClause('code', 'in', [123]),
      context: buildContext({ code: '123' }),
      expected: false,
    },
    {
      name: 'type coercion: boolean true does not match string "true"',
      clause: buildClause('active', 'in', ['true']),
      context: buildContext({ active: true }),
      expected: false,
    },
    {
      name: 'is case sensitive',
      clause: buildClause('plan', 'in', ['Pro']),
      context: buildContext({ plan: 'pro' }),
      expected: false,
    },
  ];

  cases.forEach(({ name, clause, context, expected }) => {
    test(name, () => {
      expect(matchClause(clause, context)).toBe(expected);
    });
  });
});

describe('matchClause - contains operator', () => {
  const cases: { name: string; clause: ReturnType<typeof buildClause>; context: ReturnType<typeof buildContext>; expected: boolean }[] = [
    {
      name: 'finds substring in string',
      clause: buildClause('email', 'contains', ['@company.com']),
      context: buildContext({ email: 'john@company.com' }),
      expected: true,
    },
    {
      name: 'finds any of multiple substrings (OR logic)',
      clause: buildClause('email', 'contains', ['@company.com', '@partner.com']),
      context: buildContext({ email: 'john@partner.com' }),
      expected: true,
    },
    {
      name: 'coerces number to string for matching',
      clause: buildClause('id', 'contains', ['234']),
      context: buildContext({ id: 12345 }),
      expected: true,
    },
    {
      name: 'does not find absent substring',
      clause: buildClause('email', 'contains', ['@other.com']),
      context: buildContext({ email: 'user@company.com' }),
      expected: false,
    },
    {
      name: 'empty string matches any string',
      clause: buildClause('name', 'contains', ['']),
      context: buildContext({ name: 'John' }),
      expected: true,
    },
  ];

  cases.forEach(({ name, clause, context, expected }) => {
    test(name, () => {
      expect(matchClause(clause, context)).toBe(expected);
    });
  });
});

describe('matchClause - greaterThan operator', () => {
  const cases: { name: string; clause: ReturnType<typeof buildClause>; context: ReturnType<typeof buildContext>; expected: boolean }[] = [
    {
      name: 'number greater than threshold',
      clause: buildClause('age', 'greaterThan', [18]),
      context: buildContext({ age: 25 }),
      expected: true,
    },
    {
      name: 'equal is not greater',
      clause: buildClause('age', 'greaterThan', [25]),
      context: buildContext({ age: 25 }),
      expected: false,
    },
    {
      name: 'coerces string context value to number',
      clause: buildClause('age', 'greaterThan', [18]),
      context: buildContext({ age: '30' }),
      expected: true,
    },
    {
      name: 'NaN comparison returns false',
      clause: buildClause('age', 'greaterThan', [18]),
      context: buildContext({ age: 'invalid' }),
      expected: false,
    },
    {
      name: 'handles negative numbers',
      clause: buildClause('balance', 'greaterThan', [-10]),
      context: buildContext({ balance: -5 }),
      expected: true,
    },
    {
      name: 'handles decimal numbers',
      clause: buildClause('score', 'greaterThan', [4.5]),
      context: buildContext({ score: 4.6 }),
      expected: true,
    },
  ];

  cases.forEach(({ name, clause, context, expected }) => {
    test(name, () => {
      expect(matchClause(clause, context)).toBe(expected);
    });
  });
});

describe('matchClause - semverGreaterThan operator', () => {
  const cases: { name: string; clause: ReturnType<typeof buildClause>; context: ReturnType<typeof buildContext>; expected: boolean }[] = [
    {
      name: 'version greater than threshold',
      clause: buildClause('appVersion', 'semverGreaterThan', ['1.0.0']),
      context: buildContext({ appVersion: '2.0.0' }),
      expected: true,
    },
    {
      name: 'equal version is not greater',
      clause: buildClause('appVersion', 'semverGreaterThan', ['2.0.0']),
      context: buildContext({ appVersion: '2.0.0' }),
      expected: false,
    },
    {
      name: 'patch version comparison',
      clause: buildClause('appVersion', 'semverGreaterThan', ['1.2.3']),
      context: buildContext({ appVersion: '1.2.4' }),
      expected: true,
    },
    {
      name: 'pre-release comparison',
      clause: buildClause('appVersion', 'semverGreaterThan', ['1.0.0-alpha']),
      context: buildContext({ appVersion: '1.0.0-beta' }),
      expected: true,
    },
  ];

  cases.forEach(({ name, clause, context, expected }) => {
    test(name, () => {
      expect(matchClause(clause, context)).toBe(expected);
    });
  });

  test('invalid semver throws TypeError (unhandled in matchClause)', () => {
    // semver.gt throws on invalid version strings. This is caught by
    // evaluate()'s try/catch which returns ERROR reason. matchClause itself
    // does not handle this — documenting current behavior.
    expect(() => matchClause(
      buildClause('appVersion', 'semverGreaterThan', ['1.0.0']),
      buildContext({ appVersion: 'invalid' }),
    )).toThrow(TypeError);
  });

  test('returns correct boolean for valid semver comparisons', () => {
    expect(matchClause(
      buildClause('v', 'semverGreaterThan', ['1.0.0']),
      buildContext({ v: '2.0.0' }),
    )).toBe(true);

    expect(matchClause(
      buildClause('v', 'semverGreaterThan', ['2.0.0']),
      buildContext({ v: '2.0.0' }),
    )).toBe(false);

    expect(matchClause(
      buildClause('v', 'semverGreaterThan', ['1.2.3']),
      buildContext({ v: '1.2.4' }),
    )).toBe(true);
  });
});

// ─── Fail Closed (Missing Attributes) ───────────────────────────────

describe('matchClause - fail closed', () => {
  test('returns false when attribute is missing (undefined)', () => {
    expect(matchClause(
      buildClause('country', 'in', ['US']),
      buildContext(),
    )).toBe(false);
  });

  test('returns false when attribute is explicitly null', () => {
    expect(matchClause(
      buildClause('country', 'contains', ['US']),
      buildContext({ country: null as unknown as string }),
    )).toBe(false);
  });

  test('does NOT fail closed for falsy value 0', () => {
    expect(matchClause(
      buildClause('count', 'in', [0]),
      buildContext({ count: 0 }),
    )).toBe(true);
  });

  test('does NOT fail closed for falsy value false', () => {
    expect(matchClause(
      buildClause('active', 'in', [false]),
      buildContext({ active: false }),
    )).toBe(true);
  });

  test('does NOT fail closed for empty string', () => {
    expect(matchClause(
      buildClause('name', 'in', ['']),
      buildContext({ name: '' }),
    )).toBe(true);
  });
});

// ─── Negation ────────────────────────────────────────────────────────

describe('matchClause - negation', () => {
  test('negates a matching in clause to false', () => {
    expect(matchClause(
      buildClause('plan', 'in', ['free'], { negate: true }),
      buildContext({ plan: 'free' }),
    )).toBe(false);
  });

  test('negates a non-matching in clause to true', () => {
    expect(matchClause(
      buildClause('plan', 'in', ['free'], { negate: true }),
      buildContext({ plan: 'pro' }),
    )).toBe(true);
  });

  test('negation on missing attribute still returns false (fail closed)', () => {
    expect(matchClause(
      buildClause('missing', 'in', ['x'], { negate: true }),
      buildContext(),
    )).toBe(false);
  });

  test('negates greaterThan result', () => {
    // 25 > 18 is true, negated → false
    expect(matchClause(
      buildClause('age', 'greaterThan', [18], { negate: true }),
      buildContext({ age: 25 }),
    )).toBe(false);

    // 10 > 18 is false, negated → true
    expect(matchClause(
      buildClause('age', 'greaterThan', [18], { negate: true }),
      buildContext({ age: 10 }),
    )).toBe(true);
  });
});

// ─── Unimplemented Operators (Document Gaps) ─────────────────────────

describe('matchClause - unimplemented operators (fall to default: false)', () => {
  const unimplementedCases: { operator: Parameters<typeof buildClause>[1]; attribute: string; values: Parameters<typeof buildClause>[2]; contextAttr: Partial<Parameters<typeof buildContext>[0] & Record<string, string | number | boolean>> }[] = [
    { operator: 'equals', attribute: 'plan', values: ['pro'], contextAttr: { plan: 'pro' } },
    { operator: 'notEquals', attribute: 'plan', values: ['free'], contextAttr: { plan: 'pro' } },
    { operator: 'notContains', attribute: 'email', values: ['spam'], contextAttr: { email: 'user@valid.com' } },
    { operator: 'startsWith', attribute: 'email', values: ['admin'], contextAttr: { email: 'admin@company.com' } },
    { operator: 'endsWith', attribute: 'email', values: ['.com'], contextAttr: { email: 'user@company.com' } },
    { operator: 'matches', attribute: 'email', values: ['^[a-z]+@'], contextAttr: { email: 'user@company.com' } },
    { operator: 'lessThan', attribute: 'age', values: [30], contextAttr: { age: 25 } },
    { operator: 'greaterThanOrEqual', attribute: 'age', values: [25], contextAttr: { age: 25 } },
    { operator: 'lessThanOrEqual', attribute: 'age', values: [25], contextAttr: { age: 20 } },
    { operator: 'notIn', attribute: 'plan', values: ['free'], contextAttr: { plan: 'pro' } },
    { operator: 'semverEquals', attribute: 'version', values: ['1.0.0'], contextAttr: { version: '1.0.0' } },
    { operator: 'semverLessThan', attribute: 'version', values: ['2.0.0'], contextAttr: { version: '1.0.0' } },
    { operator: 'before', attribute: 'date', values: ['2025-01-01'], contextAttr: { date: '2024-12-01' } },
    { operator: 'after', attribute: 'date', values: ['2024-01-01'], contextAttr: { date: '2024-12-01' } },
    { operator: 'isTrue', attribute: 'active', values: [], contextAttr: { active: true } },
    { operator: 'isFalse', attribute: 'active', values: [], contextAttr: { active: false } },
    { operator: 'exists', attribute: 'email', values: [], contextAttr: { email: 'user@company.com' } },
  ];

  unimplementedCases.forEach(({ operator, attribute, values, contextAttr }) => {
    test(`${operator}: returns false (not yet implemented)`, () => {
      expect(matchClause(
        buildClause(attribute, operator, values),
        buildContext(contextAttr),
      )).toBe(false);
    });
  });

  test('notExists: returns false (fail-closed before reaching switch)', () => {
    // notExists with missing attribute — fail closed returns false before switch
    expect(matchClause(
      buildClause('phone', 'notExists', []),
      buildContext({ email: 'user@company.com' }),
    )).toBe(false);
  });
});

// ─── ReDoS Safety ────────────────────────────────────────────────────

describe('matchClause - ReDoS safety', () => {
  test('matches with ReDoS pattern does not hang (unimplemented, returns false)', () => {
    const start = Date.now();
    const result = matchClause(
      buildClause('input', 'matches', ['(a+)+$']),
      buildContext({ input: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa!' }),
    );
    const elapsed = Date.now() - start;
    expect(result).toBe(false);
    expect(elapsed).toBeLessThan(1000); // Should complete instantly
  });

  test('matches with invalid regex does not throw (unimplemented)', () => {
    expect(() => matchClause(
      buildClause('input', 'matches', ['[invalid']),
      buildContext({ input: 'test' }),
    )).not.toThrow();
  });
});
