import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFlags } from '@/hooks/use-flags';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { FlagsSummaryCards } from './components/flags-summary-cards';
import { FlagsToolbar } from './components/flags-toolbar';
import { FlagsTable } from './components/flags-table';
import { FlagsEmptyState } from './components/flags-empty-state';
import { CreateFlagModal } from './components/create-flag-modal';
import type { AppLayoutContext } from '@/layouts/app-layout';
import type { ListFlagsParams } from '@/types/flag';

const PAGE_SIZE = 20;

export function FlagsListPage() {
  const { createModalOpen, setCreateModalOpen } = useOutletContext<AppLayoutContext>();

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('updatedAt-desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);

  const params = useMemo<ListFlagsParams>(() => {
    const [field, order] = sortBy.split('-') as [string, string];
    return {
      search: debouncedSearch || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      sortBy: field as ListFlagsParams['sortBy'],
      sortOrder: order as ListFlagsParams['sortOrder'],
      page,
      limit: PAGE_SIZE,
    };
  }, [debouncedSearch, selectedTags, sortBy, page]);

  const { data, isLoading } = useFlags(params);

  // Check if the list is truly empty (no flags at all, not just filtered to zero)
  const { data: allData } = useFlags({ limit: 1 });
  const hasNoFlags = !isLoading && allData?.total === 0;

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
      {hasNoFlags ? (
        <div className="flex-1 overflow-auto">
          <FlagsEmptyState onCreateFlag={() => setCreateModalOpen(true)} />
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-6 overflow-auto p-6">
            <FlagsSummaryCards flags={data?.data ?? []} total={total} />

            <FlagsToolbar
              search={search}
              onSearchChange={handleSearchChange}
              selectedTags={selectedTags}
              onSelectedTagsChange={handleTagsChange}
              sortBy={sortBy}
              onSortByChange={handleSortChange}
            />

            <FlagsTable
              flags={data?.data ?? []}
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

      <CreateFlagModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
