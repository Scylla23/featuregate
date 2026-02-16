import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Variation } from '@/types/flag';
import type { FlagFormRule, FlagFormAction } from '@/hooks/use-flag-form';
import { RuleCard } from './rule-card';

interface RuleBuilderProps {
  rules: FlagFormRule[];
  variations: Variation[];
  dispatch: React.Dispatch<FlagFormAction>;
}

export function RuleBuilder({ rules, variations, dispatch }: RuleBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      dispatch({
        type: 'REORDER_RULES',
        payload: { activeId: String(active.id), overId: String(over.id) },
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeRule = activeId ? rules.find((r) => r.id === activeId) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Targeting Rules</CardTitle>
        <CardDescription>
          Rules are evaluated top to bottom. The first matching rule wins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No targeting rules yet. Add a rule to target specific users.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={rules.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    index={index}
                    variations={variations}
                    dispatch={dispatch}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeRule ? (
                <div className="rounded-lg border bg-card p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      Rule {rules.findIndex((r) => r.id === activeRule.id) + 1}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {activeRule.description || 'Untitled rule'}
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: 'ADD_RULE' })}
        >
          <Plus className="mr-1.5 size-3.5" />
          Add Rule
        </Button>
      </CardContent>
    </Card>
  );
}
