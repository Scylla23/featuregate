import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { FlagWithConfig, Variation, Clause, Target, Rollout, UpdateFlagInput, UpdateFlagConfigInput } from '@/types/flag';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface FlagFormState {
  name: string;
  description: string;
  enabled: boolean;
  variations: Variation[];
  offVariation: number;
  fallthrough: { variation?: number; rollout?: Rollout };
  targets: Target[];
  rules: FlagFormRule[];
  tags: string[];
}

export interface FlagFormRule {
  id: string;
  description?: string;
  clauses: Clause[];
  variation?: number;
  rollout?: Rollout;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type FlagFormAction =
  // Metadata
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_ENABLED'; payload: boolean }
  | { type: 'SET_TAGS'; payload: string[] }
  // Variations
  | { type: 'ADD_VARIATION'; payload: Variation }
  | { type: 'UPDATE_VARIATION'; payload: { index: number; variation: Variation } }
  | { type: 'DELETE_VARIATION'; payload: { index: number } }
  | { type: 'SET_OFF_VARIATION'; payload: number }
  // Targets
  | { type: 'ADD_TARGET_VALUE'; payload: { variationIndex: number; value: string } }
  | { type: 'REMOVE_TARGET_VALUE'; payload: { variationIndex: number; value: string } }
  // Rules
  | { type: 'ADD_RULE' }
  | { type: 'DELETE_RULE'; payload: { ruleId: string } }
  | { type: 'UPDATE_RULE_DESCRIPTION'; payload: { ruleId: string; description: string } }
  | { type: 'REORDER_RULES'; payload: { activeId: string; overId: string } }
  // Clauses
  | { type: 'ADD_CLAUSE'; payload: { ruleId: string } }
  | { type: 'UPDATE_CLAUSE'; payload: { ruleId: string; clauseIndex: number; clause: Clause } }
  | { type: 'DELETE_CLAUSE'; payload: { ruleId: string; clauseIndex: number } }
  // Rule serve action
  | { type: 'SET_RULE_VARIATION'; payload: { ruleId: string; variation: number } }
  | { type: 'SET_RULE_ROLLOUT'; payload: { ruleId: string; rollout: Rollout } }
  | {
      type: 'SET_RULE_SERVE_TYPE';
      payload: { ruleId: string; serveType: 'variation' | 'rollout'; variationCount: number };
    }
  // Fallthrough (default rule)
  | { type: 'SET_FALLTHROUGH_VARIATION'; payload: number }
  | { type: 'SET_FALLTHROUGH_ROLLOUT'; payload: Rollout }
  | { type: 'SET_FALLTHROUGH_TYPE'; payload: { serveType: 'variation' | 'rollout'; variationCount: number } }
  // Reset
  | { type: 'RESET'; payload: FlagFormState };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let ruleCounter = 0;

function generateRuleId(): string {
  ruleCounter += 1;
  return `rule-${Date.now()}-${ruleCounter}`;
}

function remapVariationIndex(index: number, deletedIndex: number): number | undefined {
  if (index === deletedIndex) return undefined;
  return index > deletedIndex ? index - 1 : index;
}

function remapRollout(rollout: Rollout | undefined, deletedIndex: number): Rollout | undefined {
  if (!rollout) return undefined;
  const remapped = rollout.variations
    .filter((rv) => rv.variation !== deletedIndex)
    .map((rv) => ({
      ...rv,
      variation: rv.variation > deletedIndex ? rv.variation - 1 : rv.variation,
    }));
  return { ...rollout, variations: remapped };
}

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

function makeDefaultRollout(variationCount: number): Rollout {
  const base = Math.floor(100000 / variationCount);
  const remainder = 100000 - base * variationCount;
  return {
    variations: Array.from({ length: variationCount }, (_, i) => ({
      variation: i,
      weight: base + (i === variationCount - 1 ? remainder : 0),
    })),
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function flagFormReducer(state: FlagFormState, action: FlagFormAction): FlagFormState {
  switch (action.type) {
    // -- Metadata --
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    case 'SET_ENABLED':
      return { ...state, enabled: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };

    // -- Variations --
    case 'ADD_VARIATION':
      return { ...state, variations: [...state.variations, action.payload] };

    case 'UPDATE_VARIATION': {
      const { index, variation } = action.payload;
      const variations = state.variations.map((v, i) => (i === index ? variation : v));
      return { ...state, variations };
    }

    case 'DELETE_VARIATION': {
      const { index: delIdx } = action.payload;
      if (state.variations.length <= 2) return state;

      const variations = state.variations.filter((_, i) => i !== delIdx);

      // Remap offVariation
      const newOff = remapVariationIndex(state.offVariation, delIdx);
      const offVariation = newOff ?? 0;

      // Remap fallthrough
      const ftVariation = state.fallthrough.variation != null
        ? remapVariationIndex(state.fallthrough.variation, delIdx)
        : undefined;
      const ftRollout = remapRollout(state.fallthrough.rollout, delIdx);
      const fallthrough = { variation: ftVariation ?? (ftRollout ? undefined : 0), rollout: ftRollout };

      // Remap targets
      const targets = state.targets
        .filter((t) => t.variation !== delIdx)
        .map((t) => ({
          ...t,
          variation: t.variation > delIdx ? t.variation - 1 : t.variation,
        }));

      // Remap rules
      const rules = state.rules.map((rule) => {
        const newVar = rule.variation != null
          ? remapVariationIndex(rule.variation, delIdx)
          : undefined;
        const newRollout = remapRollout(rule.rollout, delIdx);
        return {
          ...rule,
          variation: newVar ?? (newRollout ? undefined : 0),
          rollout: newRollout,
        };
      });

      return { ...state, variations, offVariation, fallthrough, targets, rules };
    }

    case 'SET_OFF_VARIATION':
      return { ...state, offVariation: action.payload };

    // -- Targets --
    case 'ADD_TARGET_VALUE': {
      const { variationIndex, value } = action.payload;
      const existing = state.targets.find((t) => t.variation === variationIndex);
      if (existing) {
        if (existing.values.includes(value)) return state;
        const targets = state.targets.map((t) =>
          t.variation === variationIndex ? { ...t, values: [...t.values, value] } : t,
        );
        return { ...state, targets };
      }
      return {
        ...state,
        targets: [...state.targets, { variation: variationIndex, values: [value] }],
      };
    }

    case 'REMOVE_TARGET_VALUE': {
      const { variationIndex, value } = action.payload;
      const targets = state.targets
        .map((t) =>
          t.variation === variationIndex
            ? { ...t, values: t.values.filter((v) => v !== value) }
            : t,
        )
        .filter((t) => t.values.length > 0);
      return { ...state, targets };
    }

    // -- Rules --
    case 'ADD_RULE': {
      const newRule: FlagFormRule = {
        id: generateRuleId(),
        description: '',
        clauses: [{ attribute: '', operator: 'in', values: [], negate: false }],
        variation: 0,
      };
      return { ...state, rules: [...state.rules, newRule] };
    }

    case 'DELETE_RULE':
      return {
        ...state,
        rules: state.rules.filter((r) => r.id !== action.payload.ruleId),
      };

    case 'UPDATE_RULE_DESCRIPTION':
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.payload.ruleId
            ? { ...r, description: action.payload.description }
            : r,
        ),
      };

    case 'REORDER_RULES': {
      const { activeId, overId } = action.payload;
      if (activeId === overId) return state;
      const oldIndex = state.rules.findIndex((r) => r.id === activeId);
      const newIndex = state.rules.findIndex((r) => r.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      return { ...state, rules: arrayMove(state.rules, oldIndex, newIndex) };
    }

    // -- Clauses --
    case 'ADD_CLAUSE':
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.payload.ruleId
            ? {
                ...r,
                clauses: [
                  ...r.clauses,
                  { attribute: '', operator: 'in', values: [], negate: false },
                ],
              }
            : r,
        ),
      };

    case 'UPDATE_CLAUSE': {
      const { ruleId, clauseIndex, clause } = action.payload;
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === ruleId
            ? {
                ...r,
                clauses: r.clauses.map((c, i) => (i === clauseIndex ? clause : c)),
              }
            : r,
        ),
      };
    }

    case 'DELETE_CLAUSE': {
      const { ruleId, clauseIndex } = action.payload;
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === ruleId
            ? { ...r, clauses: r.clauses.filter((_, i) => i !== clauseIndex) }
            : r,
        ),
      };
    }

    // -- Rule serve action --
    case 'SET_RULE_VARIATION':
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.payload.ruleId
            ? { ...r, variation: action.payload.variation, rollout: undefined }
            : r,
        ),
      };

    case 'SET_RULE_ROLLOUT':
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.payload.ruleId
            ? { ...r, rollout: action.payload.rollout, variation: undefined }
            : r,
        ),
      };

    case 'SET_RULE_SERVE_TYPE': {
      const { ruleId, serveType, variationCount } = action.payload;
      return {
        ...state,
        rules: state.rules.map((r) => {
          if (r.id !== ruleId) return r;
          if (serveType === 'variation') {
            return { ...r, variation: r.variation ?? 0, rollout: undefined };
          }
          return {
            ...r,
            variation: undefined,
            rollout: r.rollout ?? makeDefaultRollout(variationCount),
          };
        }),
      };
    }

    // -- Fallthrough --
    case 'SET_FALLTHROUGH_VARIATION':
      return {
        ...state,
        fallthrough: { variation: action.payload, rollout: undefined },
      };

    case 'SET_FALLTHROUGH_ROLLOUT':
      return {
        ...state,
        fallthrough: { variation: undefined, rollout: action.payload },
      };

    case 'SET_FALLTHROUGH_TYPE': {
      const { serveType, variationCount } = action.payload;
      if (serveType === 'variation') {
        return {
          ...state,
          fallthrough: { variation: state.fallthrough.variation ?? 0, rollout: undefined },
        };
      }
      return {
        ...state,
        fallthrough: {
          variation: undefined,
          rollout: state.fallthrough.rollout ?? makeDefaultRollout(variationCount),
        },
      };
    }

    // -- Reset --
    case 'RESET':
      return action.payload;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Convert server Flag → form state
// ---------------------------------------------------------------------------

function flagToFormState(flag: FlagWithConfig): FlagFormState {
  const config = flag.config;
  return {
    name: flag.name,
    description: flag.description ?? '',
    enabled: config?.enabled ?? flag.enabled ?? false,
    variations: flag.variations,
    offVariation: config?.offVariation ?? 0,
    fallthrough: config?.fallthrough ?? { variation: 0 },
    targets: config?.targets ?? [],
    rules: (config?.rules ?? []).map((r) => {
      // Server stores fixed variation as rollout.variation — extract it
      const serverRollout = r.rollout as
        | { variation?: number; variations?: { variation: number; weight: number }[] }
        | undefined;
      const hasPercentageRollout =
        serverRollout?.variations && serverRollout.variations.length > 0;

      if (hasPercentageRollout) {
        return {
          id: r.id,
          description: r.description,
          clauses: r.clauses,
          variation: undefined,
          rollout: {
            variations: serverRollout!.variations!,
            bucketBy: (r.rollout as Rollout | undefined)?.bucketBy,
            seed: (r.rollout as Rollout | undefined)?.seed,
          },
        };
      }

      // Fixed variation: could be in r.variation (dashboard type) or rollout.variation (server)
      const fixedVariation = r.variation ?? serverRollout?.variation ?? 0;
      return {
        id: r.id,
        description: r.description,
        clauses: r.clauses,
        variation: fixedVariation,
        rollout: undefined,
      };
    }),
    tags: flag.tags ?? [],
  };
}

// ---------------------------------------------------------------------------
// Convert form state → server UpdateFlagInput
// ---------------------------------------------------------------------------

function formStateToFlagPayload(state: FlagFormState): UpdateFlagInput {
  return {
    name: state.name,
    description: state.description,
    variations: state.variations,
    tags: state.tags,
  };
}

function formStateToConfigPayload(state: FlagFormState): UpdateFlagConfigInput {
  const rules = state.rules.map((r) => {
    // Transform dashboard variation → server rollout.variation
    if (r.variation != null && !r.rollout) {
      return {
        id: r.id,
        description: r.description,
        clauses: r.clauses,
        rollout: { variation: r.variation },
      };
    }
    // Percentage rollout
    if (r.rollout) {
      return {
        id: r.id,
        description: r.description,
        clauses: r.clauses,
        rollout: {
          variations: r.rollout.variations,
          ...(r.rollout.bucketBy ? { bucketBy: r.rollout.bucketBy } : {}),
          ...(r.rollout.seed != null ? { seed: r.rollout.seed } : {}),
        },
      };
    }
    return {
      id: r.id,
      description: r.description,
      clauses: r.clauses,
    };
  });

  return {
    enabled: state.enabled,
    offVariation: state.offVariation,
    fallthrough: state.fallthrough.rollout
      ? {
          variation: state.fallthrough.variation,
          rollout: {
            variations: state.fallthrough.rollout.variations,
            ...(state.fallthrough.rollout.bucketBy
              ? { bucketBy: state.fallthrough.rollout.bucketBy }
              : {}),
            ...(state.fallthrough.rollout.seed != null
              ? { seed: state.fallthrough.rollout.seed }
              : {}),
          },
        }
      : state.fallthrough,
    targets: state.targets,
    rules,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const EMPTY_STATE: FlagFormState = {
  name: '',
  description: '',
  enabled: false,
  variations: [],
  offVariation: 0,
  fallthrough: { variation: 0 },
  targets: [],
  rules: [],
  tags: [],
};

export function useFlagForm(serverFlag: FlagWithConfig | undefined) {
  const originalRef = useRef<FlagFormState>(EMPTY_STATE);
  const [state, dispatch] = useReducer(flagFormReducer, EMPTY_STATE);

  // Sync from server when flag data arrives or changes
  useEffect(() => {
    if (serverFlag) {
      const formState = flagToFormState(serverFlag);
      originalRef.current = formState;
      dispatch({ type: 'RESET', payload: formState });
    }
  }, [serverFlag]);

  const isDirty = JSON.stringify(state) !== JSON.stringify(originalRef.current);

  const getFlagPayload = useCallback((): UpdateFlagInput => {
    return formStateToFlagPayload(state);
  }, [state]);

  const getConfigPayload = useCallback((): UpdateFlagConfigInput => {
    return formStateToConfigPayload(state);
  }, [state]);

  // Legacy: returns combined payload for backward compat
  const getPayload = useCallback((): UpdateFlagInput & UpdateFlagConfigInput => {
    return { ...formStateToFlagPayload(state), ...formStateToConfigPayload(state) };
  }, [state]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', payload: originalRef.current });
  }, []);

  return { state, dispatch, isDirty, getFlagPayload, getConfigPayload, getPayload, reset };
}
