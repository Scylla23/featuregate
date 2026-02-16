import { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Variation, Target } from '@/types/flag';
import type { FlagFormAction } from '@/hooks/use-flag-form';
import { VARIATION_COLORS } from './variations-editor';

interface IndividualTargetsProps {
  targets: Target[];
  variations: Variation[];
  dispatch: React.Dispatch<FlagFormAction>;
}

export function IndividualTargets({ targets, variations, dispatch }: IndividualTargetsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Individual Targets</CardTitle>
        <CardDescription>
          Assign specific users or context keys directly to a variation, bypassing all rules.
          Individual targets are evaluated before rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {variations.map((variation, varIndex) => {
          const target = targets.find((t) => t.variation === varIndex);
          const values = target?.values ?? [];

          return (
            <TargetRow
              key={varIndex}
              variationIndex={varIndex}
              variation={variation}
              values={values}
              allTargets={targets}
              dispatch={dispatch}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

interface TargetRowProps {
  variationIndex: number;
  variation: Variation;
  values: string[];
  allTargets: Target[];
  dispatch: React.Dispatch<FlagFormAction>;
}

function TargetRow({ variationIndex, variation, values, allTargets, dispatch }: TargetRowProps) {
  const [inputValue, setInputValue] = useState('');

  const allTargetedKeys = new Set(allTargets.flatMap((t) => t.values));

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (allTargetedKeys.has(trimmed)) return;

    dispatch({
      type: 'ADD_TARGET_VALUE',
      payload: { variationIndex, value: trimmed },
    });
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (value: string) => {
    dispatch({
      type: 'REMOVE_TARGET_VALUE',
      payload: { variationIndex, value },
    });
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {/* Variation label */}
      <div className="flex w-36 shrink-0 items-center gap-2 pt-1">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: VARIATION_COLORS[variationIndex % VARIATION_COLORS.length] }}
        />
        <span className="truncate text-sm font-medium">
          {variation.name || `Variation ${variationIndex + 1}`}
        </span>
      </div>

      {/* Target chips + input */}
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {values.map((val) => (
          <Badge key={val} variant="secondary" className="gap-1 pr-1 text-xs">
            {val}
            <button
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              onClick={() => handleRemove(val)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add user key and press Enter..."
          className="h-7 min-w-[200px] flex-1 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
