"use client";

import React from 'react';
import Signup from '../../components/Signup';
import { AuthenticatedRedirect } from '../../components/ProtectionWrappers';

export default function SignupRoute() {
  return (
    <AuthenticatedRedirect>
      <Signup />
    </AuthenticatedRedirect>
  );
}
