import { Users, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SegmentsEmptyStateProps {
  onCreateSegment: () => void;
}

export function SegmentsEmptyState({ onCreateSegment }: SegmentsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="relative mb-8">
        <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25">
          <Users className="size-8 text-muted-foreground/50" />
        </div>
        <div className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background bg-muted-foreground/20" />
        <div className="absolute -top-1 -left-1 size-3 rounded-full border-2 border-background bg-muted-foreground/15" />
      </div>

      <h3 className="text-xl font-semibold tracking-tight">No user segments yet</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Segments let you group users for targeted feature rollouts. Create your first segment to get
        started.
      </p>

      <Button onClick={onCreateSegment} className="mt-6">
        <Plus className="size-4" />
        Create Your First Segment
      </Button>

      <button className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        Learn how segments work
        <ArrowRight className="size-3" />
      </button>
    </div>
  );
}
