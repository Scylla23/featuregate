import { Badge } from '@/components/ui/badge';
import type { MemberRole } from '@/types/settings';
import { cn } from '@/lib/utils';

const ROLE_STYLES: Record<MemberRole, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  developer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  developer: 'Developer',
  viewer: 'Viewer',
};

interface RoleBadgeProps {
  role: MemberRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('border-0 font-medium', ROLE_STYLES[role], className)}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
