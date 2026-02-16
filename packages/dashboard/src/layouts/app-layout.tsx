import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProjectProvider } from '@/providers/project-provider';
import { useAuth } from '@/hooks/use-auth';
import { SidebarNav } from './sidebar-nav';
import { TopBar } from './top-bar';

export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ProjectProvider>
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset>
          <TopBar onCreateFlag={() => setCreateModalOpen(true)} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Outlet context={{ createModalOpen, setCreateModalOpen }} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProjectProvider>
  );
}

export type AppLayoutContext = {
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
};
