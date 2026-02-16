import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useSegment, useUpdateSegment } from '@/hooks/use-segments';
import { useSegmentForm } from '@/hooks/use-segment-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentDetailHeader } from './components/segment-detail-header';
import { SegmentFlagReferences } from './components/segment-flag-references';
import { SegmentTargets } from './components/segment-targets';
import { SegmentRuleBuilder } from './components/segment-rule-builder';

export function SegmentDetailPage() {
  const { segmentKey } = useParams<{ segmentKey: string }>();
  const navigate = useNavigate();
  const { data: segment, isLoading, error } = useSegment(segmentKey);
  const { state, dispatch, isDirty, getPayload, reset } = useSegmentForm(segment);
  const updateSegment = useUpdateSegment();

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
    // Validation
    if (!state.name.trim()) {
      toast.error('Segment name is required');
      return;
    }
    for (const rule of state.rules) {
      if (rule.clauses.length === 0) {
        toast.error(`Rule "${rule.description || rule.id}" must have at least one condition`);
        return;
      }
      if (rule.weight != null && (rule.weight < 0 || rule.weight > 100000)) {
        toast.error(`Rule "${rule.description || rule.id}" weight must be between 0% and 100%`);
        return;
      }
    }

    try {
      const payload = getPayload();
      await updateSegment.mutateAsync({ key: segmentKey!, input: payload });
      toast.success('Segment saved successfully');
    } catch {
      toast.error('Failed to save segment');
    }
  };

  const handleDiscard = () => {
    reset();
    toast.info('Changes discarded');
  };

  if (isLoading) {
    return <SegmentDetailSkeleton />;
  }

  if (error || !segment) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h2 className="text-lg font-semibold">Segment not found</h2>
        <p className="text-sm text-muted-foreground">
          The segment &quot;{segmentKey}&quot; could not be found.
        </p>
        <Button variant="outline" onClick={() => navigate('/segments')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Segments
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <SegmentDetailHeader
        state={state}
        dispatch={dispatch}
        isDirty={isDirty}
        isSaving={updateSegment.isPending}
        onSave={handleSave}
        onDiscard={handleDiscard}
        segmentKey={segmentKey!}
        updatedAt={segment.updatedAt}
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <SegmentFlagReferences segmentKey={segmentKey!} />

        <SegmentTargets
          included={state.included}
          excluded={state.excluded}
          dispatch={dispatch}
        />

        <SegmentRuleBuilder
          rules={state.rules}
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
            <Button size="sm" onClick={handleSave} disabled={updateSegment.isPending}>
              {updateSegment.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 border-b px-6 py-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex-1 space-y-6 p-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
