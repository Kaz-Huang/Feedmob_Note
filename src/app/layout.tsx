import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { WorkspaceShell } from '@/components/layout/WorkspaceShell';

export const metadata: Metadata = {
  title: 'Minework · 工作日志',
  description: '记录工作进展，回顾团队动态。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Providers><WorkspaceShell>{children}</WorkspaceShell></Providers>
      </body>
    </html>

  );
}
