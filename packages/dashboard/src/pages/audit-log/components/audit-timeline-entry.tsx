import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronDown, Flag, Users, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DiffViewer } from '@/components/diff-viewer';
import { AUDIT_ACTION_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AuditLogEntry } from '@/types/audit';

interface AuditTimelineEntryProps {
  entry: AuditLogEntry;
  isLast?: boolean;
}

function getActionSummary(entry: AuditLogEntry): string {
  const { action, resourceType, resourceKey, author } = entry;
  const actor = author.email.split('@')[0];

  switch (action) {
    case 'flag.created':
      return `${actor} created flag "${resourceKey}"`;
    case 'flag.updated':
      return `${actor} updated flag "${resourceKey}"`;
    case 'flag.toggled': {
      const enabled = (entry.currentValue as Record<string, unknown> | null)?.enabled;
      return `${actor} toggled flag "${resourceKey}" ${enabled ? 'ON' : 'OFF'}`;
    }
    case 'flag.archived':
      return `${actor} archived flag "${resourceKey}"`;
    case 'segment.created':
      return `${actor} created segment "${resourceKey}"`;
    case 'segment.updated':
      return `${actor} updated segment "${resourceKey}"`;
    case 'segment.archived':
      return `${actor} archived segment "${resourceKey}"`;
    default:
      return `${actor} performed ${action} on ${resourceType} "${resourceKey}"`;
  }
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  return name.substring(0, 2).toUpperCase();
}

function getDotColor(action: string): string {
  if (action.includes('created')) return 'bg-green-500';
  if (action.includes('updated')) return 'bg-blue-500';
  if (action.includes('toggled')) return 'bg-amber-500';
  if (action.includes('archived')) return 'bg-red-500';
  return 'bg-muted-foreground';
}

export function AuditTimelineEntry({ entry, isLast }: AuditTimelineEntryProps) {
  const [copiedId, setCopiedId] = useState(false);
  const timestamp = new Date(entry.timestamp);
  const actionLabel = AUDIT_ACTION_LABELS[entry.action];
  const detailLink =
    entry.resourceType === 'flag'
      ? `/flags/${entry.resourceKey}`
      : `/segments/${entry.resourceKey}`;
  const ResourceIcon = entry.resourceType === 'flag' ? Flag : Users;

  const handleCopyId = () => {
    navigator.clipboard.writeText(entry._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Collapsible>
      <div className="relative flex gap-4 pb-6">
        {/* Timeline line */}
        {!isLast && (
          <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
        )}

        {/* Dot */}
        <div className="relative z-10 mt-1.5 shrink-0">
          <div className={cn('size-[9px] rounded-full ring-4 ring-background', getDotColor(entry.action))} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Timestamp row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{format(timestamp, 'MMM d, yyyy, h:mm a')}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
          </div>

          {/* Actor + action */}
          <div className="flex flex-wrap items-center gap-2">
            <Avatar className="size-5">
              <AvatarFallback className="text-[10px]">{getInitials(entry.author.email)}</AvatarFallback>
            </Avatar>
            <p className="text-sm">{getActionSummary(entry)}</p>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={detailLink} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ResourceIcon className="size-3" />
              {entry.resourceKey}
            </Link>
            {actionLabel && (
              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', actionLabel.color)}>
                {actionLabel.label}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {entry.environmentKey}
            </Badge>
          </div>

          {/* Expand trigger */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="xs" className="gap-1 text-xs text-muted-foreground">
              <ChevronDown className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
              View details
            </Button>
          </CollapsibleTrigger>

          {/* Expandable content */}
          <CollapsibleContent>
            <div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3">
              <DiffViewer
                diff={entry.diff}
                previousValue={entry.previousValue}
                currentValue={entry.currentValue}
              />

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  Entry ID:
                  <code className="rounded bg-muted px-1">{entry._id.slice(-8)}</code>
                  <button onClick={handleCopyId} className="hover:text-foreground">
                    {copiedId ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                  </button>
                </span>
                <span>{format(timestamp, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}</span>
                <span>{entry.author.email}</span>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}
