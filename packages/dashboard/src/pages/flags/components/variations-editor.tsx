import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import type { Variation, VariationValue } from '@/types/flag';
import type { FlagFormAction } from '@/hooks/use-flag-form';

import { VARIATION_COLORS } from '@/lib/constants';
export { VARIATION_COLORS };

interface VariationsEditorProps {
  variations: Variation[];
  offVariation: number;
  dispatch: React.Dispatch<FlagFormAction>;
}

export function VariationsEditor({ variations, offVariation, dispatch }: VariationsEditorProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const isBooleanFlag =
    variations.length === 2 &&
    variations.some((v) => v.value === true) &&
    variations.some((v) => v.value === false);

  const handleUpdate = (index: number, updates: Partial<Variation>) => {
    const updated = { ...variations[index], ...updates };

    // Check for duplicate values
    if ('value' in updates) {
      const duplicate = variations.some(
        (v, i) => i !== index && String(v.value) === String(updated.value),
      );
      if (duplicate) {
        setErrors((prev) => ({ ...prev, [index]: 'Duplicate value' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    }

    dispatch({ type: 'UPDATE_VARIATION', payload: { index, variation: updated } });
  };

  const handleAdd = () => {
    dispatch({
      type: 'ADD_VARIATION',
      payload: { value: `variation-${variations.length + 1}`, name: '', description: '' },
    });
  };

  const handleDelete = (index: number) => {
    dispatch({ type: 'DELETE_VARIATION', payload: { index } });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variations</CardTitle>
        <CardDescription>
          {isBooleanFlag
            ? 'Boolean flag with true/false values'
            : 'Define the possible values this flag can return'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {variations.map((variation, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            {/* Color dot */}
            <div
              className="mt-2.5 size-3 shrink-0 rounded-full"
              style={{ backgroundColor: VARIATION_COLORS[index % VARIATION_COLORS.length] }}
            />

            {/* Fields */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    value={variation.name ?? ''}
                    onChange={(e) => handleUpdate(index, { name: e.target.value })}
                    placeholder={`Variation ${index + 1}`}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={String(variation.value)}
                    onChange={(e) => {
                      // Try to preserve type
                      let value: VariationValue = e.target.value;
                      if (e.target.value === 'true') value = true;
                      else if (e.target.value === 'false') value = false;
                      else if (!isNaN(Number(e.target.value)) && e.target.value.trim() !== '')
                        value = Number(e.target.value);
                      handleUpdate(index, { value });
                    }}
                    placeholder="Value"
                    className="h-8 font-mono text-sm"
                    disabled={isBooleanFlag}
                  />
                  {errors[index] && (
                    <p className="mt-1 text-xs text-destructive">{errors[index]}</p>
                  )}
                </div>
              </div>
              <Input
                value={variation.description ?? ''}
                onChange={(e) => handleUpdate(index, { description: e.target.value })}
                placeholder="Description (optional)"
                className="h-7 border-none bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
              />
            </div>

            {/* Delete */}
            <Button
              variant="ghost"
              size="icon-xs"
              className="mt-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(index)}
              disabled={variations.length <= 2 || isBooleanFlag}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {!isBooleanFlag && (
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Plus className="mr-1.5 size-3.5" />
              Add Variation
            </Button>
          )}
          {isBooleanFlag && <div />}

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">When flag is OFF, serve:</Label>
            <Select
              value={String(offVariation)}
              onValueChange={(val) =>
                dispatch({ type: 'SET_OFF_VARIATION', payload: Number(val) })
              }
            >
              <SelectTrigger className="h-8 w-[180px]">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
