"use client";

import React from 'react';
import Login from '../../components/Login';
import { AuthenticatedRedirect } from '../../components/ProtectionWrappers';

export default function LoginRoute() {
  return (
    <AuthenticatedRedirect>
      <Login />
    </AuthenticatedRedirect>
  );
}
