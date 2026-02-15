import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFlags } from '@/hooks/use-flags';
import { useDebounce } from '@/hooks/use-debounce';
import { FlagsSummaryCards } from './components/flags-summary-cards';
import { FlagsToolbar } from './components/flags-toolbar';
import { FlagsTable } from './components/flags-table';
import { FlagsEmptyState } from './components/flags-empty-state';
import { CreateFlagModal } from './components/create-flag-modal';
import type { AppLayoutContext } from '@/layouts/app-layout';
import type { ListFlagsParams } from '@/types/flag';

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
      limit: 5,
    };
  }, [debouncedSearch, selectedTags, sortBy, page]);

  const { data, isLoading } = useFlags(params);

  // Check if the list is truly empty (no flags at all, not just filtered to zero)
  const { data: allData } = useFlags({ limit: 1 });
  const hasNoFlags = !isLoading && allData?.total === 0;

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
    <div className="p-6 space-y-6">
      {hasNoFlags ? (
        <FlagsEmptyState onCreateFlag={() => setCreateModalOpen(true)} />
      ) : (
        <>
          <FlagsSummaryCards flags={data?.data ?? []} total={data?.total ?? 0} />

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
            total={data?.total ?? 0}
            page={data?.page ?? 1}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </>
      )}

      <CreateFlagModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
