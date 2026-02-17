import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/date-range-picker';
import { AUDIT_RESOURCE_TYPES, AUDIT_ACTIONS } from '@/lib/constants';

interface AuditLogToolbarProps {
  resourceType: string;
  onResourceTypeChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  authorSearch: string;
  onAuthorSearchChange: (value: string) => void;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
}

export function AuditLogToolbar({
  resourceType,
  onResourceTypeChange,
  action,
  onActionChange,
  authorSearch,
  onAuthorSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: AuditLogToolbarProps) {
  const activeFilters: { key: string; label: string; onClear: () => void }[] = [];

  if (resourceType) {
    const label = AUDIT_RESOURCE_TYPES.find((r) => r.value === resourceType)?.label || resourceType;
    activeFilters.push({ key: 'resource', label, onClear: () => onResourceTypeChange('') });
  }
  if (action) {
    const label = AUDIT_ACTIONS.find((a) => a.value === action)?.label || action;
    activeFilters.push({ key: 'action', label, onClear: () => onActionChange('') });
  }
  if (authorSearch) {
    activeFilters.push({
      key: 'author',
      label: `Author: ${authorSearch}`,
      onClear: () => onAuthorSearchChange(''),
    });
  }

  const clearAll = () => {
    onResourceTypeChange('');
    onActionChange('');
    onAuthorSearchChange('');
    onDateFromChange(undefined);
    onDateToChange(undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onFromChange={onDateFromChange}
          onToChange={onDateToChange}
        />

        <Select value={resourceType} onValueChange={onResourceTypeChange}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-[140px]">
            <SelectValue placeholder="All Resources" />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_RESOURCE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value || '_all'}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={onActionChange}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-[130px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_ACTIONS.map((a) => (
              <SelectItem key={a.value} value={a.value || '_all'}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 sm:max-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by author..."
            value={authorSearch}
            onChange={(e) => onAuthorSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              {filter.label}
              <button
                onClick={filter.onClear}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
