import { useState } from 'react';
import { GripVertical, ChevronDown, ChevronRight, Trash2, Plus, Users } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClauseRow } from '@/pages/flags/components/clause-row';
import { BUCKET_BY_OPTIONS } from '@/lib/constants';
import type { SegmentFormRule, SegmentFormAction } from '@/hooks/use-segment-form';

interface SegmentRuleCardProps {
  rule: SegmentFormRule;
  index: number;
  dispatch: React.Dispatch<SegmentFormAction>;
}

export function SegmentRuleCard({ rule, index, dispatch }: SegmentRuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasWeight = rule.weight != null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        {/* Rule number */}
        <Badge variant="outline" className="shrink-0 text-[11px]">
          Rule {index + 1}
        </Badge>

        {/* Description */}
        <Input
          value={rule.description ?? ''}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_RULE_DESCRIPTION',
              payload: { ruleId: rule.id, description: e.target.value },
            })
          }
          placeholder="Rule description..."
          className="h-7 flex-1 border-none bg-transparent text-sm shadow-none focus-visible:ring-0"
        />

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground"
        >
          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => dispatch({ type: 'DELETE_RULE', payload: { ruleId: rule.id } })}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-4 border-t px-4 py-3">
          {/* Clauses */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              If
            </span>
            {rule.clauses.map((clause, clauseIdx) => (
              <div key={clauseIdx}>
                {clauseIdx > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <Badge variant="secondary" className="text-[10px]">
                      AND
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                )}
                <ClauseRow
                  clause={clause}
                  onUpdate={(updated) =>
                    dispatch({
                      type: 'UPDATE_CLAUSE',
                      payload: { ruleId: rule.id, clauseIndex: clauseIdx, clause: updated },
                    })
                  }
                  onDelete={() =>
                    dispatch({
                      type: 'DELETE_CLAUSE',
                      payload: { ruleId: rule.id, clauseIndex: clauseIdx },
                    })
                  }
                  isOnly={rule.clauses.length === 1}
                  excludeOperators={['segmentMatch']}
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => dispatch({ type: 'ADD_CLAUSE', payload: { ruleId: rule.id } })}
            >
              <Plus className="mr-1 size-3" />
              Add condition
            </Button>
          </div>

          <Separator />

          {/* Include action */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Then
              </span>
            </div>

            <div className="space-y-2 pl-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`weight-${rule.id}`}
                  checked={hasWeight}
                  onCheckedChange={(checked) =>
                    dispatch({
                      type: 'SET_RULE_WEIGHT',
                      payload: {
                        ruleId: rule.id,
                        weight: checked ? 50000 : undefined,
                      },
                    })
                  }
                />
                <Label htmlFor={`weight-${rule.id}`} className="text-sm">
                  Include a percentage of matching contexts
                </Label>
              </div>

              {hasWeight ? (
                <div className="flex items-center gap-3 pl-6">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rule.weight != null ? (rule.weight / 1000).toFixed(1) : '50.0'}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const weight = Math.round(Math.min(100, Math.max(0, val)) * 1000);
                          dispatch({
                            type: 'SET_RULE_WEIGHT',
                            payload: { ruleId: rule.id, weight },
                          });
                        }
                      }}
                      className="h-7 w-20 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <span className="text-xs text-muted-foreground">bucket by</span>
                  <Select
                    value={rule.bucketBy || 'key'}
                    onValueChange={(val) =>
                      dispatch({
                        type: 'SET_RULE_BUCKET_BY',
                        payload: { ruleId: rule.id, bucketBy: val },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 w-[120px] text-xs">
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
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">
                  All matching contexts will be included in this segment
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
