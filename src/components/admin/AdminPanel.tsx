'use client';

import { useEffect, useState } from 'react';
import { Users, Shield, Building2, FileText, Plus, Pencil, X } from 'lucide-react';
import { useCurrentUser } from '@/lib/user-context';
import type { User, Team } from '@/types';

type Member = User & { _count: { logs: number } };
type ManagedTeam = Team & { _count: { members: number } };
type Workspace = { users: Member[]; teams: ManagedTeam[]; logs: number };
type MemberValues = { name: string; email: string; title: string; role: User['role']; teamId: string | null };
const roleLabels = { ADMIN: '管理员', MANAGER: '负责人', MEMBER: '成员' };
const fieldClass = 'h-10 w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 text-sm';

async function save(path: string, method: string, body: unknown) {
  const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '保存失败，请重试。');
  return data;
}

function MemberForm({ user, teams, self, busy, onSave, onCancel }: {
  user?: Member; teams: ManagedTeam[]; self: boolean; busy: boolean;
  onSave: (values: MemberValues) => Promise<void>; onCancel: () => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState(user?.title || '');
  const [role, setRole] = useState<User['role']>(user?.role || 'MEMBER');
  const [teamId, setTeamId] = useState(user?.teamId || '');
  return <form onSubmit={event => { event.preventDefault(); void onSave({ name, email, title, role, teamId: teamId || null }); }} className="my-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
    <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-medium">{user ? '编辑成员' : '新增成员'}</h3><button type="button" onClick={onCancel} disabled={busy} className="icon-button" aria-label="关闭成员编辑"><X size={16} /></button></div>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1.5 text-xs">显示名<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className={fieldClass} /></label>
      <label className="space-y-1.5 text-xs">登录邮箱<input required type="email" disabled={!!user} value={email} onChange={event => setEmail(event.target.value)} className={`${fieldClass} disabled:opacity-60`} /></label>
      <label className="space-y-1.5 text-xs">职位<input maxLength={100} value={title} onChange={event => setTitle(event.target.value)} className={fieldClass} /></label>
      <label className="space-y-1.5 text-xs">角色<select value={role} disabled={self} onChange={event => setRole(event.target.value as User['role'])} className={fieldClass}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value} disabled={value === 'ADMIN' && !!user?.email.endsWith('@workspace.local')}>{label}</option>)}</select></label>
      <label className="space-y-1.5 text-xs">所属团队<select value={teamId} onChange={event => setTeamId(event.target.value)} className={fieldClass}><option value="">未分配</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    </fieldset>
    <p className="mt-3 text-xs text-[var(--muted-foreground)]">{user ? '邮箱绑定登录身份，不能在此更改。' : '对方使用此公司邮箱登录后，会使用这里设置的成员资料。'}{self && ' 不能移除自己的管理员权限。'}</p>
    <div className="mt-4 flex gap-2"><button type="submit" disabled={busy} className="primary-button">{busy ? '正在保存…' : '保存成员'}</button><button type="button" onClick={onCancel} disabled={busy} className="rounded px-3 text-xs hover:bg-[var(--background)]">取消</button></div>
  </form>;
}

function TeamForm({ team, busy, onSave, onCancel }: { team?: ManagedTeam; busy: boolean; onSave: (values: { name: string; color: string }) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(team?.name || '');
  const [color, setColor] = useState(team?.color || '#00b2aa');
  return <form onSubmit={event => { event.preventDefault(); void onSave({ name, color }); }} className="my-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
    <h3 className="mb-4 text-sm font-medium">{team ? '编辑团队' : '新增团队'}</h3>
    <fieldset disabled={busy} className="flex flex-wrap items-end gap-4">
      <label className="min-w-48 flex-1 space-y-1.5 text-xs">团队名称<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className={fieldClass} /></label>
      <label className="space-y-1.5 text-xs">颜色<input type="color" value={color} onChange={event => setColor(event.target.value)} className="block h-10 w-14 cursor-pointer rounded border border-[var(--border)] bg-[var(--background)] p-1" /></label>
      <button type="submit" className="primary-button min-h-10">{busy ? '正在保存…' : '保存团队'}</button><button type="button" onClick={onCancel} className="min-h-10 rounded px-3 text-xs hover:bg-[var(--background)]">取消</button>
    </fieldset>
  </form>;
}

export function AdminPanel() {
  const { currentUser, refreshUsers } = useCurrentUser();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [memberEditor, setMemberEditor] = useState<Member | 'new' | null>(null);
  const [teamEditor, setTeamEditor] = useState<ManagedTeam | 'new' | null>(null);
  const load = async () => {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '管理信息加载失败。');
    setData(result);
  };
  useEffect(() => { let mounted = true; void load().catch(cause => { if (mounted) setError(cause.message); }).finally(() => { if (mounted) setLoading(false); }); return () => { mounted = false; }; }, []);
  const submit = async (task: () => Promise<unknown>, message: string, close: () => void) => {
    if (busy) return;
    setBusy(true); setError(null); setSuccess(null);
    try { await task(); await load(); await refreshUsers(); close(); setSuccess(message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请重试。'); }
    finally { setBusy(false); }
  };
  const retry = () => { setError(null); setLoading(true); void load().catch(cause => setError(cause.message)).finally(() => setLoading(false)); };
  const members = data?.users.filter(user => `${user.name} ${user.email} ${user.team?.name || ''}`.toLowerCase().includes(query.toLowerCase())) || [];
  return <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
    <header><h1 className="flex items-center gap-2 text-2xl font-semibold"><Shield size={24} />管理面板</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">管理成员角色和团队。每位成员仍以自己的账号记录工作日志。</p></header>
    {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p>{error}</p>{!data && <button type="button" onClick={retry} className="mt-2 underline">重试加载</button>}</div>}
    {success && <p role="status" className="rounded border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">{success}</p>}
    {loading && !data ? <p role="status" className="text-sm text-[var(--muted-foreground)]">正在加载管理信息…</p> : data && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        [Users, '成员', data.users.length], [Shield, '管理员', data.users.filter(user => user.role === 'ADMIN').length], [Building2, '团队', data.teams.length], [FileText, '已提交日志', data.logs],
      ].map(([Icon, label, count]) => { const MetricIcon = Icon as typeof Users; return <div key={String(label)} className="rounded-lg border border-[var(--border)] p-4"><p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><MetricIcon size={15} />{String(label)}</p><p className="mt-2 text-2xl font-semibold">{String(count)}</p></div>; })}</div>
      <section aria-labelledby="admin-members"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="admin-members" className="text-lg font-semibold">成员管理</h2><button type="button" disabled={busy} onClick={() => { setError(null); setMemberEditor('new'); }} className="primary-button"><Plus size={14} />新增成员</button></div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">管理员可以管理成员和团队；其他角色只能修改自己的日志与个人资料。</p>
        {memberEditor && <MemberForm key={typeof memberEditor === 'string' ? 'new' : memberEditor.id} user={typeof memberEditor === 'string' ? undefined : memberEditor} self={typeof memberEditor !== 'string' && memberEditor.id === currentUser?.id} teams={data.teams} busy={busy} onCancel={() => setMemberEditor(null)} onSave={values => submit(() => memberEditor === 'new' ? save('/api/users', 'POST', values) : save('/api/admin/users', 'PATCH', { ...values, email: undefined, id: memberEditor.id }), '成员资料已保存。', () => setMemberEditor(null))} />}
        <input type="search" aria-label="搜索成员" placeholder="搜索姓名、邮箱或团队" value={query} onChange={event => setQuery(event.target.value)} className={`${fieldClass} my-4 max-w-sm`} />
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[var(--muted)] text-xs text-[var(--muted-foreground)]"><tr>{['成员', '角色', '团队', '日志数', '操作'].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{members.map(user => <tr key={user.id} className="border-t border-[var(--border)]"><td className="px-4 py-3"><p className="font-medium">{user.name}{user.id === currentUser?.id && <span className="ml-2 text-xs text-[var(--muted-foreground)]">你</span>}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{user.email}{user.email.endsWith('@workspace.local') && ' · 历史本地账号'}</p></td><td className="px-4 py-3">{roleLabels[user.role]}</td><td className="px-4 py-3">{user.team?.name || '未分配'}</td><td className="px-4 py-3">{user._count.logs}</td><td className="px-4 py-3"><button type="button" aria-label={`编辑成员 ${user.name}`} disabled={busy} onClick={() => { setError(null); setMemberEditor(user); }} className="flex min-h-9 items-center gap-1 rounded px-2 text-xs hover:bg-[var(--muted)]"><Pencil size={13} />编辑</button></td></tr>)}</tbody></table>{members.length === 0 && <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">没有匹配的成员。</p>}</div>
      </section>
      <section aria-labelledby="admin-teams"><div className="flex items-center justify-between gap-3"><h2 id="admin-teams" className="text-lg font-semibold">团队管理</h2><button type="button" disabled={busy} onClick={() => { setError(null); setTeamEditor('new'); }} className="primary-button"><Plus size={14} />新增团队</button></div>
        {teamEditor && <TeamForm key={typeof teamEditor === 'string' ? 'new' : teamEditor.id} team={typeof teamEditor === 'string' ? undefined : teamEditor} busy={busy} onCancel={() => setTeamEditor(null)} onSave={values => submit(() => save('/api/admin/teams', teamEditor === 'new' ? 'POST' : 'PATCH', { ...values, ...(typeof teamEditor === 'string' ? {} : { id: teamEditor.id }) }), '团队信息已保存。', () => setTeamEditor(null))} />}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.teams.map(team => <div key={team.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-4"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: team.color || '#00b2aa' }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{team.name}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{team._count.members} 位成员</p></div><button type="button" disabled={busy} onClick={() => { setError(null); setTeamEditor(team); }} className="icon-button" aria-label={`编辑团队 ${team.name}`}><Pencil size={14} /></button></div>)}</div>
        {data.teams.length === 0 && <p className="mt-4 text-sm text-[var(--muted-foreground)]">尚无团队，点击“新增团队”开始。</p>}
      </section>
    </>}
  </div>;
}
