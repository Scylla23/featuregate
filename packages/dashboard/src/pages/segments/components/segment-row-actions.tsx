import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Copy, History, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteSegment } from '@/hooks/use-segments';
import { toast } from 'sonner';

interface SegmentRowActionsProps {
  segmentKey: string;
}

export function SegmentRowActions({ segmentKey }: SegmentRowActionsProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteSegment = useDeleteSegment();

  const handleDelete = async () => {
    try {
      await deleteSegment.mutateAsync(segmentKey);
      toast.success('Segment archived');
      setDeleteOpen(false);
    } catch (err) {
      const error = err as { details?: { flags?: string[] }; message?: string };
      if (error.details?.flags) {
        toast.error(
          `Cannot archive: referenced by flags: ${error.details.flags.join(', ')}`,
        );
      } else {
        toast.error(error.message || 'Failed to archive segment');
      }
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
            <MoreVertical className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate(`/segments/${segmentKey}`)}>
            <Pencil className="mr-2 size-4" />
            Edit Segment
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await navigator.clipboard.writeText(segmentKey);
              toast.success('Segment key copied to clipboard');
            }}
          >
            <Copy className="mr-2 size-4" />
            Copy Key
          </DropdownMenuItem>
          <DropdownMenuItem>
            <History className="mr-2 size-4" />
            View Audit Log
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Archive className="mr-2 size-4" />
            Archive Segment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive <code className="font-mono">{segmentKey}</code>?
              This segment will no longer be available for targeting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSegment.isPending}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
