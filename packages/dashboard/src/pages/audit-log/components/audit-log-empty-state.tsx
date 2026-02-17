import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

export function AuditLogEmptyState() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="No audit log entries"
      description="Changes to flags and segments will appear here automatically. Create or modify a flag to see your first entry."
    />
  );
}
