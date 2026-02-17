import { Flag, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FlagWithConfig } from '@/types/flag';

interface FlagsSummaryCardsProps {
  flags: FlagWithConfig[];
  total: number;
}

export function FlagsSummaryCards({ flags, total }: FlagsSummaryCardsProps) {
  const active = flags.filter((f) => f.enabled).length;
  const stale = flags.filter((f) => {
    const updated = new Date(f.updatedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return updated < thirtyDaysAgo;
  }).length;

  const stats = [
    {
      label: 'Total Flags',
      value: total,
      icon: Flag,
      iconColor: 'text-foreground',
      iconBg: 'bg-muted',
    },
    {
      label: 'Active',
      value: active,
      icon: CheckCircle,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      label: 'Stale',
      value: stale,
      icon: AlertTriangle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      label: 'Evaluations (24h)',
      value: '12.8K',
      icon: Activity,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
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
