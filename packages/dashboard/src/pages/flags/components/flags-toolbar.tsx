import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagMultiSelect } from '@/components/tag-multi-select';
import { MOCK_TAGS } from '@/mock/flags';

interface FlagsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export function FlagsToolbar({
  search,
  onSearchChange,
  selectedTags,
  onSelectedTagsChange,
  sortBy,
  onSortByChange,
}: FlagsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search flags by name or key..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <TagMultiSelect
          options={MOCK_TAGS}
          selected={selectedTags}
          onSelectedChange={onSelectedTagsChange}
          className="w-[160px]"
        />
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt-desc">Last Updated</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="enabled-desc">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
