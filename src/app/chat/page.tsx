"use client";

import React from 'react';
import VictimChatbot from '../../components/VictimChatbot';
import { ProtectedRoute } from '../../components/ProtectionWrappers';

export default function ChatRoute() {
  return (
    <ProtectedRoute allowedRoles={['victim']}>
      <VictimChatbot />
    </ProtectedRoute>
  );
}
