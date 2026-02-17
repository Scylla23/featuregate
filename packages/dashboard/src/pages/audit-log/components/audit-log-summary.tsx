import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditLogSummaryProps {
  total: number;
}

export function AuditLogSummary({ total }: AuditLogSummaryProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{total.toLocaleString()}</span>{' '}
        {total === 1 ? 'entry' : 'entries'}
      </p>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled>
        <Download className="size-3.5" />
        Export
      </Button>
    </div>
  );
}
