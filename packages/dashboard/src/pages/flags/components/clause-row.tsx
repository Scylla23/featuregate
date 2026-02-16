import { useState } from 'react';
import { X, ChevronsUpDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import {
  OPERATORS,
  OPERATOR_CATEGORIES,
  BUILTIN_ATTRIBUTES,
  COMMON_ATTRIBUTES,
  getOperatorDef,
} from '@/lib/operators';
import type { Clause, VariationValue } from '@/types/flag';

interface ClauseRowProps {
  clause: Clause;
  onUpdate: (clause: Clause) => void;
  onDelete: () => void;
  isOnly: boolean;
  excludeOperators?: string[];
}

export function ClauseRow({
  clause,
  onUpdate,
  onDelete,
  isOnly,
  excludeOperators,
}: ClauseRowProps) {
  const operatorDef = getOperatorDef(clause.operator);
  const valueType = operatorDef?.valueType ?? 'single';

  const updateClause = (updates: Partial<Clause>) => {
    onUpdate({ ...clause, ...updates });
  };

  const filteredOperators = excludeOperators?.length
    ? OPERATORS.filter((o) => !excludeOperators.includes(o.value))
    : OPERATORS;

  return (
    <div className="flex items-start gap-2">
      {/* Attribute */}
      <AttributeCombobox
        value={clause.attribute}
        onChange={(attribute) => updateClause({ attribute })}
      />

      {/* Operator */}
      <Select
        value={clause.operator}
        onValueChange={(operator) => {
          const newDef = getOperatorDef(operator);
          const updates: Partial<Clause> = { operator };
          // Clear values if switching to a no-value operator
          if (newDef?.valueType === 'none') {
            updates.values = [];
          }
          updateClause(updates);
        }}
      >
        <SelectTrigger className="h-8 w-[180px] shrink-0 text-xs">
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent>
          {OPERATOR_CATEGORIES.map((cat) => {
            const ops = filteredOperators.filter((o) => o.category === cat.value);
            if (ops.length === 0) return null;
            return (
              <SelectGroup key={cat.value}>
                <SelectLabel>{cat.label}</SelectLabel>
                {ops.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>

      {/* Value input - adapts to operator type */}
      <div className="min-w-0 flex-1">
        {valueType === 'none' ? (
          <div className="flex h-8 items-center px-2 text-xs text-muted-foreground">
            No value needed
          </div>
        ) : valueType === 'multi' ? (
          <MultiValueInput
            values={clause.values}
            onChange={(values) => updateClause({ values })}
          />
        ) : (
          <Input
            value={clause.values[0] != null ? String(clause.values[0]) : ''}
            onChange={(e) => updateClause({ values: [e.target.value] })}
            placeholder="Value"
            className="h-8 text-xs"
          />
        )}
      </div>

      {/* Delete clause */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={isOnly}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attribute Combobox
// ---------------------------------------------------------------------------

function AttributeCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-[160px] shrink-0 justify-between text-xs font-normal"
        >
          <span className="truncate">{value || 'Select attribute'}</span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type..."
            className="h-8 text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(search.trim());
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  Use &quot;{search.trim()}&quot;
                </button>
              ) : (
                'No attributes found.'
              )}
            </CommandEmpty>
            <CommandGroup heading="Built-in">
              {BUILTIN_ATTRIBUTES.map((attr) => (
                <CommandItem
                  key={attr}
                  value={attr}
                  onSelect={() => {
                    onChange(attr);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 size-3', value === attr ? 'opacity-100' : 'opacity-0')}
                  />
                  {attr}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Common">
              {COMMON_ATTRIBUTES.map((attr) => (
                <CommandItem
                  key={attr}
                  value={attr}
                  onSelect={() => {
                    onChange(attr);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 size-3', value === attr ? 'opacity-100' : 'opacity-0')}
                  />
                  {attr}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Multi-Value Tag Input (for "is one of" / "is not one of")
// ---------------------------------------------------------------------------

function MultiValueInput({
  values,
  onChange,
}: {
  values: VariationValue[];
  onChange: (values: VariationValue[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (values.some((v) => String(v) === trimmed)) return;
    onChange([...values, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="flex min-h-[32px] flex-wrap items-center gap-1 rounded-md border px-2 py-1">
      {values.map((val, i) => (
        <Badge key={i} variant="secondary" className="gap-1 pr-1 text-[11px]">
          {String(val)}
          <button
            className="rounded-full hover:bg-muted-foreground/20"
            onClick={() => handleRemove(i)}
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleAdd}
        placeholder={values.length === 0 ? 'Type and press Enter...' : ''}
        className="min-w-[80px] flex-1 border-none bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
