import { useLocation } from 'react-router-dom';
import { Bell, Plus, CircleDot } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PAGE_TITLES: Record<string, string> = {
  '/flags': 'Feature Flags',
  '/segments': 'Segments',
  '/audit-log': 'Audit Logs',
  '/settings': 'Settings',
};

interface TopBarProps {
  onCreateFlag?: () => void;
}

export function TopBar({ onCreateFlag }: TopBarProps) {
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';
  const showCreateButton = location.pathname === '/flags';

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Select defaultValue="production">
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <CircleDot className="mr-1 size-3 text-emerald-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
          <Bell className="size-4" />
        </Button>

        {showCreateButton && (
          <Button size="sm" onClick={onCreateFlag}>
            <Plus className="size-4" />
            Create Flag
          </Button>
        )}
      </div>
    </header>
  );
}
