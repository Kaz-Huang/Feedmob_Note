import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/lib/user-context';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Feedmob WorkLog - 极简工作日志系统',
  description: 'Notion 蒸馏版团队极简工作日志与时序聚合大盘',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        <UserProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">
                {children}
              </main>
            </div>
          </div>
        </UserProvider>
      </body>
    </html>

  );
}
