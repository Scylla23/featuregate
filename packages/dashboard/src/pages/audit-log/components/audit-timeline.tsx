import { useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuditTimelineEntry } from './audit-timeline-entry';
import type { AuditLogEntry } from '@/types/audit';

interface AuditTimelineProps {
  entries: AuditLogEntry[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function AuditTimeline({
  entries,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: AuditTimelineProps) {
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

  return (
    <div className="relative">
      <div className="space-y-0">
        {entries.map((entry, index) => (
          <AuditTimelineEntry
            key={entry._id}
            entry={entry}
            isLast={index === entries.length - 1 && !hasNextPage}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
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
