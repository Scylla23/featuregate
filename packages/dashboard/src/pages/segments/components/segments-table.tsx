import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/copy-button';
import { TagBadgeList } from '@/components/tag-multi-select';
import { SegmentRowActions } from './segment-row-actions';
import type { Segment } from '@/types/segment';

interface SegmentsTableProps {
  segments: Segment[];
  isLoading?: boolean;
  skeletonRows?: number;
}

function getSegmentKind(segment: Segment): { label: string; variant: 'default' | 'secondary' } {
  if (segment.rules.length > 0) {
    return { label: 'Rule-based', variant: 'default' };
  }
  return { label: 'List-based', variant: 'secondary' };
}

export function SegmentsTable({ segments, isLoading, skeletonRows = 8 }: SegmentsTableProps) {
  if (isLoading) {
    return <SegmentsTableSkeleton rows={skeletonRows} />;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[30%]">Segment Details</TableHead>
            <TableHead className="w-[12%]">Kind</TableHead>
            <TableHead className="w-[12%]">Contexts</TableHead>
            <TableHead className="w-[10%]">Rules</TableHead>
            <TableHead className="w-[16%]">Tags</TableHead>
            <TableHead className="w-[15%]">Last Updated</TableHead>
            <TableHead className="w-[5%]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {segments.map((segment) => {
            const kind = getSegmentKind(segment);
            const contextCount = segment.included.length + segment.excluded.length;

            return (
              <TableRow key={segment._id}>
                <TableCell>
                  <div className="min-w-0">
                    <Link
                      to={`/segments/${segment.key}`}
                      className="truncate font-medium hover:underline"
                    >
                      {segment.name}
                    </Link>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-muted-foreground">{segment.key}</code>
                      <CopyButton value={segment.key} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={kind.variant}
                    className={
                      kind.label === 'Rule-based'
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 text-[11px]'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400 text-[11px]'
                    }
                  >
                    {kind.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {contextCount.toLocaleString()} {contextCount === 1 ? 'context' : 'contexts'}
                  </span>
                </TableCell>
                <TableCell>
                  {segment.rules.length > 0 ? (
                    <Badge variant="outline" className="text-[11px]">
                      {segment.rules.length} {segment.rules.length === 1 ? 'rule' : 'rules'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <TagBadgeList tags={segment.tags} max={2} />
                </TableCell>
                <TableCell>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(segment.updatedAt), { addSuffix: true })}
                  </p>
                </TableCell>
                <TableCell>
                  <SegmentRowActions segmentKey={segment.key} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SegmentsTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[30%]">Segment Details</TableHead>
            <TableHead className="w-[12%]">Kind</TableHead>
            <TableHead className="w-[12%]">Contexts</TableHead>
            <TableHead className="w-[10%]">Rules</TableHead>
            <TableHead className="w-[16%]">Tags</TableHead>
            <TableHead className="w-[15%]">Last Updated</TableHead>
            <TableHead className="w-[5%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-14 rounded-full" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-3 w-20" />
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
