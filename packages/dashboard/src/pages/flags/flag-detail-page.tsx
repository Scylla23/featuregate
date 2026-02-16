import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useFlag, useUpdateFlag } from '@/hooks/use-flags';
import { useFlagForm } from '@/hooks/use-flag-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FlagDetailHeader } from './components/flag-detail-header';
import { VariationsEditor } from './components/variations-editor';
import { IndividualTargets } from './components/individual-targets';
import { RuleBuilder } from './components/rule-builder';
import { DefaultRule } from './components/default-rule';

export function FlagDetailPage() {
  const { flagKey } = useParams<{ flagKey: string }>();
  const navigate = useNavigate();
  const { data: flag, isLoading, error } = useFlag(flagKey);
  const { state, dispatch, isDirty, getPayload, reset } = useFlagForm(flag);
  const updateFlag = useUpdateFlag();

  // Unsaved changes guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = async () => {
    // Basic validation
    if (state.variations.length < 2) {
      toast.error('At least 2 variations are required');
      return;
    }
    if (state.offVariation >= state.variations.length) {
      toast.error('Off variation index is out of bounds');
      return;
    }
    // Validate rollout weights (only when rollout has actual entries)
    for (const rule of state.rules) {
      if (rule.rollout?.variations?.length) {
        const sum = rule.rollout.variations.reduce((s, rv) => s + rv.weight, 0);
        if (sum !== 100000) {
          toast.error(`Rule "${rule.description || rule.id}" rollout weights must sum to 100%`);
          return;
        }
      }
    }
    if (state.fallthrough.rollout?.variations?.length) {
      const sum = state.fallthrough.rollout.variations.reduce((s, rv) => s + rv.weight, 0);
      if (sum !== 100000) {
        toast.error('Default rule rollout weights must sum to 100%');
        return;
      }
    }

    try {
      const payload = getPayload();
      await updateFlag.mutateAsync({ key: flagKey!, input: payload });
      toast.success('Flag saved successfully');
    } catch {
      toast.error('Failed to save flag');
    }
  };

  const handleDiscard = () => {
    reset();
    toast.info('Changes discarded');
  };

  if (isLoading) {
    return <FlagDetailSkeleton />;
  }

  if (error || !flag) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h2 className="text-lg font-semibold">Flag not found</h2>
        <p className="text-sm text-muted-foreground">
          The flag &quot;{flagKey}&quot; could not be found.
        </p>
        <Button variant="outline" onClick={() => navigate('/flags')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Flags
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <FlagDetailHeader
        state={state}
        dispatch={dispatch}
        isDirty={isDirty}
        isSaving={updateFlag.isPending}
        onSave={handleSave}
        onDiscard={handleDiscard}
        flagKey={flagKey!}
        updatedAt={flag.updatedAt}
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <VariationsEditor
          variations={state.variations}
          offVariation={state.offVariation}
          dispatch={dispatch}
        />

        <IndividualTargets
          targets={state.targets}
          variations={state.variations}
          dispatch={dispatch}
        />

        <RuleBuilder
          rules={state.rules}
          variations={state.variations}
          dispatch={dispatch}
        />

        <DefaultRule
          fallthrough={state.fallthrough}
          variations={state.variations}
          offVariation={state.offVariation}
          enabled={state.enabled}
          dispatch={dispatch}
        />
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="flex items-center justify-between border-t bg-background px-6 py-3">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            You have unsaved changes
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateFlag.isPending}>
              {updateFlag.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FlagDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 border-b px-6 py-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex-1 space-y-6 p-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
