import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagMultiSelect } from '@/components/tag-multi-select';

const DEFAULT_TAGS = ['frontend', 'backend', 'experiment', 'ops', 'beta', 'release', 'mobile'];

interface SegmentsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  onCreateSegment: () => void;
}

export function SegmentsToolbar({
  search,
  onSearchChange,
  selectedTags,
  onSelectedTagsChange,
  sortBy,
  onSortByChange,
  onCreateSegment,
}: SegmentsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search segments by name or key..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <TagMultiSelect
          options={DEFAULT_TAGS}
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
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onCreateSegment}>
          <Plus className="size-4" />
          Create Segment
        </Button>
      </div>
    </div>
  );
}
