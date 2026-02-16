import { useState, useRef, useCallback } from 'react';
import {
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Variation, Rollout } from '@/types/flag';
import { VARIATION_COLORS, BUCKET_BY_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PercentageRolloutProps {
  rollout: Rollout;
  variations: Variation[];
  onChange: (rollout: Rollout) => void;
}

export function PercentageRollout({ rollout, variations, onChange }: PercentageRolloutProps) {
  const [draggingEdge, setDraggingEdge] = useState<number | null>(null);
  const [dragTooltip, setDragTooltip] = useState<{ left: number; percent: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(rollout.seed != null);
  const barRef = useRef<HTMLDivElement>(null);

  const total = rollout.variations.reduce((sum, rv) => sum + rv.weight, 0);
  const totalPercent = total / 1000;
  const isValid = total === 100000;

  // ---- Drag handling ----

  const handleDragStart = useCallback(
    (edgeIndex: number) => (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingEdge(edgeIndex);
    },
    [],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingEdge === null || !barRef.current) return;

      const rect = barRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const positionWeight = Math.round(fraction * 100000);

      // Cumulative weight before the left side of this edge
      const cumulativeBefore = rollout.variations
        .slice(0, draggingEdge)
        .reduce((sum, rv) => sum + rv.weight, 0);

      // Total of the two adjacent variations being adjusted
      const pairTotal =
        rollout.variations[draggingEdge].weight +
        rollout.variations[draggingEdge + 1].weight;

      // Snap to 0.5% (500 weight units)
      const rawLeft = positionWeight - cumulativeBefore;
      const snapped = Math.round(rawLeft / 500) * 500;
      const leftWeight = Math.max(0, Math.min(pairTotal, snapped));
      const rightWeight = pairTotal - leftWeight;

      // Show tooltip
      const tooltipLeft = ((cumulativeBefore + leftWeight) / 1000);
      setDragTooltip({
        left: tooltipLeft,
        percent: (leftWeight / 1000).toFixed(1),
      });

      const updated = rollout.variations.map((rv, i) => {
        if (i === draggingEdge) return { ...rv, weight: leftWeight };
        if (i === draggingEdge + 1) return { ...rv, weight: rightWeight };
        return rv;
      });
      onChange({ ...rollout, variations: updated });
    },
    [draggingEdge, rollout, onChange],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingEdge(null);
    setDragTooltip(null);
  }, []);

  // ---- Weight changes ----

  const handleWeightChange = (variationIndex: number, percentStr: string) => {
    const percent = parseFloat(percentStr) || 0;
    const weight = Math.round(percent * 1000);
    const clamped = Math.max(0, Math.min(100000, weight));

    let updated = rollout.variations.map((rv) =>
      rv.variation === variationIndex ? { ...rv, weight: clamped } : rv,
    );

    // Auto-adjust for 2 variations
    if (variations.length === 2) {
      const otherIdx = variationIndex === 0 ? 1 : 0;
      const otherWeight = Math.max(0, 100000 - clamped);
      updated = updated.map((rv) =>
        rv.variation === otherIdx ? { ...rv, weight: otherWeight } : rv,
      );
    }

    onChange({ ...rollout, variations: updated });
  };

  const handleStep = (variationIndex: number, direction: 1 | -1, shift: boolean) => {
    const step = shift ? 100 : 1000; // 0.1% or 1%
    const rv = rollout.variations.find((r) => r.variation === variationIndex);
    if (!rv) return;

    const newWeight = Math.max(0, Math.min(100000, rv.weight + direction * step));

    let updated = rollout.variations.map((r) =>
      r.variation === variationIndex ? { ...r, weight: newWeight } : r,
    );

    // Auto-adjust for 2 variations
    if (variations.length === 2) {
      const otherIdx = variationIndex === 0 ? 1 : 0;
      const otherWeight = Math.max(0, 100000 - newWeight);
      updated = updated.map((r) =>
        r.variation === otherIdx ? { ...r, weight: otherWeight } : r,
      );
    }

    onChange({ ...rollout, variations: updated });
  };

  // ---- Actions ----

  const distributeEvenly = () => {
    const count = variations.length;
    const base = Math.floor(100000 / count);
    const remainder = 100000 - base * count;

    const updated = variations.map((_, i) => ({
      variation: i,
      weight: base + (i === count - 1 ? remainder : 0),
    }));
    onChange({ ...rollout, variations: updated });
  };

  const handleReset = () => {
    const updated = variations.map((_, i) => ({
      variation: i,
      weight: i === 0 ? 100000 : 0,
    }));
    onChange({ ...rollout, variations: updated });
  };

  // ---- Compute cumulative positions for drag handles ----

  const cumulativeWeights: number[] = [];
  let cumulative = 0;
  for (const rv of rollout.variations) {
    cumulative += rv.weight;
    cumulativeWeights.push(cumulative);
  }

  return (
    <div className="space-y-3">
      {/* Visual bar with drag handles */}
      <div className="relative" ref={barRef}>
        <div
          className="flex h-4 overflow-hidden rounded-full"
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          {rollout.variations.map((rv) => {
            const pct = rv.weight / 1000;
            const isZero = rv.weight === 0;
            return (
              <div
                key={rv.variation}
                className={cn('transition-[width] duration-75', isZero && 'opacity-30')}
                style={{
                  width: isZero ? '2px' : `${pct}%`,
                  backgroundColor: VARIATION_COLORS[rv.variation % VARIATION_COLORS.length],
                  minWidth: isZero ? '2px' : undefined,
                }}
              />
            );
          })}
        </div>

        {/* Drag handles between segments */}
        {rollout.variations.slice(0, -1).map((_, idx) => {
          const leftPercent = cumulativeWeights[idx] / 1000;
          return (
            <div
              key={idx}
              className={cn(
                'absolute top-0 h-4 w-3 -translate-x-1/2 cursor-col-resize',
                draggingEdge === idx
                  ? 'bg-foreground/20'
                  : 'hover:bg-foreground/10',
              )}
              style={{ left: `${leftPercent}%` }}
              onPointerDown={handleDragStart(idx)}
            />
          );
        })}

        {/* Drag tooltip */}
        {dragTooltip && (
          <div
            className="absolute -top-7 rounded bg-foreground px-1.5 py-0.5 text-[11px] text-background"
            style={{ left: `${dragTooltip.left}%`, transform: 'translateX(-50%)' }}
          >
            {dragTooltip.percent}%
          </div>
        )}
      </div>

      {/* Variation rows with steppers */}
      <div className="space-y-1.5">
        {variations.map((variation, i) => {
          const rv = rollout.variations.find((r) => r.variation === i);
          const weight = rv?.weight ?? 0;
          const percent = weight / 1000;

          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: VARIATION_COLORS[i % VARIATION_COLORS.length] }}
              />
              <span className="w-28 truncate text-sm">
                {variation.name || `Variation ${i + 1}`}
              </span>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-7 w-6 rounded-r-none border"
                  onClick={(e) => handleStep(i, -1, e.shiftKey)}
                >
                  <Minus className="size-3" />
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={percent}
                  onChange={(e) => handleWeightChange(i, e.target.value)}
                  className="h-7 w-[72px] rounded-none border-x-0 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-7 w-6 rounded-l-none border"
                  onClick={(e) => handleStep(i, 1, e.shiftKey)}
                >
                  <Plus className="size-3" />
                </Button>
                <span className="ml-1 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isValid ? (
            <CheckCircle2 className="size-4 text-green-500" />
          ) : (
            <AlertCircle className="size-4 text-destructive" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              isValid ? 'text-green-600 dark:text-green-400' : 'text-destructive',
            )}
          >
            Total: {totalPercent.toFixed(1)}%
            {!isValid &&
              ` (${total > 100000 ? `${((total - 100000) / 1000).toFixed(1)}% over` : `${((100000 - total) / 1000).toFixed(1)}% remaining`})`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs">
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={distributeEvenly} className="h-7 text-xs">
            Split evenly
          </Button>
        </div>
      </div>

      {/* Rollout configuration */}
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Label className="whitespace-nowrap text-xs text-muted-foreground">Rollout by</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                Determines how contexts are consistently assigned to variation buckets. The same
                context attribute value always maps to the same bucket.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Select
            value={rollout.bucketBy || 'key'}
            onValueChange={(val) =>
              onChange({ ...rollout, bucketBy: val === 'key' ? undefined : val })
            }
          >
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_BY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          Advanced
        </button>
        {showAdvanced && (
          <div className="flex items-center gap-2 pl-4">
            <Label className="whitespace-nowrap text-xs text-muted-foreground">Seed</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  Use a different seed to get a different distribution for the same contexts.
                  Useful when you want two flags to have independent rollouts.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Input
              type="number"
              value={rollout.seed ?? ''}
              onChange={(e) => {
                const seed = e.target.value ? parseInt(e.target.value, 10) : undefined;
                onChange({ ...rollout, seed });
              }}
              placeholder="Auto"
              className="h-7 w-24 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
