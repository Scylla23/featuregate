import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { useAuditLogInfinite } from '@/hooks/use-audit-log';
import { useDebounce } from '@/hooks/use-debounce';
import { AuditLogSummary } from './components/audit-log-summary';
import { AuditLogToolbar } from './components/audit-log-toolbar';
import { AuditTimeline } from './components/audit-timeline';
import { AuditLogEmptyState } from './components/audit-log-empty-state';
import { AuditLogSkeleton } from './components/audit-log-skeleton';

export function AuditLogPage() {
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string | undefined>(
    subDays(new Date(), 7).toISOString(),
  );
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);

  const debouncedAuthor = useDebounce(authorSearch, 300);

  const params = useMemo(() => {
    const p: Record<string, string | undefined> = {};
    if (resourceType && resourceType !== '_all') p.resourceType = resourceType;
    if (action && action !== '_all') p.action = action;
    if (debouncedAuthor) p.author = debouncedAuthor;
    if (dateFrom) p.from = dateFrom;
    if (dateTo) p.to = dateTo;
    return p;
  }, [resourceType, action, debouncedAuthor, dateFrom, dateTo]);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAuditLogInfinite(params);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.entries) ?? [],
    [data],
  );

  const total = data?.pages[0]?.total ?? 0;
  const isEmpty = !isLoading && entries.length === 0;

  const handleResourceTypeChange = (value: string) => {
    setResourceType(value === '_all' ? '' : value);
  };

  const handleActionChange = (value: string) => {
    setAction(value === '_all' ? '' : value);
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <AuditLogSkeleton />
      </div>
    );
  }

  if (isEmpty && !resourceType && !action && !debouncedAuthor) {
    return <AuditLogEmptyState />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-auto p-6">
        <AuditLogSummary total={total} />
        <AuditLogToolbar
          resourceType={resourceType}
          onResourceTypeChange={handleResourceTypeChange}
          action={action}
          onActionChange={handleActionChange}
          authorSearch={authorSearch}
          onAuthorSearchChange={setAuthorSearch}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        {isEmpty ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No entries match your filters.
            </p>
            <button
              onClick={() => {
                setResourceType('');
                setAction('');
                setAuthorSearch('');
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
              className="mt-1 text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <AuditTimeline
            entries={entries}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        )}
      </div>
    </div>
  );
}
