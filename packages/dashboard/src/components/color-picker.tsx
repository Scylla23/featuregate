import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Lime', value: '#84CC16' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-start gap-2">
          <div
            className="size-4 rounded-full border"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-xs">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.value}
              className={cn(
                'size-8 rounded-full border-2 transition-transform hover:scale-110',
                value.toUpperCase() === color.value.toUpperCase()
                  ? 'border-foreground'
                  : 'border-transparent',
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => {
                onChange(color.value);
                setCustomColor(color.value);
              }}
              title={color.label}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="#000000"
            className="h-8 font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                onChange(customColor);
              }
            }}
          >
            Set
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
