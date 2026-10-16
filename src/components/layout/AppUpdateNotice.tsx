'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { prepareAppRefresh } from '@/lib/app-update';

const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION;

export function AppUpdateNotice() {
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !currentVersion) return;
    let disposed = false;
    let request: AbortController | null = null;
    let lastCheck = 0;
    const check = async () => {
      if (disposed || document.visibilityState === 'hidden' || request || Date.now() - lastCheck < 5000) return;
      lastCheck = Date.now();
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('/api/version', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!disposed && typeof data.version === 'string' && data.version.length > 0) setAvailable(data.version !== currentVersion);
      } catch { /* Offline or a release in progress: retry without interrupting editing. */ }
      finally { window.clearTimeout(timeout); if (request === controller) request = null; }
    };
    void check();
    const interval = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      disposed = true;
      request?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!available) return null;
  const refresh = () => {
    const result = prepareAppRefresh();
    if (!result.allowed) { setError(result.reason || '请先保存当前修改，再刷新更新。'); return; }
    setError(null);
    setRefreshing(true);
    window.location.reload();
  };
  return <aside className="app-update-notice" role="status" aria-live="polite" aria-label="网站更新提示">
    <RefreshCw size={18} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <p className="font-medium">Minework 有新版本</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">点击刷新，使用最新功能</p>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
    <button type="button" className="primary-button shrink-0" onClick={refresh} disabled={refreshing}>{refreshing ? '正在刷新…' : '刷新更新'}</button>
  </aside>;
}
