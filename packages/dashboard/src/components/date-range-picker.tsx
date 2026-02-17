import { useState } from 'react';
import { format, subHours, subDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AUDIT_DATE_PRESETS } from '@/lib/constants';

interface DateRangePickerProps {
  from: string | undefined;
  to: string | undefined;
  onFromChange: (date: string | undefined) => void;
  onToChange: (date: string | undefined) => void;
  className?: string;
}

function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  switch (preset) {
    case '24h':
      return { from: subHours(now, 24).toISOString(), to };
    case '7d':
      return { from: subDays(now, 7).toISOString(), to };
    case '30d':
      return { from: subDays(now, 30).toISOString(), to };
    default:
      return { from: subDays(now, 7).toISOString(), to };
  }
}

function getActivePresetLabel(from: string | undefined): string {
  if (!from) return 'Last 7 days';

  const now = Date.now();
  const diff = now - new Date(from).getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours <= 25) return 'Last 24 hours';
  if (hours <= 169) return 'Last 7 days';
  if (hours <= 721) return 'Last 30 days';
  return 'Custom range';
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('7d');

  const handlePresetClick = (value: string) => {
    if (value === 'custom') {
      setActivePreset('custom');
      return;
    }
    const range = getPresetRange(value);
    onFromChange(range.from);
    onToChange(range.to);
    setActivePreset(value);
    setOpen(false);
  };

  const handleCustomFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    onFromChange(date ? new Date(date).toISOString() : undefined);
    setActivePreset('custom');
  };

  const handleCustomTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    onToChange(date ? new Date(date).toISOString() : undefined);
    setActivePreset('custom');
  };

  const displayLabel = from ? getActivePresetLabel(from) : 'Last 7 days';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-1.5 text-xs', className)}>
          <CalendarDays className="size-3.5" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Date Range</p>
          <div className="grid grid-cols-2 gap-1.5">
            {AUDIT_DATE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={activePreset === preset.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {activePreset === 'custom' && (
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
                  value={from ? format(new Date(from), 'yyyy-MM-dd') : ''}
                  onChange={handleCustomFrom}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
                  value={to ? format(new Date(to), 'yyyy-MM-dd') : ''}
                  onChange={handleCustomTo}
                />
              </div>
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={() => setOpen(false)}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
