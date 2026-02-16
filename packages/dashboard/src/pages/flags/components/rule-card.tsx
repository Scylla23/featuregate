import { useState } from 'react';
import { GripVertical, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Variation } from '@/types/flag';
import type { FlagFormRule, FlagFormAction } from '@/hooks/use-flag-form';
import { ClauseRow } from './clause-row';
import { PercentageRollout } from './percentage-rollout';
import { VARIATION_COLORS } from './variations-editor';

interface RuleCardProps {
  rule: FlagFormRule;
  index: number;
  variations: Variation[];
  dispatch: React.Dispatch<FlagFormAction>;
}

export function RuleCard({ rule, index, variations, dispatch }: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isRollout = rule.rollout != null && rule.rollout.variations.length > 0;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleServeTypeToggle = () => {
    if (isRollout) {
      dispatch({
        type: 'SET_RULE_SERVE_TYPE',
        payload: { ruleId: rule.id, serveType: 'variation', variationCount: variations.length },
      });
    } else {
      dispatch({
        type: 'SET_RULE_SERVE_TYPE',
        payload: { ruleId: rule.id, serveType: 'rollout', variationCount: variations.length },
      });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card"
    >
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
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                dispatch({ type: 'ADD_CLAUSE', payload: { ruleId: rule.id } })
              }
            >
              <Plus className="mr-1 size-3" />
              Add condition
            </Button>
          </div>

          <Separator />

          {/* Serve action */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Serve
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant={isRollout ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    if (isRollout) handleServeTypeToggle();
                  }}
                  className="h-6 text-[11px]"
                >
                  Variation
                </Button>
                <Button
                  variant={isRollout ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (!isRollout) handleServeTypeToggle();
                  }}
                  className="h-6 text-[11px]"
                >
                  Rollout
                </Button>
              </div>
            </div>

            {isRollout ? (
              <PercentageRollout
                rollout={rule.rollout!}
                variations={variations}
                onChange={(rollout) =>
                  dispatch({
                    type: 'SET_RULE_ROLLOUT',
                    payload: { ruleId: rule.id, rollout },
                  })
                }
              />
            ) : (
              <Select
                value={String(rule.variation ?? 0)}
                onValueChange={(val) =>
                  dispatch({
                    type: 'SET_RULE_VARIATION',
                    payload: { ruleId: rule.id, variation: Number(val) },
                  })
                }
              >
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {variations.map((v, i) => (
                    <SelectItem key={i} value={String(i)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{
                            backgroundColor: VARIATION_COLORS[i % VARIATION_COLORS.length],
                          }}
                        />
                        {v.name || `Variation ${i + 1}`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
