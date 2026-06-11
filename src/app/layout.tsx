import React from 'react';
import '../index.css';
import { AuthProvider } from '../hooks/useAuth';

export const metadata = {
  title: "ReliefVoucher - Disaster Relief Management",
  description: "A comprehensive system for managing disaster relief vouchers with Admin, Volunteer, and Merchant roles, featuring QR code redemption and victim registration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
