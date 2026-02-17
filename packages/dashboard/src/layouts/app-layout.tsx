import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProjectProvider } from '@/providers/project-provider';
import { useAuth } from '@/hooks/use-auth';
import { LoadingBar } from '@/components/loading-bar';
import { CommandPalette } from '@/components/command-palette';
import { SidebarNav } from './sidebar-nav';
import { TopBar } from './top-bar';

const PAGE_TITLE_MAP: Record<string, string> = {
  '/flags': 'Feature Flags',
  '/segments': 'Segments',
  '/audit-log': 'Audit Log',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const base = '/' + location.pathname.split('/')[1];
    const pageTitle = PAGE_TITLE_MAP[base] || 'Dashboard';
    document.title = `${pageTitle} — FeatureGate`;
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ProjectProvider>
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset>
          <TopBar onCreateFlag={() => setCreateModalOpen(true)} />
          <LoadingBar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Outlet context={{ createModalOpen, setCreateModalOpen }} />
          </div>
        </SidebarInset>
        <CommandPalette onCreateFlag={() => setCreateModalOpen(true)} />
      </SidebarProvider>
    </ProjectProvider>
  );
}

export type AppLayoutContext = {
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
};
