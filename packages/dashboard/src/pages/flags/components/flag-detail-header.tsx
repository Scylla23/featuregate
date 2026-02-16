import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Loader2, FlaskConical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/copy-button';
import { TagMultiSelect } from '@/components/tag-multi-select';
import { ContextTesterPanel } from './context-tester-panel';
import type { FlagFormState, FlagFormAction } from '@/hooks/use-flag-form';

const DEFAULT_TAGS = ['frontend', 'backend', 'mobile', 'experiment', 'ops', 'beta', 'release'];

interface FlagDetailHeaderProps {
  state: FlagFormState;
  dispatch: React.Dispatch<FlagFormAction>;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  flagKey: string;
  updatedAt?: string;
}

export function FlagDetailHeader({
  state,
  dispatch,
  isDirty,
  isSaving,
  onSave,
  onDiscard,
  flagKey,
  updatedAt,
}: FlagDetailHeaderProps) {
  const [testerOpen, setTesterOpen] = useState(false);

  return (
    <div className="space-y-4 border-b bg-background px-6 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/flags" className="hover:text-foreground transition-colors">
          Feature Flags
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{state.name || flagKey}</span>
      </div>

      {/* Name + Toggle row */}
      <div className="flex items-center gap-4">
        <Input
          value={state.name}
          onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
          className="h-9 max-w-md text-base font-semibold"
          placeholder="Flag name"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {state.enabled ? 'ON' : 'OFF'}
          </span>
          <Switch
            checked={state.enabled}
            onCheckedChange={(checked) =>
              dispatch({ type: 'SET_ENABLED', payload: checked })
            }
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTesterOpen(true)}
          >
            <FlaskConical className="mr-1.5 size-3.5" />
            Test Context
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
          <code className="rounded bg-muted px-2 py-0.5 text-xs">{flagKey}</code>
          <CopyButton value={flagKey} />
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

      {/* Context Tester Panel */}
      <ContextTesterPanel
        flagKey={flagKey}
        variations={state.variations}
        rules={state.rules}
        targets={state.targets}
        enabled={state.enabled}
        offVariation={state.offVariation}
        fallthrough={state.fallthrough}
        open={testerOpen}
        onOpenChange={setTesterOpen}
      />
    </div>
  );
}
