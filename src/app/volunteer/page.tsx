"use client";

import React from 'react';
import VolunteerDashboard from '../../components/VolunteerDashboard';
import { ProtectedRoute } from '../../components/ProtectionWrappers';

export default function VolunteerRoute() {
  return (
    <ProtectedRoute allowedRoles={['volunteer']}>
      <VolunteerDashboard />
    </ProtectedRoute>
  );
}
