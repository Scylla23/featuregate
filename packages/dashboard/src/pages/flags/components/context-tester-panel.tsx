import { useState } from 'react';
import {
  X,
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
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
import { useEvaluateFlag } from '@/hooks/use-flags';
import { useProject } from '@/providers/project-provider';
import type { Variation, Rollout, EvaluateResult } from '@/types/flag';
import type { FlagFormRule } from '@/hooks/use-flag-form';
import { VARIATION_COLORS, REASON_LABELS } from '@/lib/constants';
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

interface ContextTesterPanelProps {
  flagKey: string;
  variations: Variation[];
  rules: FlagFormRule[];
  targets: { variation: number; values: string[] }[];
  enabled: boolean;
  offVariation: number;
  fallthrough: { variation?: number; rollout?: Rollout };
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

export function ContextTesterPanel({
  flagKey,
  variations,
  rules,
  targets,
  enabled,
  offVariation,
  fallthrough,
  open,
  onOpenChange,
}: ContextTesterPanelProps) {
  const [contextKey, setContextKey] = useState('');
  const [attributes, setAttributes] = useState<ContextAttribute[]>(DEFAULT_ATTRIBUTES);
  const [presets, setPresets] = useState<ContextPreset[]>(loadPresets);
  const evaluateMutation = useEvaluateFlag();
  const { activeProjectId, activeEnvironmentKey } = useProject();

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
    if (!activeProjectId || !activeEnvironmentKey) {
      toast.error('Project and environment must be selected');
      return;
    }

    const context: Record<string, unknown> = { key: contextKey.trim() };
    for (const attr of attributes) {
      if (attr.key.trim() && attr.value.trim()) {
        context[attr.key.trim()] = parseAttributeValue(attr.value.trim());
      }
    }

    evaluateMutation.mutate({
      flagKey,
      context,
      projectId: activeProjectId,
      environmentKey: activeEnvironmentKey,
    });
  };

  const handleClear = () => {
    setContextKey('');
    setAttributes(DEFAULT_ATTRIBUTES);
    evaluateMutation.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[420px] flex-col gap-0 overflow-y-auto p-0 sm:max-w-[420px]"
        showCloseButton={false}
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">Test Context</SheetTitle>
          <SheetDescription className="text-xs">
            Evaluate this flag against a test context to see which variation would be served.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
              disabled={evaluateMutation.isPending || !contextKey.trim()}
              className="flex-1"
            >
              {evaluateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
          {evaluateMutation.data && (
            <EvaluationResultDisplay
              result={evaluateMutation.data}
              variations={variations}
              rules={rules}
              targets={targets}
              enabled={enabled}
              offVariation={offVariation}
              fallthrough={fallthrough}
            />
          )}

          {evaluateMutation.isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {evaluateMutation.error instanceof Error
                ? evaluateMutation.error.message
                : 'Evaluation failed'}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Evaluation Result Display ----

interface EvaluationResultDisplayProps {
  result: EvaluateResult;
  variations: Variation[];
  rules: FlagFormRule[];
  targets: { variation: number; values: string[] }[];
  enabled: boolean;
  offVariation: number;
  fallthrough: { variation?: number; rollout?: Rollout };
}

function EvaluationResultDisplay({
  result,
  variations,
  rules,
  targets,
  enabled,
  offVariation,
  fallthrough,
}: EvaluationResultDisplayProps) {
  const variation = variations[result.variationIndex];
  const reasonInfo = REASON_LABELS[result.reason.kind];

  return (
    <div className="space-y-3">
      {/* Variation callout */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Result
        </div>
        <div className="flex items-center gap-3">
          <div
            className="size-5 rounded-full"
            style={{
              backgroundColor:
                VARIATION_COLORS[result.variationIndex % VARIATION_COLORS.length],
            }}
          />
          <div>
            <p className="text-sm font-semibold">
              {variation?.name || `Variation ${result.variationIndex + 1}`}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {JSON.stringify(result.value)}
            </p>
          </div>
        </div>

        {/* Reason badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Reason:</span>
          <Badge className={cn('text-[11px]', reasonInfo?.color)}>
            {reasonInfo?.label || result.reason.kind}
          </Badge>
          {result.reason.ruleIndex != null && (
            <span className="text-xs text-muted-foreground">
              (Rule {result.reason.ruleIndex + 1})
            </span>
          )}
        </div>
      </div>

      {/* Evaluation trace */}
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Evaluation Path
        </div>
        <EvaluationTrace
          result={result}
          variations={variations}
          rules={rules}
          targets={targets}
          enabled={enabled}
          offVariation={offVariation}
          fallthrough={fallthrough}
        />
      </div>
    </div>
  );
}

// ---- Evaluation Trace ----

interface TraceStep {
  label: string;
  detail: string;
  status: 'matched' | 'skipped' | 'terminal';
}

function buildTrace(
  result: EvaluateResult,
  variations: Variation[],
  rules: FlagFormRule[],
  targets: { variation: number; values: string[] }[],
  enabled: boolean,
  offVariation: number,
  fallthrough: { variation?: number; rollout?: Rollout },
): TraceStep[] {
  const steps: TraceStep[] = [];
  const reason = result.reason.kind;

  // Step 1: Targeting enabled?
  if (!enabled || reason === 'FLAG_DISABLED') {
    steps.push({
      label: 'Targeting enabled?',
      detail:
        reason === 'FLAG_DISABLED'
          ? `No — serving off-variation: ${variations[offVariation]?.name || `Variation ${offVariation + 1}`}`
          : 'Yes',
      status: reason === 'FLAG_DISABLED' ? 'terminal' : 'skipped',
    });
    if (reason === 'FLAG_DISABLED') return steps;
  } else {
    steps.push({
      label: 'Targeting enabled?',
      detail: 'Yes',
      status: 'skipped',
    });
  }

  // Step 2: Individual targets
  const hasTargets = targets.some((t) => t.values.length > 0);
  if (reason === 'INDIVIDUAL_TARGET') {
    steps.push({
      label: 'Individual targets',
      detail: `Matched — ${variations[result.variationIndex]?.name || `Variation ${result.variationIndex + 1}`}`,
      status: 'matched',
    });
    return steps;
  }
  steps.push({
    label: 'Individual targets',
    detail: hasTargets ? 'No match' : 'None configured',
    status: 'skipped',
  });

  // Step 3-N: Rules
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const isMatch =
      (reason === 'RULE_MATCH' || reason === 'ROLLOUT') &&
      result.reason.ruleIndex === i;

    if (isMatch) {
      steps.push({
        label: `Rule ${i + 1}${rule.description ? `: ${rule.description}` : ''}`,
        detail: `Matched — ${variations[result.variationIndex]?.name || `Variation ${result.variationIndex + 1}`}`,
        status: 'matched',
      });
      return steps;
    }
    steps.push({
      label: `Rule ${i + 1}${rule.description ? `: ${rule.description}` : ''}`,
      detail: 'No match',
      status: 'skipped',
    });
  }

  // Final step: Default rule
  const isDefault = reason === 'DEFAULT' || reason === 'DEFAULT_ROLLOUT';
  const defaultVariation = isDefault
    ? variations[result.variationIndex]
    : fallthrough.variation != null
      ? variations[fallthrough.variation]
      : null;

  steps.push({
    label: 'Default Rule',
    detail: isDefault
      ? `Served — ${defaultVariation?.name || `Variation ${result.variationIndex + 1}`}`
      : reason === 'ERROR'
        ? 'Error during evaluation'
        : `Fallthrough — ${defaultVariation?.name || 'unknown'}`,
    status: isDefault ? 'matched' : reason === 'ERROR' ? 'terminal' : 'skipped',
  });

  return steps;
}

function EvaluationTrace({
  result,
  variations,
  rules,
  targets,
  enabled,
  offVariation,
  fallthrough,
}: EvaluationResultDisplayProps) {
  const steps = buildTrace(result, variations, rules, targets, enabled, offVariation, fallthrough);

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          {/* Timeline column */}
          <div className="flex flex-col items-center">
            {step.status === 'matched' ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            ) : step.status === 'terminal' ? (
              <AlertCircle className="size-4 shrink-0 text-amber-500" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground/40" />
            )}
            {i < steps.length - 1 && (
              <div className="my-0.5 h-5 w-px bg-border" />
            )}
          </div>

          {/* Content */}
          <div className={cn('pb-3', i === steps.length - 1 && 'pb-0')}>
            <p
              className={cn(
                'text-sm',
                step.status === 'matched' && 'font-medium text-green-600 dark:text-green-400',
                step.status === 'terminal' && 'font-medium text-amber-600 dark:text-amber-400',
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
  );
}
