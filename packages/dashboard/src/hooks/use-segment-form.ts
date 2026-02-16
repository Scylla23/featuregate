import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { Clause } from '@/types/flag';
import type { Segment, SegmentRule, UpdateSegmentInput } from '@/types/segment';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SegmentFormState {
  name: string;
  description: string;
  included: string[];
  excluded: string[];
  rules: SegmentFormRule[];
  tags: string[];
}

export interface SegmentFormRule {
  id: string;
  description?: string;
  clauses: Clause[];
  weight?: number;
  bucketBy?: string;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type SegmentFormAction =
  // Metadata
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_TAGS'; payload: string[] }
  // Included targets
  | { type: 'ADD_INCLUDED'; payload: string }
  | { type: 'REMOVE_INCLUDED'; payload: string }
  | { type: 'SET_INCLUDED'; payload: string[] }
  | { type: 'BULK_ADD_INCLUDED'; payload: string[] }
  // Excluded targets
  | { type: 'ADD_EXCLUDED'; payload: string }
  | { type: 'REMOVE_EXCLUDED'; payload: string }
  | { type: 'SET_EXCLUDED'; payload: string[] }
  | { type: 'BULK_ADD_EXCLUDED'; payload: string[] }
  // Rules
  | { type: 'ADD_RULE' }
  | { type: 'DELETE_RULE'; payload: { ruleId: string } }
  | { type: 'UPDATE_RULE_DESCRIPTION'; payload: { ruleId: string; description: string } }
  | { type: 'REORDER_RULES'; payload: { activeId: string; overId: string } }
  // Clauses
  | { type: 'ADD_CLAUSE'; payload: { ruleId: string } }
  | { type: 'UPDATE_CLAUSE'; payload: { ruleId: string; clauseIndex: number; clause: Clause } }
  | { type: 'DELETE_CLAUSE'; payload: { ruleId: string; clauseIndex: number } }
  // Rule weight
  | { type: 'SET_RULE_WEIGHT'; payload: { ruleId: string; weight: number | undefined } }
  | { type: 'SET_RULE_BUCKET_BY'; payload: { ruleId: string; bucketBy: string } }
  // Reset
  | { type: 'RESET'; payload: SegmentFormState };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let ruleCounter = 0;

export function generateRuleId(): string {
  ruleCounter += 1;
  return `rule-${Date.now()}-${ruleCounter}`;
}

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function segmentFormReducer(state: SegmentFormState, action: SegmentFormAction): SegmentFormState {
  switch (action.type) {
    // -- Metadata --
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };

    // -- Included targets --
    case 'ADD_INCLUDED': {
      if (state.included.includes(action.payload)) return state;
      return { ...state, included: [...state.included, action.payload] };
    }
    case 'REMOVE_INCLUDED':
      return { ...state, included: state.included.filter((v) => v !== action.payload) };
    case 'SET_INCLUDED':
      return { ...state, included: action.payload };
    case 'BULK_ADD_INCLUDED': {
      const existing = new Set(state.included);
      const newKeys = action.payload.filter((k) => !existing.has(k));
      if (newKeys.length === 0) return state;
      return { ...state, included: [...state.included, ...newKeys] };
    }

    // -- Excluded targets --
    case 'ADD_EXCLUDED': {
      if (state.excluded.includes(action.payload)) return state;
      return { ...state, excluded: [...state.excluded, action.payload] };
    }
    case 'REMOVE_EXCLUDED':
      return { ...state, excluded: state.excluded.filter((v) => v !== action.payload) };
    case 'SET_EXCLUDED':
      return { ...state, excluded: action.payload };
    case 'BULK_ADD_EXCLUDED': {
      const existing = new Set(state.excluded);
      const newKeys = action.payload.filter((k) => !existing.has(k));
      if (newKeys.length === 0) return state;
      return { ...state, excluded: [...state.excluded, ...newKeys] };
    }

    // -- Rules --
    case 'ADD_RULE': {
      const newRule: SegmentFormRule = {
        id: generateRuleId(),
        description: '',
        clauses: [{ attribute: '', operator: 'in', values: [], negate: false }],
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

    // -- Rule weight --
    case 'SET_RULE_WEIGHT':
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.payload.ruleId
            ? { ...r, weight: action.payload.weight }
            : r,
        ),
      };

    case 'SET_RULE_BUCKET_BY':
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.payload.ruleId
            ? { ...r, bucketBy: action.payload.bucketBy }
            : r,
        ),
      };

    // -- Reset --
    case 'RESET':
      return action.payload;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Convert server Segment → form state
// ---------------------------------------------------------------------------

function segmentToFormState(segment: Segment): SegmentFormState {
  return {
    name: segment.name,
    description: segment.description ?? '',
    included: segment.included ?? [],
    excluded: segment.excluded ?? [],
    rules: (segment.rules ?? []).map((r: SegmentRule) => ({
      id: r.id,
      description: r.description,
      clauses: r.clauses,
      weight: r.weight,
      bucketBy: r.bucketBy,
    })),
    tags: segment.tags ?? [],
  };
}

// ---------------------------------------------------------------------------
// Convert form state → server UpdateSegmentInput
// ---------------------------------------------------------------------------

function formStateToPayload(state: SegmentFormState): UpdateSegmentInput {
  return {
    name: state.name,
    description: state.description,
    included: state.included,
    excluded: state.excluded,
    rules: state.rules.map((r) => ({
      id: r.id,
      description: r.description,
      clauses: r.clauses,
      weight: r.weight,
      bucketBy: r.bucketBy,
    })),
    tags: state.tags,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const EMPTY_STATE: SegmentFormState = {
  name: '',
  description: '',
  included: [],
  excluded: [],
  rules: [],
  tags: [],
};

export function useSegmentForm(serverSegment: Segment | undefined) {
  const originalRef = useRef<SegmentFormState>(EMPTY_STATE);
  const [state, dispatch] = useReducer(segmentFormReducer, EMPTY_STATE);

  useEffect(() => {
    if (serverSegment) {
      const formState = segmentToFormState(serverSegment);
      originalRef.current = formState;
      dispatch({ type: 'RESET', payload: formState });
    }
  }, [serverSegment]);

  // eslint-disable-next-line react-hooks/refs -- intentional: ref is stable after effect runs
  const isDirty = JSON.stringify(state) !== JSON.stringify(originalRef.current);

  const getPayload = useCallback((): UpdateSegmentInput => {
    return formStateToPayload(state);
  }, [state]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', payload: originalRef.current });
  }, []);

  return { state, dispatch, isDirty, getPayload, reset };
}
