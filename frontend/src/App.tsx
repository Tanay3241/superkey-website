import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import { Toaster } from 'sonner';

// Lazy-loaded page components
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Keys = lazy(() => import('./pages/Keys'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-center" />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={
            <DashboardLayout>
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="animate-spin h-12 w-12 border-4 border-foreground border-t-transparent rounded-full" />
                  </div>
                }
              >
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Suspense>
            </DashboardLayout>
          } />
          <Route path="/users" element={
            <DashboardLayout>
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="animate-spin h-12 w-12 border-4 border-foreground border-t-transparent rounded-full" />
                  </div>
                }
              >
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              </Suspense>
            </DashboardLayout>
          } />
          <Route path="/wallet" element={
            <DashboardLayout>
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="animate-spin h-12 w-12 border-4 border-foreground border-t-transparent rounded-full" />
                  </div>
                }
              >
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              </Suspense>
            </DashboardLayout>
          } />
          <Route path="/keys" element={
            <DashboardLayout>
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="animate-spin h-12 w-12 border-4 border-foreground border-t-transparent rounded-full" />
                  </div>
                }
              >
                <ProtectedRoute>
                  <Keys />
                </ProtectedRoute>
              </Suspense>
            </DashboardLayout>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
