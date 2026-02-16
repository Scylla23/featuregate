import { useState } from 'react';
import {
  X,
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  XCircle,
  ArrowRight,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCheckSegmentMembership } from '@/hooks/use-segments';
import type { SegmentCheckResult } from '@/types/segment';
import type { SegmentFormRule } from '@/hooks/use-segment-form';
import { cn } from '@/lib/utils';

// ---- Types ----

interface ContextAttribute {
  key: string;
  value: string;
}

interface ContextPreset {
  name: string;
  key: string;
  attributes: ContextAttribute[];
}

interface SegmentTesterPanelProps {
  segmentKey: string;
  included: string[];
  excluded: string[];
  rules: SegmentFormRule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESETS_KEY = 'fg_context_presets';

const QUICK_ATTRIBUTES = ['email', 'country', 'plan', 'device', 'version'];

const DEFAULT_ATTRIBUTES: ContextAttribute[] = [
  { key: 'email', value: '' },
  { key: 'country', value: '' },
  { key: 'plan', value: '' },
];

function loadPresets(): ContextPreset[] {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: ContextPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function parseAttributeValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && !isNaN(Number(raw))) return Number(raw);
  return raw;
}

// ---- Main Component ----

export function SegmentTesterPanel({
  segmentKey,
  included,
  excluded,
  rules,
  open,
  onOpenChange,
}: SegmentTesterPanelProps) {
  const [contextKey, setContextKey] = useState('');
  const [attributes, setAttributes] = useState<ContextAttribute[]>(DEFAULT_ATTRIBUTES);
  const [presets, setPresets] = useState<ContextPreset[]>(loadPresets);
  const checkMembership = useCheckSegmentMembership();

  // ---- Attribute management ----

  const updateAttribute = (index: number, field: 'key' | 'value', val: string) => {
    setAttributes((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: val } : a)));
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const addAttribute = (key = '', value = '') => {
    setAttributes((prev) => [...prev, { key, value }]);
  };

  // ---- Presets ----

  const savePreset = () => {
    const name = window.prompt('Preset name:');
    if (!name?.trim()) return;
    const newPreset: ContextPreset = {
      name: name.trim(),
      key: contextKey,
      attributes: attributes.filter((a) => a.key.trim()),
    };
    const updated = [...presets.filter((p) => p.name !== newPreset.name), newPreset];
    setPresets(updated);
    savePresetsToStorage(updated);
    toast.success(`Preset "${newPreset.name}" saved`);
  };

  const loadPreset = (preset: ContextPreset) => {
    setContextKey(preset.key);
    setAttributes(preset.attributes.length > 0 ? preset.attributes : DEFAULT_ATTRIBUTES);
  };

  const deletePreset = (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    setPresets(updated);
    savePresetsToStorage(updated);
  };

  // ---- Evaluate ----

  const handleEvaluate = () => {
    if (!contextKey.trim()) {
      toast.error('Context key is required');
      return;
    }

    const context: Record<string, unknown> = { key: contextKey.trim() };
    for (const attr of attributes) {
      if (attr.key.trim() && attr.value.trim()) {
        context[attr.key.trim()] = parseAttributeValue(attr.value.trim());
      }
    }

    checkMembership.mutate({ key: segmentKey, context });
  };

  const handleClear = () => {
    setContextKey('');
    setAttributes(DEFAULT_ATTRIBUTES);
    checkMembership.reset();
  };

  // ---- Quick test shortcuts ----

  const fillIncluded = () => {
    if (included.length > 0) {
      setContextKey(included[0]);
    }
  };

  const fillExcluded = () => {
    if (excluded.length > 0) {
      setContextKey(excluded[0]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[420px] flex-col gap-0 overflow-y-auto p-0 sm:max-w-[420px]"
        showCloseButton={false}
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">Test Segment</SheetTitle>
          <SheetDescription className="text-xs">
            Check whether a context would be included in this segment.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Quick test shortcuts */}
          {(included.length > 0 || excluded.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {included.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={fillIncluded}
                >
                  Test an included context
                </Button>
              )}
              {excluded.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={fillExcluded}
                >
                  Test an excluded context
                </Button>
              )}
            </div>
          )}

          {/* Saved presets */}
          {presets.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Saved Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <Badge
                    key={preset.name}
                    variant="outline"
                    className="cursor-pointer gap-1 text-[11px] hover:bg-accent"
                    onClick={() => loadPreset(preset)}
                  >
                    {preset.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(preset.name);
                      }}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Context key */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Context Key <span className="text-destructive">*</span>
            </Label>
            <Input
              value={contextKey}
              onChange={(e) => setContextKey(e.target.value)}
              placeholder="user-123"
              className="h-9"
            />
          </div>

          {/* Dynamic attributes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attributes</Label>
            {attributes.map((attr, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  value={attr.key}
                  onChange={(e) => updateAttribute(i, 'key', e.target.value)}
                  placeholder="attribute"
                  className="h-8 flex-1 text-sm"
                />
                <Input
                  value={attr.value}
                  onChange={(e) => updateAttribute(i, 'value', e.target.value)}
                  placeholder="value"
                  className="h-8 flex-1 text-sm"
                />
                <Button variant="ghost" size="icon-xs" onClick={() => removeAttribute(i)}>
                  <X className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addAttribute()}
              className="h-7 text-xs"
            >
              <Plus className="mr-1 size-3" />
              Add attribute
            </Button>
          </div>

          {/* Quick-fill buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Quick add:</span>
            {QUICK_ATTRIBUTES.map((attr) => {
              const exists = attributes.some((a) => a.key === attr);
              return (
                <Button
                  key={attr}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => !exists && addAttribute(attr)}
                  disabled={exists}
                >
                  {attr}
                </Button>
              );
            })}
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleEvaluate}
              disabled={checkMembership.isPending || !contextKey.trim()}
              className="flex-1"
            >
              {checkMembership.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Evaluate
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <RotateCcw className="mr-1 size-3.5" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={savePreset}
              disabled={!contextKey.trim()}
            >
              <Save className="mr-1 size-3.5" />
              Save
            </Button>
          </div>

          {/* Results */}
          {checkMembership.data && (
            <SegmentEvaluationResult
              result={checkMembership.data}
              contextKey={contextKey}
              included={included}
              excluded={excluded}
              rules={rules}
            />
          )}

          {checkMembership.isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {checkMembership.error instanceof Error
                ? checkMembership.error.message
                : 'Evaluation failed'}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Evaluation Result ----

interface SegmentEvaluationResultProps {
  result: SegmentCheckResult;
  contextKey: string;
  included: string[];
  excluded: string[];
  rules: SegmentFormRule[];
}

function SegmentEvaluationResult({
  result,
  contextKey,
  included,
  excluded,
  rules,
}: SegmentEvaluationResultProps) {
  const steps = buildSegmentTrace(result, contextKey, included, excluded, rules);

  return (
    <div className="space-y-3">
      {/* Membership callout */}
      <div
        className={cn(
          'rounded-lg border p-4',
          result.match
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30'
            : 'border-muted bg-muted/30',
        )}
      >
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Result
        </div>
        <div className="flex items-center gap-3">
          {result.match ? (
            <CheckCircle2 className="size-6 text-emerald-500" />
          ) : (
            <XCircle className="size-6 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {result.match ? 'In Segment' : 'Not In Segment'}
            </p>
            <p className="text-xs text-muted-foreground">{result.reason}</p>
          </div>
        </div>
      </div>

      {/* Evaluation trace */}
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Evaluation Path
        </div>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {step.status === 'matched' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                ) : step.status === 'terminal' ? (
                  <XCircle className="size-4 shrink-0 text-amber-500" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                )}
                {i < steps.length - 1 && <div className="my-0.5 h-5 w-px bg-border" />}
              </div>
              <div className={cn('pb-3', i === steps.length - 1 && 'pb-0')}>
                <p
                  className={cn(
                    'text-sm',
                    step.status === 'matched' && 'font-medium text-green-600 dark:text-green-400',
                    step.status === 'terminal' &&
                      'font-medium text-amber-600 dark:text-amber-400',
                    step.status === 'skipped' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    step.status === 'matched'
                      ? 'text-green-600/80 dark:text-green-400/80'
                      : 'text-muted-foreground/70',
                  )}
                >
                  {step.status === 'matched' && (
                    <ArrowRight className="mr-0.5 inline-block size-3" />
                  )}
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Trace builder ----

interface TraceStep {
  label: string;
  detail: string;
  status: 'matched' | 'skipped' | 'terminal';
}

function buildSegmentTrace(
  result: SegmentCheckResult,
  contextKey: string,
  included: string[],
  excluded: string[],
  rules: SegmentFormRule[],
): TraceStep[] {
  const steps: TraceStep[] = [];

  // Step 1: Check excluded
  const isExcluded = excluded.includes(contextKey);
  if (isExcluded && !result.match) {
    steps.push({
      label: 'Excluded list',
      detail: 'Context key found in excluded list',
      status: 'terminal',
    });
    return steps;
  }
  steps.push({
    label: 'Excluded list',
    detail: excluded.length > 0 ? 'Not in excluded list' : 'No contexts configured',
    status: 'skipped',
  });

  // Step 2: Check included
  const isIncluded = included.includes(contextKey);
  if (isIncluded && result.match) {
    steps.push({
      label: 'Included list',
      detail: 'Context key found in included list',
      status: 'matched',
    });
    return steps;
  }
  steps.push({
    label: 'Included list',
    detail: included.length > 0 ? 'Not in included list' : 'No contexts configured',
    status: 'skipped',
  });

  // Step 3: Rules
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    steps.push({
      label: `Rule ${i + 1}${rule.description ? `: ${rule.description}` : ''}`,
      detail: 'Evaluated',
      status: 'skipped',
    });
  }

  // Final result
  steps.push({
    label: 'Result',
    detail: result.match ? 'Context is in segment' : 'Context did not match any rules',
    status: result.match ? 'matched' : 'terminal',
  });

  return steps;
}
