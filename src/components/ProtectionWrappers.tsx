"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (profile && !allowedRoles.includes(profile.role)) {
        const dashboardMap: Record<string, string> = {
          admin: '/admin',
          volunteer: '/volunteer',
          merchant: '/merchant',
          victim: '/chat'
        };
        router.replace(dashboardMap[profile.role] || '/login');
      }
    }
  }, [user, profile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user || (profile && !allowedRoles.includes(profile.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthenticatedRedirect({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      const dashboardMap: Record<string, string> = {
        admin: '/admin',
        volunteer: '/volunteer',
        merchant: '/merchant',
        victim: '/chat'
      };
      router.replace(dashboardMap[profile.role] || '/');
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return <>{children}</>;
}
