import { useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/copy-button';
import { cn } from '@/lib/utils';

interface MaskedSecretProps {
  value: string;
  label?: string;
  canReveal?: boolean;
  className?: string;
}

function maskValue(value: string): string {
  if (value.length <= 12) return value.slice(0, 4) + '\u2022'.repeat(8);
  return value.slice(0, 8) + '\u2022'.repeat(16) + value.slice(-4);
}

export function MaskedSecret({ value, label, canReveal = true, className }: MaskedSecretProps) {
  const [revealed, setRevealed] = useState(false);

  // Auto-hide after 10 seconds
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), 10000);
    return () => clearTimeout(timer);
  }, [revealed]);

  const toggleReveal = useCallback(() => {
    setRevealed((prev) => !prev);
  }, []);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="min-w-[100px] text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs">
        {revealed ? value : maskValue(value)}
      </code>
      {canReveal && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          onClick={toggleReveal}
        >
          {revealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </Button>
      )}
      <CopyButton value={value} />
    </div>
  );
}
