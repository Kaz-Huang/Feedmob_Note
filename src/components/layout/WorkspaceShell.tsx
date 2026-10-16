'use client';

import { usePathname } from 'next/navigation';
import { UserProvider } from '@/lib/user-context';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;
  return <UserProvider>
    <a href="#main-content" className="sr-only z-[60] rounded bg-[var(--foreground)] p-3 text-[var(--background)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3">跳转到内容</a>
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col bg-[var(--background)]">{children}</main>
      </div>
    </div>
  </UserProvider>;
}
