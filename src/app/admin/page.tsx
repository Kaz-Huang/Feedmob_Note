import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/server-user';
import { AdminPanel } from '@/components/admin/AdminPanel';

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login?callbackUrl=/admin');
  if (user.role !== 'ADMIN') return <section className="p-8"><h1 className="text-xl font-semibold">无权访问管理面板</h1><p className="my-3 text-sm text-[var(--muted-foreground)]">此页面仅向管理员开放。</p><Link href="/" className="primary-button">返回工作日志</Link></section>;
  return <AdminPanel />;
}
