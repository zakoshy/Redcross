"use client";

import React from 'react';
import AdminDashboard from '../../components/AdminDashboard';
import { ProtectedRoute } from '../../components/ProtectionWrappers';

export default function AdminRoute() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}
