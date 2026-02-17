import { useMemo, useCallback, useRef } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResourceHistory } from '@/hooks/use-audit-log';
import { AuditTimelineEntry } from '@/pages/audit-log/components/audit-timeline-entry';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface ResourceHistoryProps {
  resourceType: 'flag' | 'segment';
  resourceKey: string;
}

export function ResourceHistory({ resourceType, resourceKey }: ResourceHistoryProps) {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useResourceHistory(resourceType, resourceKey);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.entries) ?? [],
    [data],
  );

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((observerEntries) => {
        if (observerEntries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-[9px] rounded-full mt-1.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No history yet"
        description={`Changes to this ${resourceType} will appear here.`}
      />
    );
  }

  return (
    <div>
      {entries.map((entry, index) => (
        <AuditTimelineEntry
          key={entry._id}
          entry={entry}
          isLast={index === entries.length - 1 && !hasNextPage}
        />
      ))}

      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading more...
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={fetchNextPage} className="text-xs">
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
