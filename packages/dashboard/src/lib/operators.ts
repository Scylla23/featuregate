export interface OperatorDef {
  value: string;
  label: string;
  category: 'string' | 'list' | 'number' | 'semver' | 'date' | 'boolean' | 'existence';
  valueType: 'single' | 'multi' | 'none';
}

export const OPERATORS: OperatorDef[] = [
  // String operators
  { value: 'equals', label: 'equals', category: 'string', valueType: 'single' },
  { value: 'notEquals', label: 'does not equal', category: 'string', valueType: 'single' },
  { value: 'contains', label: 'contains', category: 'string', valueType: 'single' },
  { value: 'notContains', label: 'does not contain', category: 'string', valueType: 'single' },
  { value: 'startsWith', label: 'starts with', category: 'string', valueType: 'single' },
  { value: 'endsWith', label: 'ends with', category: 'string', valueType: 'single' },
  { value: 'matches', label: 'matches regex', category: 'string', valueType: 'single' },
  // List operators
  { value: 'in', label: 'is one of', category: 'list', valueType: 'multi' },
  { value: 'notIn', label: 'is not one of', category: 'list', valueType: 'multi' },
  // Numeric operators
  { value: 'greaterThan', label: 'greater than', category: 'number', valueType: 'single' },
  { value: 'lessThan', label: 'less than', category: 'number', valueType: 'single' },
  {
    value: 'greaterThanOrEqual',
    label: 'greater than or equal',
    category: 'number',
    valueType: 'single',
  },
  {
    value: 'lessThanOrEqual',
    label: 'less than or equal',
    category: 'number',
    valueType: 'single',
  },
  // Semver operators
  { value: 'semverEquals', label: 'semver equals', category: 'semver', valueType: 'single' },
  {
    value: 'semverGreaterThan',
    label: 'semver greater than',
    category: 'semver',
    valueType: 'single',
  },
  { value: 'semverLessThan', label: 'semver less than', category: 'semver', valueType: 'single' },
  // Date operators
  { value: 'before', label: 'before', category: 'date', valueType: 'single' },
  { value: 'after', label: 'after', category: 'date', valueType: 'single' },
  // Boolean operators
  { value: 'isTrue', label: 'is true', category: 'boolean', valueType: 'none' },
  { value: 'isFalse', label: 'is false', category: 'boolean', valueType: 'none' },
  // Existence operators
  { value: 'exists', label: 'exists', category: 'existence', valueType: 'none' },
  { value: 'notExists', label: 'does not exist', category: 'existence', valueType: 'none' },
];

export const OPERATOR_CATEGORIES = [
  { label: 'String', value: 'string' },
  { label: 'List', value: 'list' },
  { label: 'Number', value: 'number' },
  { label: 'Semver', value: 'semver' },
  { label: 'Date', value: 'date' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Existence', value: 'existence' },
] as const;

export const BUILTIN_ATTRIBUTES = ['key', 'name', 'email', 'ip'] as const;

export const COMMON_ATTRIBUTES = [
  'country',
  'plan',
  'device',
  'os',
  'browser',
  'version',
  'anonymous',
] as const;

export function getOperatorDef(value: string): OperatorDef | undefined {
  return OPERATORS.find((op) => op.value === value);
}
