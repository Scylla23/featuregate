import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagMultiSelectProps {
  options: string[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagMultiSelect({
  options,
  selected,
  onSelectedChange,
  placeholder = 'Filter by tags...',
  className,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onSelectedChange(selected.filter((t) => t !== tag));
    } else {
      onSelectedChange([...selected, tag]);
    }
  };

  const clear = () => {
    onSelectedChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn('h-9 justify-between gap-1 font-normal', className)}
        >
          {selected.length > 0 ? (
            <span className="flex items-center gap-1">
              <span className="text-xs">{selected.length} selected</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." className="h-9" />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {options.map((tag) => (
                <CommandItem
                  key={tag}
                  onSelect={() => toggle(tag)}
                  className="flex items-center gap-2"
                >
                  <div
                    className={cn(
                      'flex size-4 items-center justify-center rounded-sm border',
                      selected.includes(tag)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30',
                    )}
                  >
                    {selected.includes(tag) && <Check className="size-3" />}
                  </div>
                  <span className="capitalize">{tag}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <div className="border-t p-1">
              <Button variant="ghost" size="sm" className="w-full justify-center" onClick={clear}>
                Clear filters
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface TagBadgeListProps {
  tags: string[];
  max?: number;
}

export function TagBadgeList({ tags, max = 3 }: TagBadgeListProps) {
  const visible = tags.slice(0, max);
  const overflow = tags.length - max;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-[11px] capitalize px-1.5 py-0">
          {tag}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-muted-foreground">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
