'use client';
import { useEffect, useState } from 'react';
import { Copy, KeyRound, Trash2 } from 'lucide-react';

type Token = { id: string; name: string; prefix: string; scopes: string; createdAt: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null };
const labels: Record<string, string> = { 'logs:read': '读取本人日志和项目标签', 'logs:write': '追加本人日志（立即提交）', 'team:read': '读取团队动态', 'tags:write': '设置本人日志标签' };
export function McpSettings() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('我的 AI 助手');
  const [scopes, setScopes] = useState(['logs:read']);
  const [days, setDays] = useState(30);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [endpoint, setEndpoint] = useState('');
  async function load() {
    const response = await fetch('/api/mcp/tokens', { cache: 'no-store' });
    if (!response.ok) throw new Error('密钥列表加载失败，请刷新重试。');
    setTokens(await response.json());
  }
  useEffect(() => {
    setEndpoint(`${window.location.origin}/mcp`);
    void load().catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice('已复制。'); }
    catch { setError('复制失败，请选中文字手动复制。'); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/mcp/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scopes, expiresInDays: days }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '生成失败。');
      setSecret(body.token);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : '生成失败。'); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/mcp/tokens', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error('撤销失败，请重试。');
      setSecret(''); await load(); setNotice('密钥已撤销，后续连接将被拒绝。');
    } catch (e) { setError(e instanceof Error ? e.message : '撤销失败。'); }
    finally { setBusy(false); }
  }
  const input = 'mt-2 w-full rounded border border-[var(--border)] bg-[var(--background)] p-2 text-sm';
  return <section className="mx-auto w-full max-w-4xl space-y-7 px-5 py-8 sm:px-10">
    <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><KeyRound size={24} />MCP 连接</h1><p className="mt-3 text-sm text-[var(--muted-foreground)]">让 AI 助手读取已提交日志、追加记录和查看团队动态。每个密钥绑定当前账号，写入时不能切换成其他成员。</p></div>
    {error && <p role="alert" className="rounded border border-red-300 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <section className="rounded-lg border border-[var(--border)] p-5"><h2 className="font-medium">1. 生成个人密钥</h2>
      <form onSubmit={create} className="mt-4 space-y-4">
        <label className="block text-sm">名称<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required className={input} /></label>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm">允许的操作</legend>{Object.entries(labels).map(([scope, label]) => <label key={scope} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scopes.includes(scope)} disabled={scope === 'logs:read' && scopes.some(s => s === 'logs:write' || s === 'tags:write')} onChange={e => setScopes(current => { const next = e.target.checked ? [...current, scope] : current.filter(s => s !== scope); return next.some(s => s === 'logs:write' || s === 'tags:write') ? [...new Set([...next, 'logs:read'])] : next; })} />{label}</label>)}</fieldset>
        <label className="block text-sm">有效期<select value={days} onChange={e => setDays(Number(e.target.value))} className={input}>{[7, 30, 90].map(day => <option key={day} value={day}>{day} 天</option>)}</select></label>
        <button type="submit" disabled={busy || !scopes.length || !!secret} className="primary-button disabled:opacity-50">{busy ? '处理中…' : '生成密钥'}</button>
      </form>
      {secret && <div className="mt-5 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-stone-900"><p className="font-medium">密钥只显示这一次，请保存到 AI 客户端的密钥设置。</p><p className="mt-1">关闭或离开此页后无法再次查看。不要发到聊天、Git 或截图中。</p><code className="my-3 block break-all select-all rounded bg-white p-3">{secret}</code><div className="flex gap-3"><button type="button" onClick={() => void copy(secret)} className="flex items-center gap-1"><Copy size={14} />复制密钥</button><button type="button" onClick={() => setSecret('')} className="underline">已保存，隐藏密钥</button></div></div>}
    </section>
    <section className="space-y-3 rounded-lg border border-[var(--border)] p-5"><h2 className="font-medium">2. 在 AI 客户端添加服务器</h2><p className="text-sm">传输方式：Streamable HTTP；认证：Bearer token。将上面的密钥粘贴到客户端的密钥栏。</p><div className="flex items-center justify-between gap-3 rounded bg-[var(--muted)] p-3"><code className="break-all text-sm">{endpoint}</code><button type="button" aria-label="复制 MCP 地址" onClick={() => void copy(endpoint)}><Copy size={16} /></button></div><p className="text-sm text-[var(--muted-foreground)]">请求头：Authorization: Bearer &lt;你的密钥&gt;。目前使用个人密钥，客户端需要支持自定义认证头；仅支持 OAuth 网页授权的客户端暂不适用。</p><details><summary className="cursor-pointer text-sm">查看 Codex 配置示例</summary><pre className="mt-3 overflow-auto rounded bg-[var(--muted)] p-3 text-xs">{`[mcp_servers.minework]\nurl = "${endpoint}"\nbearer_token_env_var = "MINEWORK_MCP_TOKEN"`}</pre><p className="mt-2 text-sm text-[var(--muted-foreground)]">在启动客户端的环境里设置 MINEWORK_MCP_TOKEN，不要把真实密钥直接写入共享配置。</p></details><p className="text-sm text-[var(--muted-foreground)]">AI 的追加会立即提交到服务器。网页未提交的本地草稿不会被 MCP 读取；切回网页编辑前请先提交或核对草稿，避免旧草稿覆盖新记录。</p></section>
    <section><h2 className="mb-3 font-medium">我的密钥</h2>{loading ? <p className="text-sm">加载中…</p> : tokens.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">还没有密钥。</p> : <ul className="space-y-3">{tokens.map(token => { const inactive = !!token.revokedAt || new Date(token.expiresAt) <= new Date(); return <li key={token.id} className="flex items-start justify-between gap-3 rounded border border-[var(--border)] p-4"><div className="min-w-0 space-y-1"><p className="break-all font-medium">{token.name} <span className="text-xs font-normal text-[var(--muted-foreground)]">{inactive ? '已失效' : '有效'}</span></p><p className="text-xs text-[var(--muted-foreground)]">{token.prefix}… · 到期 {new Date(token.expiresAt).toLocaleDateString()}</p><p className="text-xs text-[var(--muted-foreground)]">{token.scopes.split(' ').map(s => labels[s] || s).join(' / ')}</p><p className="text-xs text-[var(--muted-foreground)]">最近使用：{token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : '尚未使用'}</p></div>{!inactive && <button type="button" disabled={busy} onClick={() => void revoke(token.id)} className="flex shrink-0 items-center gap-1 rounded p-2 text-sm text-red-600 disabled:opacity-50"><Trash2 size={14} />撤销</button>}</li>; })}</ul>}</section>
  </section>;
}
