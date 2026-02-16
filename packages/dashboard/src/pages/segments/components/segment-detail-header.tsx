import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Loader2, FlaskConical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/copy-button';
import { TagMultiSelect } from '@/components/tag-multi-select';
import { SegmentTesterPanel } from './segment-tester-panel';
import type { SegmentFormState, SegmentFormAction } from '@/hooks/use-segment-form';

const DEFAULT_TAGS = ['frontend', 'backend', 'mobile', 'experiment', 'ops', 'beta', 'release'];

interface SegmentDetailHeaderProps {
  state: SegmentFormState;
  dispatch: React.Dispatch<SegmentFormAction>;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  segmentKey: string;
  updatedAt?: string;
}

export function SegmentDetailHeader({
  state,
  dispatch,
  isDirty,
  isSaving,
  onSave,
  onDiscard,
  segmentKey,
  updatedAt,
}: SegmentDetailHeaderProps) {
  const [testerOpen, setTesterOpen] = useState(false);

  return (
    <div className="space-y-4 border-b bg-background px-6 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/segments" className="hover:text-foreground transition-colors">
          Segments
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{state.name || segmentKey}</span>
      </div>

      {/* Name row */}
      <div className="flex items-center gap-4">
        <Input
          value={state.name}
          onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
          className="h-9 max-w-md text-base font-semibold"
          placeholder="Segment name"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTesterOpen(true)}
          >
            <FlaskConical className="mr-1.5 size-3.5" />
            Test Segment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={!isDirty || isSaving}
          >
            Discard
          </Button>
          <Button size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Key + Description */}
      <div className="flex items-start gap-6">
        <div className="flex items-center gap-1.5">
          <code className="rounded bg-muted px-2 py-0.5 text-xs">{segmentKey}</code>
          <CopyButton value={segmentKey} />
        </div>
        <Separator orientation="vertical" className="h-5" />
        <Input
          value={state.description}
          onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
          className="h-7 max-w-lg border-none bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
          placeholder="Add a description..."
        />
      </div>

      {/* Tags + Meta */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {state.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[11px] capitalize">
              {tag}
            </Badge>
          ))}
          <TagMultiSelect
            options={DEFAULT_TAGS}
            selected={state.tags}
            onSelectedChange={(tags) => dispatch({ type: 'SET_TAGS', payload: tags })}
            placeholder="Add tags..."
          />
        </div>
        {updatedAt && (
          <span className="ml-auto text-xs text-muted-foreground">
            Last modified {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Segment Tester Panel */}
      <SegmentTesterPanel
        segmentKey={segmentKey}
        included={state.included}
        excluded={state.excluded}
        rules={state.rules}
        open={testerOpen}
        onOpenChange={setTesterOpen}
      />
    </div>
  );
}
