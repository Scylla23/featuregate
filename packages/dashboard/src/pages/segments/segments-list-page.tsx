import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSegments } from '@/hooks/use-segments';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { SegmentsSummaryCards } from './components/segments-summary-cards';
import { SegmentsToolbar } from './components/segments-toolbar';
import { SegmentsTable } from './components/segments-table';
import { SegmentsEmptyState } from './components/segments-empty-state';
import { CreateSegmentModal } from './components/create-segment-modal';
import { useProject } from '@/providers/project-provider';
import type { ListSegmentsParams } from '@/types/segment';

const PAGE_SIZE = 20;

export function SegmentsListPage() {
  const { activeProjectId, activeEnvironmentKey } = useProject();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('updatedAt-desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);

  const params = useMemo<ListSegmentsParams>(() => {
    return {
      search: debouncedSearch || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      page,
      limit: PAGE_SIZE,
      projectId: activeProjectId || undefined,
      environmentKey: activeEnvironmentKey || undefined,
    };
  }, [debouncedSearch, selectedTags, page, activeProjectId, activeEnvironmentKey]);

  const { data, isLoading } = useSegments(params);

  // Check if the list is truly empty (no segments at all, not just filtered to zero)
  const { data: allData } = useSegments({
    limit: 1,
    projectId: activeProjectId || undefined,
    environmentKey: activeEnvironmentKey || undefined,
  });
  const hasNoSegments = !isLoading && allData?.total === 0;

  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;
  const start = total > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(currentPage * PAGE_SIZE, total);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  return (
    <div className="flex h-full flex-col">
      {hasNoSegments ? (
        <div className="flex-1 overflow-auto">
          <SegmentsEmptyState onCreateSegment={() => setCreateModalOpen(true)} />
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-6 overflow-auto p-6">
            <SegmentsSummaryCards segments={data?.data ?? []} total={total} />

            <SegmentsToolbar
              search={search}
              onSearchChange={handleSearchChange}
              selectedTags={selectedTags}
              onSelectedTagsChange={handleTagsChange}
              sortBy={sortBy}
              onSortByChange={handleSortChange}
              onCreateSegment={() => setCreateModalOpen(true)}
            />

            <SegmentsTable
              segments={data?.data ?? []}
              isLoading={isLoading}
              skeletonRows={8}
            />
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between border-t bg-background px-6 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {start} to {end} of {total} results
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage(page - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="icon-sm"
                    onClick={() => setPage(p)}
                    className="text-xs"
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage(page + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateSegmentModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
