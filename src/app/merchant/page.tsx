"use client";

import React from 'react';
import MerchantDashboard from '../../components/MerchantDashboard';
import { ProtectedRoute } from '../../components/ProtectionWrappers';

export default function MerchantRoute() {
  return (
    <ProtectedRoute allowedRoles={['merchant']}>
      <MerchantDashboard />
    </ProtectedRoute>
  );
}
