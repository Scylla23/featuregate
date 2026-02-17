import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { ProjectProvider } from '@/providers/project-provider';
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

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/flags" replace />} />
              <Route path="/flags" element={<FlagsListPage />} />
              <Route path="/flags/:flagKey" element={<FlagDetailPage />} />
              <Route path="/segments" element={<SegmentsListPage />} />
              <Route path="/segments/:segmentKey" element={<SegmentDetailPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
          </ErrorBoundary>
          <Toaster richColors position="bottom-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
