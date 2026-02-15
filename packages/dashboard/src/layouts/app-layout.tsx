import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { TopBar } from './top-bar';

export function AppLayout() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <SidebarProvider>
      <SidebarNav />
      <SidebarInset>
        <TopBar onCreateFlag={() => setCreateModalOpen(true)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Outlet context={{ createModalOpen, setCreateModalOpen }} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export type AppLayoutContext = {
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
};
