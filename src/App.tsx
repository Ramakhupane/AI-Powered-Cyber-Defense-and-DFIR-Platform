import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider } from './components/auth/AuthProvider';
import AuthGuard from './components/auth/AuthGuard';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import NetworkPage from './pages/NetworkPage';
import HistoryPage from './pages/HistoryPage';

function AppContent() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/signin" element={<AuthPage />} />
          <Route path="/auth/signup" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected routes wrapped in AuthGuard + AppShell */}
          <Route
            element={
              <AuthGuard>
                <AppShell>
                  <Outlet />
                </AppShell>
              </AuthGuard>
            }
          >
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/report/:scanId" element={<ReportPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#181818',
            color: '#e2e8f0',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'JetBrains Mono, monospace',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#181818' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#181818' },
          },
        }}
      />
      <AppContent />
    </AuthProvider>
  );
}