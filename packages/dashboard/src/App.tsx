import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/layouts/app-layout';
import { LoginPage } from '@/pages/auth/login-page';
import { FlagsListPage } from '@/pages/flags/flags-list-page';
import { FlagDetailPage } from '@/pages/flags/flag-detail-page';
import { SegmentsListPage } from '@/pages/segments/segments-list-page';
import { SegmentDetailPage } from '@/pages/segments/segment-detail-page';
import { AuditLogPage } from '@/pages/audit-log/audit-log-page';
import { SettingsPage } from '@/pages/settings/settings-page';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/flags" replace /> },
      { path: 'flags', element: <FlagsListPage /> },
      { path: 'flags/:flagKey', element: <FlagDetailPage /> },
      { path: 'segments', element: <SegmentsListPage /> },
      { path: 'segments/:segmentKey', element: <SegmentDetailPage /> },
      { path: 'audit-log', element: <AuditLogPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
        <Toaster richColors position="bottom-right" />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
