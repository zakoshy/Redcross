import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import VolunteerDashboard from './components/VolunteerDashboard';
import MerchantDashboard from './components/MerchantDashboard';
import VictimChatbot from './components/VictimChatbot';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !allowedRoles.includes(profile.role)) {
    const dashboardMap: Record<string, string> = {
      admin: '/admin',
      volunteer: '/volunteer',
      merchant: '/merchant',
      victim: '/chat'
    };
    return <Navigate to={dashboardMap[profile.role] || '/login'} replace />;
  }

  return <>{children}</>;
}

function AuthenticatedRedirect({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (user && profile) {
    const dashboardMap: Record<string, string> = {
      admin: '/admin',
      volunteer: '/volunteer',
      merchant: '/merchant',
      victim: '/chat'
    };
    return <Navigate to={dashboardMap[profile.role] || '/'} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            <AuthenticatedRedirect>
              <Login />
            </AuthenticatedRedirect>
          } />
          <Route path="/signup" element={
            <AuthenticatedRedirect>
              <Signup />
            </AuthenticatedRedirect>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/volunteer" element={
            <ProtectedRoute allowedRoles={['volunteer']}>
              <VolunteerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantDashboard />
            </ProtectedRoute>
          } />

          <Route path="/chat" element={
            <ProtectedRoute allowedRoles={['victim']}>
              <VictimChatbot />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
