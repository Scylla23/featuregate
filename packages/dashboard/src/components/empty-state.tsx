import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="relative mb-8">
        <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25">
          <Icon className="size-8 text-muted-foreground/50" />
        </div>
        <div className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background bg-muted-foreground/20" />
        <div className="absolute -top-1 -left-1 size-3 rounded-full border-2 border-background bg-muted-foreground/15" />
      </div>

      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">{description}</p>

      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}
