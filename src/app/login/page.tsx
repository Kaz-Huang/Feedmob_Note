'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { MineworkMark } from '@/components/brand/MineworkMark';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) setError(code === 'AccessDenied' ? '请使用已授权的企业 Google 账号登录。' : '登录未完成，请重试。');
  }, []);
  const login = async () => {
    setIsLoading(true); setError(null);
    try {
      const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl') || '/';
      await signIn('google', { callbackUrl });
    } catch { setError('暂时无法连接登录服务，请重试。'); }
    finally { setIsLoading(false); }
  };
  return <main className="flex min-h-dvh items-center justify-center bg-[var(--muted)] px-6 py-12">
    <section className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--background)] p-8">
      <MineworkMark className="mb-6 h-11 w-11" />
      <h1 className="text-2xl font-semibold tracking-tight">欢迎回到 Minework</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">记录工作进展，回顾团队动态。<br />使用企业 Google 账号进入工作区。</p>
      <button type="button" onClick={login} disabled={isLoading} className="mt-7 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium hover:bg-[var(--muted)]">
        {isLoading ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}<span>{isLoading ? '正在跳转…' : '使用 Google 登录'}</span>
      </button>
      {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-600">{error}</p>}
      <p className="mt-6 text-xs leading-5 text-[var(--muted-foreground)]">仅允许已验证的 @feedmob.com 企业账号访问。</p>
    </section>
  </main>;
}
