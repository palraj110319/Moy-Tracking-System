import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { YearFilterProvider } from './context/YearFilterContext';
import { ToastProvider } from './components/Toast';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { MoyTransactions } from './pages/MoyTransactions';
import { PersonSummary } from './pages/PersonSummary';
import { Settings } from './pages/Settings';

// Pages that pull in the chart library are loaded on demand.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/moy" element={<MoyTransactions />} />
          <Route path="/person-summary" element={<PersonSummary />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <YearFilterProvider>
          <AppRoutes />
        </YearFilterProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
