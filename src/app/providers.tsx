'use client';

import { SessionProvider } from 'next-auth/react';
import { AppUpdateNotice } from '@/components/layout/AppUpdateNotice';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}<AppUpdateNotice /></SessionProvider>;
}
