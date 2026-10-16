import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server-user';

export async function GET() {
  const actor = await requireAdmin();
  if (actor instanceof NextResponse) return actor;
  const [users, teams, logs] = await Promise.all([
    prisma.user.findMany({ include: { team: true, _count: { select: { logs: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.team.findMany({ include: { _count: { select: { members: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.workLog.count(),
  ]);
  return NextResponse.json({ users, teams, logs }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  const actor = await requireAdmin();
  if (actor instanceof NextResponse) return actor;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || 'email' in body) return NextResponse.json({ error: '请选择有效成员，登录邮箱不能修改。' }, { status: 400 });
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100 || !['ADMIN', 'MANAGER', 'MEMBER'].includes(body.role)
    || (body.title != null && (typeof body.title !== 'string' || body.title.length > 100))) {
    return NextResponse.json({ error: '成员资料或角色无效。' }, { status: 400 });
  }
  if (actor.id === body.id && body.role !== 'ADMIN') return NextResponse.json({ error: '不能移除自己的管理员权限。' }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: body.id } });
  if (!target) return NextResponse.json({ error: '成员不存在。' }, { status: 404 });
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || 'feedmob.com').toLowerCase();
  if (body.role === 'ADMIN' && !target.email.toLowerCase().endsWith('@' + domain)) return NextResponse.json({ error: '历史本地账号不能设为管理员，请使用公司登录账号。' }, { status: 400 });
  if (body.teamId != null && (typeof body.teamId !== 'string' || !await prisma.team.findUnique({ where: { id: body.teamId } }))) {
    return NextResponse.json({ error: '团队不存在。' }, { status: 400 });
  }
  const result = await prisma.$transaction(async tx => {
    const administrator = await tx.user.findUnique({ where: { id: actor.id } });
    if (administrator?.role !== 'ADMIN') return NextResponse.json({ error: '管理员权限已变更，请刷新页面。' }, { status: 403 });
    const current = await tx.user.findUnique({ where: { id: target.id } });
    if (!current) return NextResponse.json({ error: '成员不存在。' }, { status: 404 });
    if (current.role === 'ADMIN' && body.role !== 'ADMIN' && current.email.toLowerCase().endsWith('@' + domain)) {
      const count = await tx.user.count({ where: { role: 'ADMIN', email: { endsWith: '@' + domain } } });
      if (count <= 1) return NextResponse.json({ error: '至少需要保留一位公司账号管理员。' }, { status: 409 });
    }
    return tx.user.update({
      where: { id: target.id },
      data: { name, title: body.title?.trim() || null, role: body.role, teamId: body.teamId || null },
      include: { team: true },
    });
  });
  return result instanceof NextResponse ? result : NextResponse.json(result);
}
