import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin, forbiddenIdentity } from '@/lib/server-user';

export async function GET() {
  const actor = await requireUser();
  if (actor instanceof NextResponse) return actor;
  const users = await prisma.user.findMany({ include: { team: true }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (actor instanceof NextResponse) return actor;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || 'feedmob.com').toLowerCase();
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+$/.test(email) || !email.endsWith('@' + domain)
    || (body.role !== undefined && !['ADMIN', 'MANAGER', 'MEMBER'].includes(body.role))
    || (body.title != null && (typeof body.title !== 'string' || body.title.length > 100))) {
    return NextResponse.json({ error: '请填写有效的姓名、公司邮箱和角色。' }, { status: 400 });
  }
  if (body.teamId != null && (typeof body.teamId !== 'string' || !await prisma.team.findUnique({ where: { id: body.teamId } }))) {
    return NextResponse.json({ error: '团队不存在。' }, { status: 400 });
  }
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: '该邮箱已存在。' }, { status: 409 });
  const user = await prisma.user.create({ data: { name, email, title: body.title?.trim() || null, role: body.role || 'MEMBER', teamId: body.teamId || null }, include: { team: true } });
  return NextResponse.json(user, { status: 201 });
}

export async function PATCH(req: Request) {
  const actor = await requireUser();
  if (actor instanceof NextResponse) return actor;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请求格式无效。' }, { status: 400 });
  if ((body.id !== undefined && body.id !== actor.id) || ['email', 'role', 'teamId'].some(key => key in body)) return forbiddenIdentity();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100 || (body.title !== undefined && body.title !== null && (typeof body.title !== 'string' || body.title.length > 100))) {
    return NextResponse.json({ error: '请填写有效的显示名。' }, { status: 400 });
  }
  const user = await prisma.user.update({ where: { id: actor.id }, data: { name, ...(body.title !== undefined ? { title: body.title?.trim() || null } : {}) }, include: { team: true } });
  return NextResponse.json(user);
}
