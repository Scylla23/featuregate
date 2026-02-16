import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Flag, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSegmentFlags } from '@/hooks/use-segments';

interface SegmentFlagReferencesProps {
  segmentKey: string;
}

export function SegmentFlagReferences({ segmentKey }: SegmentFlagReferencesProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: flags, isLoading } = useSegmentFlags(segmentKey);

  const count = flags?.length ?? 0;

  return (
    <Card>
      <CardContent className="p-4">
        <Button
          variant="ghost"
          className="flex w-full items-center justify-start gap-2 p-0 h-auto hover:bg-transparent"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <Flag className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {isLoading ? (
              <Loader2 className="inline size-3 animate-spin" />
            ) : count > 0 ? (
              `Referenced by ${count} ${count === 1 ? 'flag' : 'flags'}`
            ) : (
              'No flags reference this segment'
            )}
          </span>
        </Button>

        {expanded && count > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 pl-10">
            {flags?.map((flag) => (
              <Link key={flag.key} to={`/flags/${flag.key}`}>
                <Badge
                  variant="outline"
                  className="cursor-pointer gap-1.5 text-[11px] hover:bg-accent"
                >
                  <span
                    className={`size-1.5 rounded-full ${flag.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                  />
                  {flag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
