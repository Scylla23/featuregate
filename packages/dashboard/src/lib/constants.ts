export const VARIATION_COLORS = [
  '#10B981',
  '#EF4444',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export const BUCKET_BY_OPTIONS = [
  { value: 'key', label: 'key (default)' },
  { value: 'email', label: 'email' },
  { value: 'country', label: 'country' },
  { value: 'plan', label: 'plan' },
  { value: 'ip', label: 'ip' },
];

export const REASON_LABELS: Record<string, { label: string; color: string }> = {
  FLAG_DISABLED: {
    label: 'Flag Disabled',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  INDIVIDUAL_TARGET: {
    label: 'Individual Target',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  RULE_MATCH: {
    label: 'Rule Match',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  ROLLOUT: {
    label: 'Rollout',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  DEFAULT: {
    label: 'Default Rule',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  DEFAULT_ROLLOUT: {
    label: 'Default Rollout',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  ERROR: {
    label: 'Error',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
};
