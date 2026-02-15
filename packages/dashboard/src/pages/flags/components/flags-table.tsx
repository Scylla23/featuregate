import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CopyButton } from '@/components/copy-button';
import { TagBadgeList } from '@/components/tag-multi-select';
import { FlagRowActions } from './flag-row-actions';
import { useToggleFlag } from '@/hooks/use-flags';
import { getAuthorForFlag } from '@/mock/flags';
import { toast } from 'sonner';
import type { Flag } from '@/types/flag';

interface FlagsTableProps {
  flags: Flag[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function FlagsTable({
  flags,
  total,
  page,
  totalPages,
  onPageChange,
  isLoading,
}: FlagsTableProps) {
  const toggleFlag = useToggleFlag();

  const handleToggle = (flag: Flag) => {
    toggleFlag.mutate(flag.key, {
      onSuccess: (updated) => {
        toast.success(`${updated.name} ${updated.enabled ? 'enabled' : 'disabled'}`);
      },
      onError: () => {
        toast.error('Failed to toggle flag');
      },
    });
  };

  if (isLoading) {
    return <FlagsTableSkeleton />;
  }

  const start = (page - 1) * 5 + 1;
  const end = Math.min(page * 5, total);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[35%]">Flag Details</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[15%]">Environment</TableHead>
              <TableHead className="w-[20%]">Tags</TableHead>
              <TableHead className="w-[15%]">Last Updated</TableHead>
              <TableHead className="w-[5%]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((flag) => {
              const author = getAuthorForFlag(flag._id);
              return (
                <TableRow key={flag._id}>
                  <TableCell>
                    <div className="flex items-start gap-1">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{flag.name}</p>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-muted-foreground">{flag.key}</code>
                          <CopyButton value={flag.key} />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggle(flag)}
                      aria-label={`Toggle ${flag.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[11px] capitalize"
                    >
                      {flag.environmentKey}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TagBadgeList tags={flag.tags} max={2} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {author.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(flag.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <FlagRowActions flagKey={flag.key} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {start} to {end} of {total} results
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => onPageChange(p)}
                className="text-xs"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FlagsTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[35%]">Flag Details</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[15%]">Environment</TableHead>
            <TableHead className="w-[20%]">Tags</TableHead>
            <TableHead className="w-[15%]">Last Updated</TableHead>
            <TableHead className="w-[5%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-9 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="size-6 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
