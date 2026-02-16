import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { ProjectProvider } from '@/providers/project-provider';
import { AppLayout } from '@/layouts/app-layout';
import { LoginPage } from '@/pages/auth/login-page';
import { FlagsListPage } from '@/pages/flags/flags-list-page';
import { Toaster } from '@/components/ui/sonner';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Coming soon</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/flags" replace />} />
              <Route path="/flags" element={<FlagsListPage />} />
              <Route path="/segments" element={<PlaceholderPage title="Segments" />} />
              <Route path="/audit-log" element={<PlaceholderPage title="Audit Logs" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            </Route>
          </Routes>
          <Toaster richColors position="bottom-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
