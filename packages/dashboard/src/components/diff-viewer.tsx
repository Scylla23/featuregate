import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  diff: Record<string, { from: unknown; to: unknown }> | null;
  previousValue: Record<string, unknown> | null;
  currentValue: Record<string, unknown> | null;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    if (val.length <= 3) return `[${val.map((v) => formatValue(v)).join(', ')}]`;
    return `[${val.length} items]`;
  }
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[._-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function VisualDiff({ diff }: { diff: Record<string, { from: unknown; to: unknown }> }) {
  const entries = Object.entries(diff);

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No changes detected</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, { from, to }]) => (
        <div key={key} className="rounded-md border p-2.5 text-xs">
          <span className="font-medium text-foreground">{humanizeKey(key)}</span>
          <div className="mt-1.5 flex flex-col gap-1">
            <div className="flex items-start gap-1.5">
              <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="text-red-600 dark:text-red-400 break-all">
                {formatValue(from)}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-green-500" />
              <span className="text-green-600 dark:text-green-400 break-all">
                {formatValue(to)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function JsonDiff({
  previousValue,
  currentValue,
}: {
  previousValue: Record<string, unknown> | null;
  currentValue: Record<string, unknown> | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium text-red-600 dark:text-red-400">Before</p>
        <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-2.5 text-xs leading-relaxed">
          {previousValue ? JSON.stringify(previousValue, null, 2) : 'null'}
        </pre>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-green-600 dark:text-green-400">After</p>
        <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-2.5 text-xs leading-relaxed">
          {currentValue ? JSON.stringify(currentValue, null, 2) : 'null'}
        </pre>
      </div>
    </div>
  );
}

export function DiffViewer({ diff, previousValue, currentValue }: DiffViewerProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');

  const hasDiff = diff && Object.keys(diff).length > 0;
  const hasRawValues = previousValue !== null || currentValue !== null;

  if (!hasDiff && !hasRawValues) {
    return <p className="text-xs text-muted-foreground">No change details available</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Button
          variant={mode === 'visual' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => setMode('visual')}
        >
          Changes
        </Button>
        <Button
          variant={mode === 'json' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => setMode('json')}
        >
          JSON
        </Button>
      </div>

      {mode === 'visual' ? (
        hasDiff ? (
          <VisualDiff diff={diff!} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Detailed diff not available. Switch to JSON view.
          </p>
        )
      ) : (
        <JsonDiff previousValue={previousValue} currentValue={currentValue} />
      )}
    </div>
  );
}
