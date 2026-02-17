import { Skeleton } from '@/components/ui/skeleton';

function SkeletonEntry() {
  return (
    <div className="relative flex gap-4 pb-6">
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
      <div className="relative z-10 mt-1.5 shrink-0">
        <Skeleton className="size-[9px] rounded-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function AuditLogSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonEntry key={i} />
      ))}
    </div>
  );
}
