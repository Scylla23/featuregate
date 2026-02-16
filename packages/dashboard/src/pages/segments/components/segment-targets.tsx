import { useState } from 'react';
import { X, Plus, Upload, Trash2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { SegmentFormAction } from '@/hooks/use-segment-form';

interface SegmentTargetsProps {
  included: string[];
  excluded: string[];
  dispatch: React.Dispatch<SegmentFormAction>;
}

export function SegmentTargets({ included, excluded, dispatch }: SegmentTargetsProps) {
  return (
    <div className="space-y-4">
      {/* Evaluation order hint */}
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
        <Info className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Evaluation order:</span> Excluded targets (highest
          priority) → Included targets → Targeting rules
        </p>
      </div>

      <TargetList
        title="Included Targets"
        description="Contexts in this list are always members of this segment, regardless of targeting rules."
        values={included}
        oppositeValues={excluded}
        oppositeLabel="excluded"
        onAdd={(value) => dispatch({ type: 'ADD_INCLUDED', payload: value })}
        onRemove={(value) => dispatch({ type: 'REMOVE_INCLUDED', payload: value })}
        onClear={() => dispatch({ type: 'SET_INCLUDED', payload: [] })}
        onBulkAdd={(values) => dispatch({ type: 'BULK_ADD_INCLUDED', payload: values })}
      />

      <TargetList
        title="Excluded Targets"
        description="Contexts in this list are never members of this segment, even if they match targeting rules."
        values={excluded}
        oppositeValues={included}
        oppositeLabel="included"
        onAdd={(value) => dispatch({ type: 'ADD_EXCLUDED', payload: value })}
        onRemove={(value) => dispatch({ type: 'REMOVE_EXCLUDED', payload: value })}
        onClear={() => dispatch({ type: 'SET_EXCLUDED', payload: [] })}
        onBulkAdd={(values) => dispatch({ type: 'BULK_ADD_EXCLUDED', payload: values })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared TargetList component
// ---------------------------------------------------------------------------

interface TargetListProps {
  title: string;
  description: string;
  values: string[];
  oppositeValues: string[];
  oppositeLabel: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onClear: () => void;
  onBulkAdd: (values: string[]) => void;
}

function TargetList({
  title,
  description,
  values,
  oppositeValues,
  oppositeLabel,
  onAdd,
  onRemove,
  onClear,
  onBulkAdd,
}: TargetListProps) {
  const [inputValue, setInputValue] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (values.includes(trimmed)) {
      setError('This context is already in the list');
      return;
    }
    if (oppositeValues.includes(trimmed)) {
      setError(`This context is currently ${oppositeLabel}. Remove from ${oppositeLabel} list first.`);
      return;
    }

    setError('');
    onAdd(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary" className="text-[11px]">
              {values.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setBulkOpen(true)}
            >
              <Upload className="mr-1 size-3" />
              Bulk Add
            </Button>
            {values.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => setClearOpen(true)}
              >
                <Trash2 className="mr-1 size-3" />
                Clear All
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add input */}
        <div className="space-y-1">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter context key and press Enter..."
              className="h-8 text-sm"
            />
            <Button variant="outline" size="sm" onClick={handleAdd} disabled={!inputValue.trim()}>
              <Plus className="size-3.5" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Values list */}
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {values.slice(0, 100).map((value) => (
              <Badge key={value} variant="secondary" className="gap-1 pr-1 text-[11px] font-mono">
                {value}
                <button
                  className="rounded-full hover:bg-muted-foreground/20"
                  onClick={() => onRemove(value)}
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            ))}
            {values.length > 100 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[11px]">
                      +{values.length - 100} more
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {values.length} total contexts
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {values.length === 0 && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No contexts added yet
          </p>
        )}
      </CardContent>

      {/* Bulk add dialog */}
      <BulkAddDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        existingValues={values}
        oppositeValues={oppositeValues}
        oppositeLabel={oppositeLabel}
        onBulkAdd={onBulkAdd}
      />

      {/* Clear confirmation */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All Targets</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all {values.length} contexts from this list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClear();
                setClearOpen(false);
                toast.info('All targets cleared');
              }}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bulk Add Dialog
// ---------------------------------------------------------------------------

interface BulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingValues: string[];
  oppositeValues: string[];
  oppositeLabel: string;
  onBulkAdd: (values: string[]) => void;
}

function BulkAddDialog({
  open,
  onOpenChange,
  existingValues,
  oppositeValues,
  oppositeLabel,
  onBulkAdd,
}: BulkAddDialogProps) {
  const [text, setText] = useState('');

  const handleAdd = () => {
    const keys = text
      .split(/[,\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    const unique = [...new Set(keys)];
    const existingSet = new Set(existingValues);
    const oppositeSet = new Set(oppositeValues);

    const conflicts = unique.filter((k) => oppositeSet.has(k));
    const duplicates = unique.filter((k) => existingSet.has(k));
    const valid = unique.filter((k) => !existingSet.has(k) && !oppositeSet.has(k));

    if (conflicts.length > 0) {
      toast.warning(
        `${conflicts.length} keys skipped (already in ${oppositeLabel} list)`,
      );
    }
    if (duplicates.length > 0) {
      toast.info(`${duplicates.length} duplicate keys skipped`);
    }

    if (valid.length > 0) {
      onBulkAdd(valid);
      toast.success(`${valid.length} contexts added`);
    }

    setText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Add Contexts</DialogTitle>
          <DialogDescription>
            Paste context keys separated by commas or newlines.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`user-1\nuser-2\nuser-3`}
          className="min-h-[120px] font-mono text-sm"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!text.trim()}>
            Add Contexts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
