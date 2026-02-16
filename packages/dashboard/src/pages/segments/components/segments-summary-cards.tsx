import { Layers, GitBranch, List, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Segment } from '@/types/segment';

interface SegmentsSummaryCardsProps {
  segments: Segment[];
  total: number;
}

export function SegmentsSummaryCards({ segments, total }: SegmentsSummaryCardsProps) {
  const ruleBased = segments.filter((s) => s.rules.length > 0).length;
  const listBased = segments.filter(
    (s) => s.rules.length === 0 && (s.included.length > 0 || s.excluded.length > 0),
  ).length;
  const totalContexts = segments.reduce(
    (sum, s) => sum + s.included.length + s.excluded.length,
    0,
  );

  const stats = [
    {
      label: 'Total Segments',
      value: total,
      icon: Layers,
      iconColor: 'text-foreground',
      iconBg: 'bg-muted',
    },
    {
      label: 'Rule-based',
      value: ruleBased,
      icon: GitBranch,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'List-based',
      value: listBased,
      icon: List,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
      label: 'Total Contexts',
      value: totalContexts,
      icon: UserCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn('flex size-10 items-center justify-center rounded-lg', stat.iconBg)}>
              <stat.icon className={cn('size-5', stat.iconColor)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
